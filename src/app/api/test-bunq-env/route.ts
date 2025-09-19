import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		// Check environment variables
		const envCheck = {
			BUNQ_API_KEY: {
				exists: !!process.env.BUNQ_API_KEY,
				length: process.env.BUNQ_API_KEY?.length || 0,
				preview: process.env.BUNQ_API_KEY ? `${process.env.BUNQ_API_KEY.substring(0, 10)}...` : 'Not set'
			},
			BUNQ_API_BASE_URL: {
				value: process.env.BUNQ_API_BASE_URL || 'https://api.bunq.com',
				isSandbox: (process.env.BUNQ_API_BASE_URL || '').includes('sandbox')
			},
			BUNQ_INSTALLATION_RESPONSE_TOKEN: {
				exists: !!process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN,
				length: process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN?.length || 0,
				preview: process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN ? `${process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN.substring(0, 20)}...` : 'Not set'
			},
			NEXT_PUBLIC_BASE_URL: {
				value: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
			}
		}

		// Validate required fields
		const validation = {
			hasApiKey: !!process.env.BUNQ_API_KEY,
			hasInstallationToken: !!process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN,
			isSandbox: (process.env.BUNQ_API_BASE_URL || '').includes('sandbox')
		}

		const allValid = validation.hasApiKey && validation.hasInstallationToken

		return NextResponse.json({
			success: allValid,
			message: allValid ? 'All environment variables are properly configured' : 'Some environment variables are missing or incorrectly formatted',
			environment: envCheck,
			validation,
			recommendations: !allValid ? [
				!validation.hasApiKey ? 'Add BUNQ_API_KEY to your .env.local file' : null,
				!validation.hasInstallationToken ? 'Add BUNQ_INSTALLATION_RESPONSE_TOKEN to your .env.local file' : null,
				!validation.isSandbox ? 'Consider using sandbox URL: https://public-api.sandbox.bunq.com' : null
			].filter(Boolean) : []
		})
	} catch (error) {
		console.error('Environment check failed:', error)
		
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 })
	}
}
