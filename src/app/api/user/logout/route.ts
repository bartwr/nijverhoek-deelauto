import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { cookies } from 'next/headers'

export async function POST(): Promise<NextResponse> {
	try {
		const cookieStore = await cookies()
		const sessionToken = cookieStore.get('user_session')

		if (sessionToken) {
			const { db } = await connectToDatabase()

			// Remove the session from the database
			await db.collection('UserSessions').deleteOne({
				sessionToken: sessionToken.value
			})

			// Clear the session cookie
			cookieStore.delete('user_session')
		}

		return NextResponse.json({
			success: true,
			message: 'Logged out successfully'
		})
	} catch (error) {
		console.error('Error during logout:', error)
		return NextResponse.json(
			{ error: 'Failed to logout' },
			{ status: 500 }
		)
	}
}
