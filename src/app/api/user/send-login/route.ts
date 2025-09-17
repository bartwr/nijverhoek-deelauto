import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import crypto from 'crypto'

interface SendLoginRequest {
	email: string
}

interface LoginToken {
	_id: unknown
	email: string
	token: string
	expiresAt: Date
	used: boolean
	createdAt: Date
}

export async function POST(
	request: NextRequest
): Promise<NextResponse> {
	try {
		const body: SendLoginRequest = await request.json()
		const { email } = body

		if (!email) {
			return NextResponse.json(
				{ error: 'Email is required' },
				{ status: 400 }
			)
		}

		// Generate a secure random token
		const token = crypto.randomBytes(32).toString('hex')
		
		// Token expires in 15 minutes
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

		// Connect to database
		const { db } = await connectToDatabase()

		// Store the login token in the database
		const loginToken: Omit<LoginToken, '_id'> = {
			email,
			token,
			expiresAt,
			used: false,
			createdAt: new Date()
		}

		await db.collection('UserLoginTokens').insertOne(loginToken)

		// Generate the login URL
		const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/mijn/login?token=${token}`
		
		// Import and use the email utility
		const { sendEmail, generateLoginEmail } = await import('@/lib/email-utils')
		const { html, text } = generateLoginEmail(loginUrl)
		
		// Send the login email
		const emailSent = await sendEmail({
			to: email,
			subject: 'Login - Deelauto Nijverhoek',
			html,
			text
		})
		
		if (!emailSent) {
			return NextResponse.json(
				{ error: 'Failed to send login email' },
				{ status: 500 }
			)
		}

		return NextResponse.json({
			success: true,
			message: 'Login email sent successfully'
		})
	} catch (error) {
		console.error('Error sending login email:', error)
		return NextResponse.json(
			{ error: 'Failed to send login email' },
			{ status: 500 }
		)
	}
}
