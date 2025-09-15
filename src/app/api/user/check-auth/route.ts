import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'

interface UserSession {
	_id: ObjectId
	email: string
	sessionToken: string
	expiresAt: Date
	createdAt: Date
}

export async function GET(
	request: NextRequest
): Promise<NextResponse> {
	try {
		const cookieStore = await cookies()
		const sessionToken = cookieStore.get('user_session')

		if (!sessionToken) {
			return NextResponse.json({
				isLoggedIn: false,
				user: null
			})
		}

		const { db } = await connectToDatabase()

		// Find and validate the session
		const session = await db.collection('UserSessions').findOne({
			sessionToken: sessionToken.value,
			expiresAt: { $gt: new Date() }
		})

		if (!session) {
			// Clear invalid session cookie
			cookieStore.delete('user_session')
			
			return NextResponse.json({
				isLoggedIn: false,
				user: null
			})
		}

		return NextResponse.json({
			isLoggedIn: true,
			user: {
				email: session.email,
				expiresAt: session.expiresAt.getTime()
			}
		})
	} catch (error) {
		console.error('Error checking auth status:', error)
		return NextResponse.json(
			{ error: 'Failed to check authentication status' },
			{ status: 500 }
		)
	}
}
