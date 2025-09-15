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

		const { searchParams } = new URL(request.url)
		const yearMonth = searchParams.get('yearmonth')

		if (!yearMonth) {
			return NextResponse.json(
				{ error: 'Year-month parameter is required' },
				{ status: 400 }
			)
		}

		// Parse year-month (format: 2025-09)
		const [year, month] = yearMonth.split('-').map(Number)
		if (!year || !month || month < 1 || month > 12) {
			return NextResponse.json(
				{ error: 'Invalid year-month format. Use YYYY-MM' },
				{ status: 400 }
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

		// Create date range for the month
		const startDate = new Date(year, month - 1, 1) // month is 0-indexed
		const endDate = new Date(year, month, 1) // first day of next month

		// Fetch reservations for the specified month and user
		const reservations = await db.collection<Reservation>('Reservations')
			.find({
				user_id: user._id,
				reservation_start: {
					$gte: startDate,
					$lt: endDate
				}
			})
			.sort({ reservation_start: 1 })
			.toArray()

		// Get price schemes for all reservations
		const priceSchemeIds = [...new Set(reservations.map(r => r.price_scheme_id))]
		const priceSchemes = await db.collection<PriceScheme>('PriceSchemes')
			.find({ _id: { $in: priceSchemeIds } })
			.toArray()
		
		const priceSchemeMap = new Map(priceSchemes.map(ps => [ps._id!.toString(), ps]))

		// Combine reservations with user data and price scheme data
		const reservationsWithUsers = reservations.map(reservation => ({
			...reservation,
			user: user,
			priceScheme: priceSchemeMap.get(reservation.price_scheme_id.toString())
		}))

		return NextResponse.json({
			success: true,
			data: reservationsWithUsers,
			message: `Found ${reservationsWithUsers.length} reservations for ${yearMonth}`
		}, { status: 200 })

	} catch (error) {
		console.error('Error fetching reservations:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}
