import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import { Payment } from '@/types/payment'
import { Reservation, User, PriceScheme } from '@/types/models'

interface ReservationWithDetails extends Reservation {
	user: User
	priceScheme?: PriceScheme
}

interface ReceiptData {
	payment: Payment
	reservations: ReservationWithDetails[]
	user: User
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
	try {
		const { id } = await params

		// Validate payment ID
		if (!id || !ObjectId.isValid(id)) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid payment ID'
				},
				{ status: 400 }
			)
		}

		// Check authentication
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

		// Fetch the payment by ID
		const payment = await db.collection('Payments').findOne({ _id: new ObjectId(id) })

		if (!payment) {
			return NextResponse.json(
				{
					success: false,
					error: 'Payment not found'
				},
				{ status: 404 }
			)
		}

		// Check if the payment belongs to the authenticated user
		if (payment.user_id !== user._id?.toString()) {
			return NextResponse.json(
				{
					success: false,
					error: 'Unauthorized access to payment'
				},
				{ status: 403 }
			)
		}

		// Check if payment is completed
		if (!payment.paid_at && payment.bunq_status !== 'ACCEPTED' && payment.bunq_status !== 'PAID') {
			return NextResponse.json(
				{
					success: false,
					error: 'Payment is not completed'
				},
				{ status: 400 }
			)
		}

		// Get reservation details if payment has reservations
		let reservations: ReservationWithDetails[] = []
		
		if (payment.reservations_paid && payment.reservations_paid.length > 0) {
			const reservationIds = payment.reservations_paid.map((id: string) => new ObjectId(id))
			
			// Fetch reservations with user and price scheme details
			const reservationData = await db.collection('Reservations')
				.aggregate([
					{
						$match: {
							_id: { $in: reservationIds }
						}
					},
					{
						$lookup: {
							from: 'Users',
							localField: 'user_id',
							foreignField: '_id',
							as: 'user'
						}
					},
					{
						$lookup: {
							from: 'PriceSchemes',
							localField: 'price_scheme_id',
							foreignField: '_id',
							as: 'priceScheme'
						}
					},
					{
						$unwind: '$user'
					},
					{
						$unwind: {
							path: '$priceScheme',
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$sort: {
							effective_start: 1
						}
					}
				])
				.toArray()

			reservations = reservationData as ReservationWithDetails[]
		}

		const receiptData: ReceiptData = {
			payment: payment as unknown as Payment,
			reservations,
			user
		}

		return NextResponse.json(
			{
				success: true,
				data: receiptData,
				message: 'Receipt data retrieved successfully'
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error retrieving receipt data:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}
