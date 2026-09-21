import { NextRequest, NextResponse } from 'next/server'
import { hasValidAdminSession } from '@/lib/session-auth'
import {
	bunqApi,
	BunqDeviceServerSummary,
	BunqMonetaryAccountSummary,
} from '@/lib/bunq-api'
import { getBunqOAuthConfigStatus, getBunqOAuthRedirectUri } from '@/lib/bunq-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * What `GET /device-server` told us about the installation that
 * `BUNQ_INSTALLATION_RESPONSE_TOKEN` points to.
 */
interface BunqInstallationStatus {
	devices: BunqDeviceServerSummary[]
	error?: string
}

interface BunqStatusResponse {
	success: boolean
	config: ReturnType<typeof getBunqOAuthConfigStatus>
	redirectUri: string
	installation?: BunqInstallationStatus
	connection?: {
		userId: number
		pinnedAccount: BunqMonetaryAccountSummary
		grantedAccounts: BunqMonetaryAccountSummary[]
	}
	error?: string
	/** Most likely cause of `error`, derived from the installation state. */
	hint?: string
}

function maskIban (iban: string | null): string | null {
	if (!iban) return null
	if (iban.length <= 8) return iban
	return `${iban.slice(0, 4)}\u2026${iban.slice(-4)}`
}

function maskAccount (account: BunqMonetaryAccountSummary): BunqMonetaryAccountSummary {
	return { ...account, iban: maskIban(account.iban) }
}

/**
 * Looks at the installation the env points to, without starting a session.
 * Never throws; failures are reported in `error`.
 */
async function inspectInstallation (): Promise<BunqInstallationStatus> {
	try {
		return { devices: await bunqApi.listInstallationDevices() }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Onbekende fout'
		console.error('bunq device-server listing failed:', message)
		return { devices: [], error: message }
	}
}

/**
 * Explains a failed session start using what we know about the
 * installation. "Incorrect API key or IP address" is bunq's answer for
 * several distinct problems; the device list tells them apart.
 */
function explainSessionFailure (
	sessionError: string,
	installation: BunqInstallationStatus,
	config: ReturnType<typeof getBunqOAuthConfigStatus>
): string | undefined {
	if (!sessionError.includes('Incorrect API key or IP address')) {
		return undefined
	}

	const accessTokenSuffix = config.accessTokenSuffix ?? '????'
	const installationTokenSuffix = config.installationTokenSuffix ?? '????'

	if (installation.error) {
		return (
			`bunq accepteert de ingestelde installatietoken (eindigt op \u2026${installationTokenSuffix}) niet. ` +
			'Zet de token die "Registreer apparaat" teruggaf als BUNQ_INSTALLATION_RESPONSE_TOKEN en deploy opnieuw.'
		)
	}

	if (installation.devices.length === 0) {
		return (
			`De installatie waar BUNQ_INSTALLATION_RESPONSE_TOKEN (eindigt op \u2026${installationTokenSuffix}) ` +
			'naar verwijst heeft geen geregistreerd apparaat. Waarschijnlijk staat de oude token nog in de omgeving: ' +
			'zet de token die "Registreer apparaat" teruggaf als BUNQ_INSTALLATION_RESPONSE_TOKEN en deploy opnieuw.'
		)
	}

	const inactive = installation.devices.find(device => device.status !== 'ACTIVE')
	if (inactive) {
		return (
			`Het geregistreerde apparaat heeft status ${inactive.status}. ` +
			'Bevestig of ontgrendel het apparaat in de bunq-app (Instellingen > Beveiliging > API-sleutels) en test opnieuw.'
		)
	}

	return (
		'De installatie heeft een actief apparaat, dus bunq weigert het access token zelf ' +
		`(eindigt op \u2026${accessTokenSuffix}). Controleer: (1) BUNQ_OAUTH_ACCESS_TOKEN is de token van de ` +
		'laatste "Koppel bunq-account"; elke nieuwe koppeling maakt eerdere tokens ongeldig. ' +
		'(2) De API-sleutel waarmee het apparaat is geregistreerd en de OAuth-client zijn aangemaakt onder ' +
		'dezelfde bunq-gebruiker (persoonlijk vs. zakelijk). (3) Sandbox en productie zijn niet gemengd.'
	)
}

/**
 * Reports the state of the bunq OAuth integration so an admin can verify
 * which environment variables are set, which redirect URI to register on
 * the OAuth client, which device the configured installation carries, and
 * which monetary account the token is pinned to. Secret values are limited
 * to a four-character suffix.
 */
export async function GET (request: NextRequest): Promise<NextResponse<BunqStatusResponse>> {
	if (!await hasValidAdminSession()) {
		return NextResponse.json(
			{ success: false, config: getBunqOAuthConfigStatus(), redirectUri: '', error: 'Authentication required' },
			{ status: 401 }
		)
	}

	const config = getBunqOAuthConfigStatus()
	const redirectUri = getBunqOAuthRedirectUri(request.nextUrl.origin)

	if (!config.hasInstallationToken) {
		return NextResponse.json({
			success: false,
			config,
			redirectUri,
			error: 'BUNQ_INSTALLATION_RESPONSE_TOKEN is nog niet ingesteld. Registreer eerst het apparaat.',
		})
	}

	const installation = await inspectInstallation()

	if (!config.hasAccessToken) {
		return NextResponse.json({
			success: false,
			config,
			redirectUri,
			installation,
			error: 'BUNQ_OAUTH_ACCESS_TOKEN is nog niet ingesteld. Koppel eerst het bunq-account.',
		})
	}

	try {
		const context = await bunqApi.initializeContext()

		return NextResponse.json({
			success: true,
			config,
			redirectUri,
			installation,
			connection: {
				userId: context.userId,
				pinnedAccount: maskAccount(context.account),
				grantedAccounts: context.grantedAccounts.map(maskAccount),
			},
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Onbekende fout bij het verbinden met bunq'
		console.error('bunq status check failed:', message)

		return NextResponse.json({
			success: false,
			config,
			redirectUri,
			installation,
			error: message,
			hint: explainSessionFailure(message, installation, config),
		})
	}
}
