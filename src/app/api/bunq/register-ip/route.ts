import { NextResponse } from 'next/server'
import { registerBunqServerIp } from '@/lib/bunq-api'
import { hasValidAdminSession } from '@/lib/session-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Registers the server's public IP address with bunq (device-server) so the
 * OAuth access token may be used from this server. Admin only.
 */
export async function POST (): Promise<NextResponse> {
	if (!await hasValidAdminSession()) {
		return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
	}

	try {
		console.log('IP registration request received')
		
		// Register the server's IP address with bunq
		const result = await registerBunqServerIp()
		
		console.log('IP registration result:', result)

		if (result.success) {
			return NextResponse.json({
				success: true,
				ipAddress: result.ipAddress,
				message: result.message
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
