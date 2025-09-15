import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import { Reservation, User } from '@/types/models'

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

		const { id } = await params

		// Validate reservation ID
		if (!id || !ObjectId.isValid(id)) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid reservation ID'
				},
				{ status: 400 }
			)
		}

		const { is_business_transaction } = await request.json()

		if (typeof is_business_transaction !== 'boolean') {
			return NextResponse.json(
				{
					success: false,
					error: 'is_business_transaction must be a boolean'
				},
				{ status: 400 }
			)
		}

		// Update the reservation, but only if it belongs to the authenticated user
		const result = await db.collection<Reservation>('Reservations').updateOne(
			{ 
				_id: new ObjectId(id),
				user_id: user._id
			},
			{ $set: { is_business_transaction } }
		)

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{
					success: false,
					error: 'Reservation not found or access denied'
				},
				{ status: 404 }
			)
		}

		return NextResponse.json(
			{
				success: true,
				message: 'Business transaction status updated successfully'
			},
			{ status: 200 }
		)

	} catch (error) {
		console.error('Error updating business transaction status:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}
