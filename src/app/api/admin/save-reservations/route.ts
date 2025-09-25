import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import { ProcessedReservationData, User, Reservation, PriceScheme } from '@/types/models'
import { calculateTotalCosts } from '@/lib/reservation-utils'

export async function POST(
	request: NextRequest
): Promise<NextResponse> {
	try {
		// Check authentication first
		const cookieStore = await cookies()
		const sessionToken = cookieStore.get('admin_session')

		if (!sessionToken) {
			return NextResponse.json(
				{ error: 'Niet geautoriseerd' },
				{ status: 401 }
			)
		}

		const { db } = await connectToDatabase()

		// Validate session
		const session = await db.collection('AdminSessions').findOne({
			sessionToken: sessionToken.value,
			expiresAt: { $gt: new Date() }
		})

		if (!session) {
			return NextResponse.json(
				{ error: 'Sessie verlopen' },
				{ status: 401 }
			)
		}

		// Parse request body
		const { reservations }: { reservations: ProcessedReservationData[] } = await request.json()

		if (!reservations || !Array.isArray(reservations) || reservations.length === 0) {
			return NextResponse.json(
				{ error: 'Geen reserveringdata ontvangen' },
				{ status: 400 }
			)
		}

		// Get or create default price scheme
		let defaultPriceScheme = await db.collection<PriceScheme>('PriceSchemes').findOne({
			title: 'Standaard tarief per 2025-08-01'
		})

		if (!defaultPriceScheme) {
			const newPriceScheme: Omit<PriceScheme, '_id'> = {
				title: 'Standaard tarief',
				description: 'Standaard tarief voor deelauto gebruik',
				costs_per_kilometer: 0.25,
				costs_per_effective_hour: 5.00,
				costs_per_unused_reserved_hour_start_trip: 2.50,
				costs_per_unused_reserved_hour_end_trip: 2.50
			}

			const result = await db.collection<PriceScheme>('PriceSchemes').insertOne(newPriceScheme)
			defaultPriceScheme = { _id: result.insertedId, ...newPriceScheme }
		}

		const processedReservations: Omit<Reservation, '_id'>[] = []
		const processedUsers: Map<string, ObjectId> = new Map()

		// Process each reservation
		for (const reservationData of reservations) {
			// Convert string dates to Date objects
			const reservedStart = new Date(reservationData.reserved_start)
			const reservedEnd = new Date(reservationData.reserved_end)
			const effectiveStart = new Date(reservationData.effective_start)
			const effectiveEnd = new Date(reservationData.effective_end)

			// Find or create user
			let userId = processedUsers.get(reservationData.name_user)
			
			if (!userId) {
			const user = await db.collection<User>('Users').findOne({
				name: reservationData.name_user
			})

				if (!user) {
					// Create new user
					const newUser: Omit<User, '_id'> = {
						datetime_created: new Date(),
						email_address: '', // Will need to be filled in later
						name: reservationData.name_user
					}

					const userResult = await db.collection<User>('Users').insertOne(newUser)
					userId = userResult.insertedId
				} else {
					userId = user._id!
				}

				processedUsers.set(reservationData.name_user, userId)
			}

			// Calculate total costs using utility function
			const totalCosts = calculateTotalCosts(
				reservationData.kilometers_driven,
				reservedStart,
				reservedEnd,
				effectiveStart,
				effectiveEnd,
				defaultPriceScheme
			)

			// Create reservation
			const reservation: Omit<Reservation, '_id'> = {
				datetime_created: new Date(),
				user_id: userId,
				reservation_start: reservedStart,
				reservation_end: reservedEnd,
				effective_start: effectiveStart,
				effective_end: effectiveEnd,
				license_plate: reservationData.license_plate,
				kilometers_start: reservationData.kilometers_start,
				kilometers_end: reservationData.kilometers_end,
				kilometers_driven: reservationData.kilometers_driven,
				price_scheme_id: defaultPriceScheme._id!,
				total_costs: totalCosts,
				remarks: reservationData.remarks
			}

			processedReservations.push(reservation)
		}

		// Insert all reservations
		const result = await db.collection<Reservation>('Reservations').insertMany(processedReservations)

		// Convert user IDs to strings for JSON response
		const userIds = Array.from(processedUsers.values()).map(id => id.toString())

		return NextResponse.json({
			success: true,
			message: `${result.insertedCount} reserveringen succesvol opgeslagen`,
			insertedCount: result.insertedCount,
			usersCreated: processedUsers.size,
			userIds: userIds
		})

	} catch (error) {
		console.error('Error saving reservations:', error)
		return NextResponse.json(
			{ error: 'Fout bij opslaan van reserveringen' },
			{ status: 500 }
		)
	}
}
