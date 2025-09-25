import { NextResponse } from 'next/server'
import { registerBunqServerIp } from '@/lib/bunq-api'

export async function POST(): Promise<NextResponse> {
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

export async function GET(): Promise<NextResponse> {
	// Allow GET requests to trigger IP registration as well for easier testing
	return POST()
}
