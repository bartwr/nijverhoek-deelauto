import { NextRequest, NextResponse } from 'next/server'
import { setupBunqApiContext } from '@/lib/bunq-api'
import { hasValidAdminSession } from '@/lib/session-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Creates a bunq installation for this server and registers a device on it.
 *
 * bunq only accepts an API key as the device-server secret, so the admin
 * supplies one in the request body. It is used for this call only and is
 * never logged or stored: afterwards the app authenticates with the OAuth
 * access token on the installation created here.
 *
 * Returns the new installation token once, to be stored as
 * `BUNQ_INSTALLATION_RESPONSE_TOKEN`.
 */
export async function POST (request: NextRequest): Promise<NextResponse> {
	if (!await hasValidAdminSession()) {
		return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
	}

	let apiKey: string
	try {
		const body = await request.json() as { apiKey?: unknown }
		apiKey = typeof body.apiKey === 'string' ? body.apiKey : ''
	} catch {
		apiKey = ''
	}

	if (apiKey.trim() === '') {
		return NextResponse.json(
			{ success: false, error: 'Geef een API-sleutel uit de bunq-app op' },
			{ status: 400 }
		)
	}

	try {
		const result = await setupBunqApiContext(apiKey)

		console.log('bunq API context setup result:', {
			success: result.success,
			ipAddress: result.ipAddress,
			ipMode: result.ipMode
		})

		if (!result.success) {
			return NextResponse.json({
				success: false,
				ipAddress: result.ipAddress,
				message: result.message,
				error: 'Device registration failed'
			}, { status: 502 })
		}

		return NextResponse.json({
			success: true,
			ipAddress: result.ipAddress,
			ipMode: result.ipMode,
			message: result.message,
			installationToken: result.installationToken
		})
	} catch (error) {
		console.error('Error in bunq setup endpoint:', error)

		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			message: 'Failed to set up the bunq API context'
		}, { status: 500 })
	}
}
