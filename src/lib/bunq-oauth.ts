/**
 * Helpers for the one-time bunq OAuth authorization flow.
 *
 * The flow is run by an admin from the dashboard. The resulting access token
 * is scoped to the monetary account(s) selected in the bunq app and cannot
 * send money to third parties. It is stored as `BUNQ_OAUTH_ACCESS_TOKEN` and
 * used by `bunq-api.ts` in place of a full-access API key.
 */

export const BUNQ_OAUTH_STATE_COOKIE = 'bunq_oauth_state'
export const BUNQ_OAUTH_CALLBACK_PATH = '/api/admin/bunq/oauth/callback'

export interface BunqOAuthConfig {
	clientId: string
	clientSecret: string
	redirectUri: string
	authorizationUrl: string
	tokenUrl: string
	isSandbox: boolean
}

export class BunqOAuthConfigError extends Error {
	constructor (message: string) {
		super(message)
		this.name = 'BunqOAuthConfigError'
	}
}

function isSandboxEnvironment (): boolean {
	return (process.env.BUNQ_API_BASE_URL ?? '').includes('sandbox')
}

/**
 * The redirect URI that must be registered on the OAuth client in the bunq
 * app. Derived from `NEXT_PUBLIC_BASE_URL`, falling back to the request
 * origin when provided.
 */
export function getBunqOAuthRedirectUri (fallbackOrigin?: string): string {
	const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? '').trim() || fallbackOrigin || ''
	return `${baseUrl.replace(/\/+$/, '')}${BUNQ_OAUTH_CALLBACK_PATH}`
}

/**
 * Reports which OAuth-related environment variables are present, without
 * exposing their values.
 */
export function getBunqOAuthConfigStatus (): {
	hasClientId: boolean
	hasClientSecret: boolean
	hasAccessToken: boolean
	hasInstallationToken: boolean
	hasPrivateKey: boolean
	configuredAccountId: string | null
	isSandbox: boolean
} {
	return {
		hasClientId: (process.env.BUNQ_OAUTH_CLIENT_ID ?? '').trim() !== '',
		hasClientSecret: (process.env.BUNQ_OAUTH_CLIENT_SECRET ?? '').trim() !== '',
		hasAccessToken: (process.env.BUNQ_OAUTH_ACCESS_TOKEN ?? '').trim() !== '',
		hasInstallationToken: (process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN ?? '').trim() !== '',
		hasPrivateKey: (process.env.BUNQ_PRIVATE_KEY_FOR_SIGNING ?? '').trim() !== '',
		configuredAccountId: (process.env.BUNQ_ACCOUNT_ID_FOR_REQUESTS ?? '').trim() || null,
		isSandbox: isSandboxEnvironment(),
	}
}

/**
 * Loads the OAuth client configuration. Throws a `BunqOAuthConfigError` when
 * the client id or secret is missing.
 */
export function getBunqOAuthConfig (fallbackOrigin?: string): BunqOAuthConfig {
	const clientId = (process.env.BUNQ_OAUTH_CLIENT_ID ?? '').trim()
	const clientSecret = (process.env.BUNQ_OAUTH_CLIENT_SECRET ?? '').trim()

	if (clientId === '' || clientSecret === '') {
		throw new BunqOAuthConfigError(
			'BUNQ_OAUTH_CLIENT_ID en BUNQ_OAUTH_CLIENT_SECRET zijn niet ingesteld. ' +
			'Maak een OAuth-client aan in de bunq-app (Instellingen > Developers > OAuth).'
		)
	}

	const isSandbox = isSandboxEnvironment()

	return {
		clientId,
		clientSecret,
		redirectUri: getBunqOAuthRedirectUri(fallbackOrigin),
		authorizationUrl: isSandbox
			? 'https://oauth.sandbox.bunq.com/auth'
			: 'https://oauth.bunq.com/auth',
		tokenUrl: isSandbox
			? 'https://api-oauth.sandbox.bunq.com/v1/token'
			: 'https://api.oauth.bunq.com/v1/token',
		isSandbox,
	}
}

/**
 * Builds the URL the admin is redirected to in order to grant access.
 */
export function buildBunqAuthorizationUrl (config: BunqOAuthConfig, state: string): string {
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		state,
	})

	return `${config.authorizationUrl}?${params.toString()}`
}

interface BunqTokenResponse {
	access_token?: string
	token_type?: string
	state?: string
	error?: string
	error_description?: string
}

/**
 * Exchanges the one-time authorization code for a long-lived access token.
 * The token is returned to the caller and must never be logged.
 */
export async function exchangeBunqAuthorizationCode (
	config: BunqOAuthConfig,
	code: string
): Promise<string> {
	const params = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: config.redirectUri,
		client_id: config.clientId,
		client_secret: config.clientSecret,
	})

	const response = await fetch(`${config.tokenUrl}?${params.toString()}`, {
		method: 'POST',
		headers: {
			'User-Agent': 'nijverhoek-deelauto/1.0',
			'Cache-Control': 'no-cache',
		},
	})

	const text = await response.text()
	let data: BunqTokenResponse = {}
	try {
		data = JSON.parse(text) as BunqTokenResponse
	} catch {
		// Non-JSON body, handled below
	}

	if (!response.ok || !data.access_token) {
		const detail = data.error_description || data.error || text.slice(0, 300)
		throw new Error(`bunq token exchange failed (${response.status}): ${detail}`)
	}

	return data.access_token
}
