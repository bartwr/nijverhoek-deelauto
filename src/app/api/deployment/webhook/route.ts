import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		console.log('🎯 Deployment webhook received')
		
		const body = await request.json()
		console.log('Webhook payload:', JSON.stringify(body, null, 2))
		
		// Verify this is a successful deployment
		if (body.type === 'deployment.succeeded' || body.type === 'deployment-ready') {
			const deploymentUrl = body.payload?.url || body.deployment?.url
			
			if (deploymentUrl) {
				console.log(`🚀 Deployment successful, triggering IP registration for: https://${deploymentUrl}`)
				
				// Trigger IP registration with a delay to ensure deployment is accessible
				setTimeout(async () => {
					try {
						const registrationUrl = `https://${deploymentUrl}/api/bunq/register-ip`
						console.log(`📡 Making IP registration request to: ${registrationUrl}`)
						
						const response = await fetch(registrationUrl, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'User-Agent': 'nijverhoek-deelauto-webhook/1.0'
							}
						})
						
						const result = await response.json()
						
						if (response.ok && result.success) {
							console.log('✅ IP registration successful via webhook!')
							console.log(`🌐 Registered IP: ${result.ipAddress}`)
						} else {
							console.error('❌ IP registration failed via webhook!')
							console.error('Response:', result)
						}
					} catch (error) {
						console.error('💥 Error in delayed IP registration:', error)
					}
				}, 30000) // Wait 30 seconds before attempting registration
				
				return NextResponse.json({
					success: true,
					message: 'Deployment webhook processed, IP registration scheduled'
				})
			}
		}
		
		return NextResponse.json({
			success: true,
			message: 'Webhook received but no action needed'
		})
		
	} catch (error) {
		console.error('Error processing deployment webhook:', error)
		
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 })
	}
}

export async function GET(request: NextRequest): Promise<NextResponse> {
	return NextResponse.json({
		message: 'Deployment webhook endpoint is active',
		timestamp: new Date().toISOString()
	})
}
