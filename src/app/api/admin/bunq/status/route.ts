import { NextRequest, NextResponse } from 'next/server'
import { hasValidAdminSession } from '@/lib/session-auth'
import { bunqApi, BunqMonetaryAccountSummary } from '@/lib/bunq-api'
import { getBunqOAuthConfigStatus, getBunqOAuthRedirectUri } from '@/lib/bunq-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface BunqStatusResponse {
	success: boolean
	config: ReturnType<typeof getBunqOAuthConfigStatus>
	redirectUri: string
	connection?: {
		userId: number
		pinnedAccount: BunqMonetaryAccountSummary
		grantedAccounts: BunqMonetaryAccountSummary[]
	}
	error?: string
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
 * Reports the state of the bunq OAuth integration so an admin can verify
 * which environment variables are set, which redirect URI to register on
 * the OAuth client, and which monetary account the token is pinned to.
 * Values of secrets are never returned.
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

	if (!config.hasAccessToken) {
		return NextResponse.json({
			success: false,
			config,
			redirectUri,
			error: 'BUNQ_OAUTH_ACCESS_TOKEN is nog niet ingesteld. Koppel eerst het bunq-account.',
		})
	}

	try {
		const context = await bunqApi.initializeContext()

		return NextResponse.json({
			success: true,
			config,
			redirectUri,
			connection: {
				userId: context.userId,
				pinnedAccount: maskAccount(context.account),
				grantedAccounts: context.grantedAccounts.map(maskAccount),
			},
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Onbekende fout bij het verbinden met bunq'
		console.error('bunq status check failed:', message)

		return NextResponse.json({ success: false, config, redirectUri, error: message })
	}
}
