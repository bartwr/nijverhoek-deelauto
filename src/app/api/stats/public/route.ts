import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { computeOverview } from '@/lib/overview-stats'

/**
 * Public, unauthenticated stats endpoint.
 *
 * Returns the same usage overview as `/api/stats` but strips every financial
 * field (income, payments) and the per-user breakdown, so no sensitive data is
 * exposed to anonymous visitors.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		const { searchParams } = new URL(request.url)
		const yearParam = searchParams.get('year') || 'all'

		const { db } = await connectToDatabase()
		const overview = await computeOverview(db, yearParam)

		const { kpis, monthly } = overview

		const publicOverview = {
			success: overview.success,
			empty: overview.empty,
			message: overview.message,
			availableYears: overview.availableYears,
			selectedYear: overview.selectedYear,
			period: overview.period,
			window: overview.window,
			kpis: kpis
				? {
						totalReservations: kpis.totalReservations,
						totalKm: kpis.totalKm,
						totalEffectiveHours: kpis.totalEffectiveHours,
						totalReservedHours: kpis.totalReservedHours,
						avgReservationsPerDay: kpis.avgReservationsPerDay,
						avgKmPerReservation: kpis.avgKmPerReservation,
						avgEffectiveHoursPerReservation:
							kpis.avgEffectiveHoursPerReservation,
						avgAvailableHoursPerDay: kpis.avgAvailableHoursPerDay,
						avgOccupiedHoursPerDay: kpis.avgOccupiedHoursPerDay,
						occupancyPct: kpis.occupancyPct,
						activeUsers: kpis.activeUsers
					}
				: undefined,
			monthly: monthly
				? monthly.map((m) => ({
						month: m.month,
						label: m.label,
						reservations: m.reservations,
						km: m.km,
						effectiveHours: m.effectiveHours,
						reservedHours: m.reservedHours,
						avgAvailableHoursPerDay: m.avgAvailableHoursPerDay,
						occupancyPct: m.occupancyPct
					}))
				: undefined,
			byWeekday: overview.byWeekday,
			byHour: overview.byHour
		}

		return NextResponse.json(publicOverview)
	} catch (error) {
		console.error('Error building public stats:', error)
		return NextResponse.json(
			{ error: 'Fout bij het opbouwen van de statistieken' },
			{ status: 500 }
		)
	}
}
