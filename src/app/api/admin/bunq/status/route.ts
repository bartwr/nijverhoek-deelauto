import { NextRequest, NextResponse } from 'next/server'
import { hasValidAdminSession } from '@/lib/session-auth'
import {
	bunqApi,
	BunqCredentialIpSummary,
	BunqDeviceServerSummary,
	BunqMonetaryAccountSummary,
	BunqWhitelistUpdateResult,
	getExternalIpAddress,
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
	/**
	 * Public IP this invocation made its outbound calls from. On Vercel this
	 * changes between invocations, which matters for IP-bound devices.
	 */
	egressIp?: string
	installation?: BunqInstallationStatus
	connection?: {
		userId: number
		pinnedAccount: BunqMonetaryAccountSummary
		grantedAccounts: BunqMonetaryAccountSummary[]
	}
	/**
	 * IP whitelists of the credentials visible to the session, or the reason
	 * bunq would not show them. Only available after a successful session.
	 */
	credentialWhitelists?: {
		credentials: BunqCredentialIpSummary[]
		error?: string
	}
	/** Proxy IPs added to the whitelist during this check, if any. */
	whitelistUpdate?: BunqWhitelistUpdateResult & { error?: string }
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
	config: ReturnType<typeof getBunqOAuthConfigStatus>,
	egressIp: string
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

	const boundIps = installation.devices.map(device => device.ip).filter(ip => ip !== '')

	if (config.proxyHost) {
		return (
			`bunq-verkeer loopt via proxy ${config.proxyHost}; deze aanroep kwam van ${egressIp}. Is het access ` +
			`token (eindigt op \u2026${accessTokenSuffix}) afgegeven vóórdat de proxy was ingesteld, dan is het ` +
			'nog gebonden aan een oud Vercel-IP: doe "Koppel bunq-account" opnieuw, zet het nieuwe token en ' +
			'deploy. De eerste sessie bindt het token dan aan het proxy-IP. Zet daarnaast alle vaste IP\u2019s ' +
			'van de proxy in BUNQ_PROXY_STATIC_IPS; bij een geslaagde test worden ontbrekende IP\u2019s aan de ' +
			'whitelist toegevoegd.'
		)
	}

	return (
		`Het apparaat is actief (geregistreerd vanaf ${boundIps.join(', ') || 'onbekend IP'}); deze aanroep ` +
		`kwam van ${egressIp}. Werkt de verbinding wel direct na een nieuwe "Koppel bunq-account" en daarna ` +
		'niet meer, dan is dit een IP-binding: bunq staat alleen aanroepen toe vanaf het IP waarvandaan een ' +
		'credential het eerst is gebruikt, en Vercel heeft geen vast uitgaand IP. Staat "Allow all IP ' +
		'addresses" voor de API-sleutel UIT, zet het aan. Staat het AAN, dan bindt bunq het access token ' +
		`(eindigt op \u2026${accessTokenSuffix}) zelf aan het IP van zijn eerste sessie; dat is alleen op te ` +
		'lossen door de bunq-aanroepen via een vast IP te laten lopen. Koppel opnieuw en open /admin één ' +
		'keer: de rij "IP-whitelist van de credential" laat dan zien welke IP\u2019s bunq toestaat. ' +
		'Werkt het ook direct na een nieuwe koppeling niet, controleer dan of API-sleutel en OAuth-client ' +
		'onder dezelfde bunq-gebruiker vallen en of sandbox en productie niet gemengd zijn.'
	)
}

/**
 * While the session works (so this call comes from a whitelisted IP), adds
 * the proxy's other static IPs to the credential whitelist. Never throws.
 */
async function whitelistProxyIps (
	proxyStaticIps: string[]
): Promise<BunqStatusResponse['whitelistUpdate']> {
	if (proxyStaticIps.length === 0) return undefined
	try {
		return await bunqApi.ensureCredentialIpsWhitelisted(proxyStaticIps)
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Onbekende fout'
		console.warn('bunq proxy IP whitelisting failed:', message)
		return { added: [], failed: [], error: message }
	}
}

/**
 * Reads the credential IP whitelists after a successful session. Never
 * throws; bunq may refuse this under an OAuth session, which is itself
 * useful to know.
 */
async function inspectCredentialWhitelists (): Promise<BunqStatusResponse['credentialWhitelists']> {
	try {
		return { credentials: await bunqApi.listCredentialIpWhitelists() }
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Onbekende fout'
		console.warn('bunq credential whitelist lookup failed:', message)
		return { credentials: [], error: message }
	}
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

	const [installation, egressIp] = await Promise.all([
		inspectInstallation(),
		getExternalIpAddress().catch(() => 'Unknown'),
	])

	if (!config.hasAccessToken) {
		return NextResponse.json({
			success: false,
			config,
			redirectUri,
			egressIp,
			installation,
			error: 'BUNQ_OAUTH_ACCESS_TOKEN is nog niet ingesteld. Koppel eerst het bunq-account.',
		})
	}

	try {
		const context = await bunqApi.initializeContext()
		const whitelistUpdate = await whitelistProxyIps(config.proxyStaticIps)
		const credentialWhitelists = await inspectCredentialWhitelists()

		return NextResponse.json({
			success: true,
			config,
			redirectUri,
			egressIp,
			installation,
			connection: {
				userId: context.userId,
				pinnedAccount: maskAccount(context.account),
				grantedAccounts: context.grantedAccounts.map(maskAccount),
			},
			credentialWhitelists,
			whitelistUpdate,
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Onbekende fout bij het verbinden met bunq'
		console.error('bunq status check failed:', message)

		return NextResponse.json({
			success: false,
			config,
			redirectUri,
			egressIp,
			installation,
			error: message,
			hint: explainSessionFailure(message, installation, config, egressIp),
		})
	}
}
