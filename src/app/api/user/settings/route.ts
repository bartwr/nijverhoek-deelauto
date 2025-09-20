import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import { User } from '@/types/models'

interface UserSession {
	_id: ObjectId
	email: string
	sessionToken: string
	expiresAt: Date
	createdAt: Date
}

interface UpdateSettingsRequest {
	use_bunq_user_request?: boolean
}

/**
 * GET /api/user/settings
 * Fetch user settings
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		// Check authentication first
		const cookieStore = await cookies()
		const sessionToken = cookieStore.get('user_session')

		if (!sessionToken) {
			return NextResponse.json(
				{ error: 'Authentication required' },
				{ status: 401 }
			)
		}

		const { db } = await connectToDatabase()

		// Validate session
		const session = await db.collection<UserSession>('UserSessions').findOne({
			sessionToken: sessionToken.value,
			expiresAt: { $gt: new Date() }
		})

		if (!session) {
			return NextResponse.json(
				{ error: 'Session expired' },
				{ status: 401 }
			)
		}

		// Find user by email
		const user = await db.collection<User>('Users').findOne({
			email_address: session.email
		})

		if (!user) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			)
		}

		// Return user settings
		const settings = {
			use_bunq_user_request: user.use_bunq_user_request || false
		}

		return NextResponse.json({
			success: true,
			settings,
			message: 'Settings retrieved successfully'
		}, { status: 200 })

	} catch (error) {
		console.error('Error fetching user settings:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}

/**
 * PATCH /api/user/settings
 * Update user settings
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
	try {
		// Check authentication first
		const cookieStore = await cookies()
		const sessionToken = cookieStore.get('user_session')

		if (!sessionToken) {
			return NextResponse.json(
				{ error: 'Authentication required' },
				{ status: 401 }
			)
		}

		const { db } = await connectToDatabase()

		// Validate session
		const session = await db.collection<UserSession>('UserSessions').findOne({
			sessionToken: sessionToken.value,
			expiresAt: { $gt: new Date() }
		})

		if (!session) {
			return NextResponse.json(
				{ error: 'Session expired' },
				{ status: 401 }
			)
		}

		// Parse request body
		const body: UpdateSettingsRequest = await request.json()

		// Validate the request
		if (typeof body.use_bunq_user_request !== 'boolean') {
			return NextResponse.json(
				{ error: 'use_bunq_user_request must be a boolean' },
				{ status: 400 }
			)
		}

		// Update user settings
		const updateResult = await db.collection<User>('Users').updateOne(
			{ email_address: session.email },
			{ 
				$set: { 
					use_bunq_user_request: body.use_bunq_user_request 
				} 
			}
		)

		if (updateResult.matchedCount === 0) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			)
		}

		if (updateResult.modifiedCount === 0) {
			return NextResponse.json(
				{ 
					success: true,
					message: 'No changes made (value was already set)'
				},
				{ status: 200 }
			)
		}

		return NextResponse.json({
			success: true,
			message: 'Settings updated successfully'
		}, { status: 200 })

	} catch (error) {
		console.error('Error updating user settings:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}
