import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import { Payment } from '@/types/payment'
import { User } from '@/types/models'
import { syncAllBunqStatuses } from '@/lib/payment-utils'

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
		const session = await db.collection('UserSessions').findOne({
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

		// Sync bunq statuses before fetching payments (don't wait for completion)
		syncAllBunqStatuses().catch(error => {
			console.warn('Background bunq status sync failed:', error)
		})

		// Fetch completed payments (where paid_at is not null) for this user only
		const completedPayments = await db.collection('Payments')
			.find({ 
				user_id: user._id!.toString(), // Only show payments from this user
				paid_at: { $ne: null }
			})
			.sort({ paid_at: -1 })
			.toArray()

		return NextResponse.json({
			success: true,
			data: completedPayments as unknown as Payment[],
			message: `Found ${completedPayments.length} completed payments`
		}, { status: 200 })

	} catch (error) {
		console.error('Error fetching user payments:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}
