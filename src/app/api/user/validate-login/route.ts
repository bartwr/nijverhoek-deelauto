import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import crypto from 'crypto'

interface ValidateLoginRequest {
	token: string
}

interface LoginToken {
	_id: ObjectId
	email: string
	token: string
	expiresAt: Date
	used: boolean
	createdAt: Date
}

interface UserSession {
	_id: ObjectId
	email: string
	sessionToken: string
	expiresAt: Date
	createdAt: Date
}

export async function POST(
	request: NextRequest
): Promise<NextResponse> {
	try {
		const body: ValidateLoginRequest = await request.json()
		const { token } = body

		if (!token) {
			return NextResponse.json(
				{ error: 'Token is required' },
				{ status: 400 }
			)
		}

		const { db } = await connectToDatabase()

		// Find and validate the login token
		const loginToken = await db.collection('UserLoginTokens').findOne({
			token,
			used: false,
			expiresAt: { $gt: new Date() }
		})

		if (!loginToken) {
			return NextResponse.json(
				{ error: 'Invalid or expired login token' },
				{ status: 400 }
			)
		}

		// Mark the token as used
		await db.collection('UserLoginTokens').updateOne(
			{ _id: loginToken._id },
			{ $set: { used: true } }
		)

		// Generate a new session token
		const sessionToken = crypto.randomBytes(32).toString('hex')
		const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

		// Create a new user session
		const userSession: Omit<UserSession, '_id'> = {
			email: loginToken.email,
			sessionToken,
			expiresAt: sessionExpiresAt,
			createdAt: new Date()
		}

		await db.collection('UserSessions').insertOne(userSession)

		// Set the session cookie
		const cookieStore = await cookies()
		cookieStore.set('user_session', sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 24 * 60 * 60, // 24 hours in seconds
			path: '/'
		})

		return NextResponse.json({
			success: true,
			message: 'Login successful'
		})
	} catch (error) {
		console.error('Error validating login token:', error)
		return NextResponse.json(
			{ error: 'Failed to validate login token' },
			{ status: 500 }
		)
	}
}
