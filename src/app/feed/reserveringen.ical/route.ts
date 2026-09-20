import { NextRequest, NextResponse } from 'next/server'
import { DeelautoConfigError } from '@/lib/deelauto-api'
import { getReservationFeed, isValidFeedToken } from '@/lib/reservation-feed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Publishes all reservations on the shared car as an iCalendar feed.
 *
 * Subscribe with `webcal://auto.nijverhoek.nl/feed/reserveringen.ical?token=...`
 */
export async function GET (request: NextRequest): Promise<NextResponse> {
	const token = request.nextUrl.searchParams.get('token')

	if (!isValidFeedToken(token)) {
		return new NextResponse('Unauthorized', { status: 401 })
	}

	try {
		const feed = await getReservationFeed()

		return new NextResponse(feed.ics, {
			status: 200,
			headers: {
				'Content-Type': 'text/calendar; charset=utf-8',
				'Content-Disposition': 'inline; filename="reserveringen.ics"',
				'Cache-Control': 'private, max-age=300',
			},
		})
	} catch (error) {
		if (error instanceof DeelautoConfigError) {
			console.error('Deelauto feed is not configured:', error.message)
			return new NextResponse('Calendar feed is not configured', { status: 503 })
		}

		console.error('Error building the Deelauto reservation feed:', error)
		return new NextResponse('Could not build the calendar feed', { status: 502 })
	}
}
