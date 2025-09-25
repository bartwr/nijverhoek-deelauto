import { NextRequest, NextResponse } from 'next/server'
import { bunqApi } from '@/lib/bunq-api'

export async function GET(): Promise<NextResponse> {
	try {
		// Check environment variables
		const envCheck = {
			BUNQ_API_KEY: !!process.env.BUNQ_API_KEY,
			BUNQ_API_BASE_URL: process.env.BUNQ_API_BASE_URL || 'https://api.bunq.com',
			BUNQ_INSTALLATION_RESPONSE_TOKEN: !!process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN,
			BUNQ_PRIVATE_KEY_FOR_SIGNING: !!process.env.BUNQ_PRIVATE_KEY_FOR_SIGNING,
			BUNQ_ACCOUNT_ID_FOR_REQUESTS: process.env.BUNQ_ACCOUNT_ID_FOR_REQUESTS || 'not set (will use first available account)',
			NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
		}

		console.log('Environment check:', envCheck)

		// Try to initialize bunq context
		const context = await bunqApi.initializeContext()

		return NextResponse.json({
			success: true,
			message: 'Bunq API connection successful',
			environment: envCheck,
			context: {
				userId: context.userId,
				monetaryAccountId: context.monetaryAccountId,
				hasSessionToken: !!context.sessionToken
			}
		})
	} catch (error) {
		console.error('Bunq API test failed:', error)
		
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			environment: {
				BUNQ_API_KEY: !!process.env.BUNQ_API_KEY,
				BUNQ_API_BASE_URL: process.env.BUNQ_API_BASE_URL || 'https://api.bunq.com',
				BUNQ_INSTALLATION_RESPONSE_TOKEN: !!process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN,
				BUNQ_PRIVATE_KEY_FOR_SIGNING: !!process.env.BUNQ_PRIVATE_KEY_FOR_SIGNING,
				BUNQ_ACCOUNT_ID_FOR_REQUESTS: process.env.BUNQ_ACCOUNT_ID_FOR_REQUESTS || 'not set (will use first available account)',
				NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
			}
		}, { status: 500 })
	}
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		const body = await request.json()
		const { amount, description, email } = body

		if (!amount || !description || !email) {
			return NextResponse.json({
				success: false,
				error: 'Missing required fields: amount, description, email'
			}, { status: 400 })
		}

		// Test creating a payment request
		const { createBunqPaymentRequest } = await import('@/lib/bunq-api')
		const result = await createBunqPaymentRequest(
			parseFloat(amount),
			description,
			email,
			`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/mijn/betalingen`
		)

		return NextResponse.json({
			success: true,
			message: 'Payment request created successfully',
			data: result
		})
	} catch (error) {
		console.error('Payment request test failed:', error)
		
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 })
	}
}
