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
			BUNQ_CLIENT_PUBLIC_KEY: {
				exists: !!process.env.BUNQ_CLIENT_PUBLIC_KEY,
				length: process.env.BUNQ_CLIENT_PUBLIC_KEY?.length || 0,
				preview: process.env.BUNQ_CLIENT_PUBLIC_KEY ? `${process.env.BUNQ_CLIENT_PUBLIC_KEY.substring(0, 20)}...` : 'Not set',
				startsWithMII: process.env.BUNQ_CLIENT_PUBLIC_KEY?.startsWith('MII') || false
			},
			NEXT_PUBLIC_BASE_URL: {
				value: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
			}
		}

		// Validate required fields
		const validation = {
			hasApiKey: !!process.env.BUNQ_API_KEY,
			hasPublicKey: !!process.env.BUNQ_CLIENT_PUBLIC_KEY,
			publicKeyFormat: process.env.BUNQ_CLIENT_PUBLIC_KEY?.startsWith('MII') || false,
			isSandbox: (process.env.BUNQ_API_BASE_URL || '').includes('sandbox')
		}

		const allValid = validation.hasApiKey && validation.hasPublicKey && validation.publicKeyFormat

		return NextResponse.json({
			success: allValid,
			message: allValid ? 'All environment variables are properly configured' : 'Some environment variables are missing or incorrectly formatted',
			environment: envCheck,
			validation,
			recommendations: !allValid ? [
				!validation.hasApiKey ? 'Add BUNQ_API_KEY to your .env.local file' : null,
				!validation.hasPublicKey ? 'Add BUNQ_CLIENT_PUBLIC_KEY to your .env.local file' : null,
				!validation.publicKeyFormat ? 'BUNQ_CLIENT_PUBLIC_KEY should start with "MII" (RSA public key format)' : null,
				!validation.isSandbox ? 'Consider using sandbox URL: https://sandbox.public.api.bunq.com' : null
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
