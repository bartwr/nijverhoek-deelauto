import { NextResponse } from 'next/server'
import { registerBunqServerIp } from '@/lib/bunq-api'
import { hasValidAdminSession } from '@/lib/session-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Registers the server's public IP address with bunq (device-server) so the
 * OAuth access token may be used from this server. Admin only.
 *
 * If the current installation already carries a device (bound to the old
 * secret), a new installation is created and its token is returned once so
 * the admin can store it as `BUNQ_INSTALLATION_RESPONSE_TOKEN`.
 */
export async function POST (): Promise<NextResponse> {
	if (!await hasValidAdminSession()) {
		return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
	}

	try {
		console.log('IP registration request received')
		
		// Register the server's IP address with bunq
		const result = await registerBunqServerIp({ allowNewInstallation: true })
		
		console.log('IP registration result:', {
			success: result.success,
			ipAddress: result.ipAddress,
			ipMode: result.ipMode,
			createdNewInstallation: result.newInstallationToken !== undefined
		})

		if (result.success) {
			return NextResponse.json({
				success: true,
				ipAddress: result.ipAddress,
				ipMode: result.ipMode,
				message: result.message,
				newInstallationToken: result.newInstallationToken
			})
		} else {
			return NextResponse.json({
				success: false,
				ipAddress: result.ipAddress,
				message: result.message,
				error: 'IP registration failed'
			}, { status: 500 })
		}
	} catch (error) {
		console.error('Error in IP registration endpoint:', error)
		
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			message: 'Failed to register IP address with bunq API'
		}, { status: 500 })
	}
}
