import { NextRequest, NextResponse } from 'next/server'
import { bunqApi } from '@/lib/bunq-api'

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		console.log('🧪 Testing complete bunq authentication flow...')
		
		// Test the complete flow
		const context = await bunqApi.initializeContext()
		
		console.log('✅ Bunq authentication flow completed successfully!')
		console.log('Context:', {
			hasSessionToken: !!context.sessionToken,
			userId: context.userId,
			monetaryAccountId: context.monetaryAccountId,
			hasInstallationToken: !!context.installationToken
		})

		return NextResponse.json({
			success: true,
			message: 'Bunq authentication flow completed successfully',
			context: {
				userId: context.userId,
				monetaryAccountId: context.monetaryAccountId,
				sessionTokenLength: context.sessionToken.length,
				installationTokenLength: context.installationToken.length
			}
		})
		
	} catch (error) {
		console.error('❌ Bunq authentication flow failed:', error)
		
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			message: 'Bunq authentication flow failed'
		}, { status: 500 })
	}
}

export async function GET(request: NextRequest): Promise<NextResponse> {
	return NextResponse.json({
		message: 'Bunq authentication flow test endpoint',
		description: 'POST to this endpoint to test the complete bunq authentication flow',
		timestamp: new Date().toISOString()
	})
}
