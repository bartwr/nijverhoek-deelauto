import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'

interface SendLoginRequest {
	email: string
}

interface LoginToken {
	_id: ObjectId
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

		// Connect to database with retry logic
		let db
		try {
			const connection = await connectToDatabase()
			db = connection.db
		} catch (dbError) {
			console.error('Database connection failed:', dbError)
			return NextResponse.json(
				{ 
					error: 'Database connection failed. Please try again.',
					details: process.env.NODE_ENV === 'development' ? (dbError instanceof Error ? dbError.message : String(dbError)) : undefined
				},
				{ status: 503 }
			)
		}

		// Store the login token in the database
		const loginToken: Omit<LoginToken, '_id'> = {
			email,
			token,
			expiresAt,
			used: false,
			createdAt: new Date()
		}

		try {
			await db.collection('LoginTokens').insertOne(loginToken)
		} catch (dbError) {
			console.error('Failed to store login token:', dbError)
			return NextResponse.json(
				{ 
					error: 'Failed to store login token. Please try again.',
					details: process.env.NODE_ENV === 'development' ? (dbError instanceof Error ? dbError.message : String(dbError)) : undefined
				},
				{ status: 500 }
			)
		}

		// Generate the login URL
		const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/login?token=${token}`
		
		// Import and use the email utility
		const { sendEmail, generateLoginEmail } = await import('@/lib/email-utils')
		const { html, text } = generateLoginEmail(loginUrl)
		
		// Send the login email
		const emailSent = await sendEmail({
			to: email,
			subject: 'Admin Login - Deelauto Nijverhoek',
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
		
		// Provide more specific error messages based on error type
		if (error instanceof Error) {
			if (error.message.includes('MongoDB')) {
				return NextResponse.json(
					{ 
						error: 'Database connection failed. Please try again.',
						details: process.env.NODE_ENV === 'development' ? error.message : undefined
					},
					{ status: 503 }
				)
			}
		}
		
		return NextResponse.json(
			{ 
				error: 'Failed to send login email',
				details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
			},
			{ status: 500 }
		)
	}
}
