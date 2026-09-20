import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { hasValidAdminSession } from '@/lib/session-auth'
import {
	BUNQ_OAUTH_STATE_COOKIE,
	BunqOAuthConfigError,
	buildBunqAuthorizationUrl,
	getBunqOAuthConfig,
} from '@/lib/bunq-oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATE_COOKIE_MAX_AGE_SECONDS = 10 * 60

/**
 * Starts the one-time bunq OAuth authorization flow for an admin. Generates
 * a CSRF `state`, stores it in a short-lived httpOnly cookie and redirects
 * to the bunq authorization page.
 */
export async function GET (request: NextRequest): Promise<NextResponse> {
	if (!await hasValidAdminSession()) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
	}

	let authorizationUrl: string
	const state = randomBytes(24).toString('base64url')

	try {
		const config = getBunqOAuthConfig(request.nextUrl.origin)
		authorizationUrl = buildBunqAuthorizationUrl(config, state)
	} catch (error) {
		const message = error instanceof BunqOAuthConfigError
			? error.message
			: 'Kon de bunq OAuth-configuratie niet laden'

		return NextResponse.json({ success: false, error: message }, { status: 500 })
	}

	const response = NextResponse.redirect(authorizationUrl, { status: 302 })
	response.cookies.set(BUNQ_OAUTH_STATE_COOKIE, state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
		path: '/api/admin/bunq/oauth',
	})

	return response
}
