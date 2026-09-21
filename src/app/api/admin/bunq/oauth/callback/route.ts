import { NextRequest, NextResponse } from 'next/server'
import { hasValidAdminSession } from '@/lib/session-auth'
import {
	BUNQ_OAUTH_STATE_COOKIE,
	BunqOAuthConfigError,
	exchangeBunqAuthorizationCode,
	getBunqOAuthConfig,
} from '@/lib/bunq-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function escapeHtml (value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function renderPage (title: string, body: string): string {
	return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>
	body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 3rem auto; padding: 0 1rem; color: #111; }
	h1 { font-size: 1.5rem; }
	code, pre { font-family: ui-monospace, monospace; }
	pre { background: #f3f4f6; padding: 1rem; border-radius: .5rem; overflow-x: auto; word-break: break-all; white-space: pre-wrap; }
	ol li { margin-bottom: .5rem; }
	.warn { background: #fef3c7; border: 1px solid #f59e0b; padding: .75rem 1rem; border-radius: .5rem; }
	.error { background: #fee2e2; border: 1px solid #ef4444; padding: .75rem 1rem; border-radius: .5rem; }
	a { color: #ea5c33; }
</style>
</head>
<body>
${body}
</body>
</html>`
}

function htmlResponse (html: string, status = 200): NextResponse {
	return new NextResponse(html, {
		status,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
		},
	})
}

function errorResponse (message: string, status = 400): NextResponse {
	const body = `
<h1>bunq-koppeling mislukt</h1>
<div class="error">${escapeHtml(message)}</div>
<p><a href="/admin">Terug naar het admin dashboard</a></p>`
	return htmlResponse(renderPage('bunq-koppeling mislukt', body), status)
}

/**
 * Handles the redirect back from bunq after the admin granted access.
 * Verifies the CSRF state, exchanges the authorization code for an access
 * token and shows that token exactly once so it can be stored as
 * `BUNQ_OAUTH_ACCESS_TOKEN`. The token is never logged or persisted here.
 */
export async function GET (request: NextRequest): Promise<NextResponse> {
	if (!await hasValidAdminSession()) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
	}

	const params = request.nextUrl.searchParams
	const code = params.get('code')
	const returnedState = params.get('state')
	const oauthError = params.get('error')
	const expectedState = request.cookies.get(BUNQ_OAUTH_STATE_COOKIE)?.value

	const clearStateCookie = (response: NextResponse): NextResponse => {
		response.cookies.set(BUNQ_OAUTH_STATE_COOKIE, '', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 0,
			path: '/api/admin/bunq/oauth',
		})
		return response
	}

	if (oauthError) {
		const description = params.get('error_description') ?? ''
		return clearStateCookie(
			errorResponse(`bunq gaf een fout terug: ${oauthError} ${description}`.trim())
		)
	}

	if (!code || !returnedState) {
		return clearStateCookie(errorResponse('Ontbrekende code of state in de callback.'))
	}

	if (!expectedState || expectedState !== returnedState) {
		return clearStateCookie(
			errorResponse('De state komt niet overeen. Start de koppeling opnieuw vanuit het admin dashboard.')
		)
	}

	let accessToken: string
	let isSandbox = false
	try {
		const config = getBunqOAuthConfig(request.nextUrl.origin)
		isSandbox = config.isSandbox
		accessToken = await exchangeBunqAuthorizationCode(config, code)
	} catch (error) {
		const message = error instanceof BunqOAuthConfigError || error instanceof Error
			? error.message
			: 'Onbekende fout bij het ophalen van het access token'

		console.error('bunq OAuth token exchange failed:', message)
		return clearStateCookie(errorResponse(message, 502))
	}

	const body = `
<h1>bunq-account gekoppeld</h1>
<p>bunq heeft een access token afgegeven dat alleen toegang heeft tot de rekening(en)
die je in de bunq-app hebt geselecteerd${isSandbox ? ' (sandbox)' : ''}. Dit token kan geen geld
naar derden overmaken.</p>
<div class="warn">Dit token wordt maar één keer getoond en wordt nergens opgeslagen.
Kopieer het nu. Een eerder afgegeven token is hiermee ongeldig geworden; zolang dat
oude token in de omgeving staat, mislukt de verbinding met &quot;Incorrect API key or IP address&quot;.</div>
<h2>BUNQ_OAUTH_ACCESS_TOKEN</h2>
<pre id="token">${escapeHtml(accessToken)}</pre>
<h2>Volgende stappen</h2>
<ol>
	<li>Zet dit token als <code>BUNQ_OAUTH_ACCESS_TOKEN</code> in de omgevingsvariabelen (Vercel).</li>
	<li>Zet <code>BUNQ_ACCOUNT_ID_FOR_REQUESTS</code> op het id van de deelauto-rekening
	(zichtbaar in het admin dashboard na de volgende deploy).</li>
	<li>Verwijder de oude <code>BUNQ_API_KEY</code> en deploy opnieuw.</li>
	<li>Registreer dit apparaat eenmalig bij bunq via het admin dashboard
	(&quot;Apparaat registreren bij bunq&quot;), als je dat nog niet gedaan hebt.</li>
</ol>
<p><a href="/admin">Terug naar het admin dashboard</a></p>`

	return clearStateCookie(htmlResponse(renderPage('bunq-account gekoppeld', body)))
}
