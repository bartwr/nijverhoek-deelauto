import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { cookies } from 'next/headers'
import { User } from '@/types/models'
import { hasCompleteUserProfile } from '@/lib/auth-utils'

export async function GET(): Promise<NextResponse> {
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

		// Extend session by 3 months on each visit
		const newExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 3 months (90 days)
		
		// Update session expiration in database
		await db.collection('UserSessions').updateOne(
			{ _id: session._id },
			{ $set: { expiresAt: newExpiresAt } }
		)

		// Update cookie expiration
		cookieStore.set('user_session', sessionToken.value, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 90 * 24 * 60 * 60, // 3 months (90 days) in seconds
			path: '/'
		})

		const userRecord = await db.collection<User>('Users').findOne({
			email_address: session.email
		})

		return NextResponse.json({
			isLoggedIn: true,
			canViewDetailedStats: hasCompleteUserProfile(userRecord),
			user: {
				email: session.email,
				expiresAt: newExpiresAt.getTime()
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
