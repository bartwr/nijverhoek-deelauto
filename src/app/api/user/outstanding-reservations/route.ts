import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import { Reservation, User, PriceScheme } from '@/types/models'

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

		// Get all reservation IDs that are already paid
		const paidReservations = await db.collection('Payments')
			.find({ 
				paid_at: { $ne: null },
				reservations_paid: { $exists: true, $ne: [] }
			})
			.toArray()

		const paidReservationIds = new Set<string>()
		paidReservations.forEach(payment => {
			if (payment.reservations_paid) {
				payment.reservations_paid.forEach((id: string) => {
					paidReservationIds.add(id)
				})
			}
		})

		// Calculate date for start of current month
		// This will include all reservations from before the current month
		const now = new Date()
		const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		// Fetch outstanding reservations
		// - Belong to the user
		// - Have reservation_start from before the current month
		// - Are not in the paid reservations list
		const outstandingReservations = await db.collection<Reservation>('Reservations')
			.find({
				user_id: user._id,
				reservation_start: { $lt: currentMonthStart },
        $and: [
          { paid_at: { $eq: null } },
				  { bunq_status: { $nin: ['ACCEPTED', 'PAID'] } },
        ],
				_id: { $nin: Array.from(paidReservationIds).map(id => new ObjectId(id)) }
			})
			.sort({ reservation_start: 1 })
			.toArray()

		// Get price schemes for all reservations
		const priceSchemeIds = [...new Set(outstandingReservations.map(r => r.price_scheme_id))]
		const priceSchemes = await db.collection<PriceScheme>('PriceSchemes')
			.find({ _id: { $in: priceSchemeIds } })
			.toArray()
		
		const priceSchemeMap = new Map(priceSchemes.map(ps => [ps._id!.toString(), ps]))

		// Group reservations by year-month and business status
		const groupedReservations: { [key: string]: unknown[] } = {}
		
		outstandingReservations.forEach(reservation => {
			const yearMonth = `${reservation.reservation_start.getFullYear()}-${String(reservation.reservation_start.getMonth() + 1).padStart(2, '0')}`
			const isBusiness = reservation.is_business_transaction === true
			const groupKey = `${yearMonth}-${isBusiness ? 'business' : 'personal'}`
			
			if (!groupedReservations[groupKey]) {
				groupedReservations[groupKey] = []
			}
			
			groupedReservations[groupKey].push({
				...reservation,
				user: user,
				priceScheme: priceSchemeMap.get(reservation.price_scheme_id.toString())
			})
		})

		return NextResponse.json({
			success: true,
			data: groupedReservations,
			message: `Found ${outstandingReservations.length} outstanding reservations`
		}, { status: 200 })

	} catch (error) {
		console.error('Error fetching outstanding reservations:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}
