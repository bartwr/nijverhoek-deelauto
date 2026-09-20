import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/mongodb'
import { DeelautoApiError, DeelautoConfigError } from '@/lib/deelauto-api'
import { getReservationFeed } from '@/lib/reservation-feed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function hasValidAdminSession (): Promise<boolean> {
	const cookieStore = await cookies()
	const sessionToken = cookieStore.get('admin_session')

	if (!sessionToken) return false

	const { db } = await connectToDatabase()
	const session = await db.collection('AdminSessions').findOne({
		sessionToken: sessionToken.value,
		expiresAt: { $gt: new Date() },
	})

	return session !== null
}

function buildFeedUrl (request: NextRequest): string | null {
	const token = (process.env.ICAL_FEED_TOKEN ?? '').trim()
	if (token === '') return null

	const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? '').trim() || request.nextUrl.origin

	return `${baseUrl.replace(/\/+$/, '')}/feed/reserveringen.ical?token=${encodeURIComponent(token)}`
}

/**
 * Reports on the state of the ICS reservation feed so an admin can copy the
 * subscription URL and verify the TMF Admin API credentials.
 */
export async function GET (request: NextRequest): Promise<NextResponse> {
	if (!await hasValidAdminSession()) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
	}

	const feedUrl = buildFeedUrl(request)
	const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1'

	try {
		const feed = await getReservationFeed(forceRefresh)

		return NextResponse.json({
			success: true,
			feedUrl,
			reservationCount: feed.reservationCount,
			generatedAt: feed.generatedAt.toISOString(),
			firstStart: feed.firstStart?.toISOString() ?? null,
			lastEnd: feed.lastEnd?.toISOString() ?? null,
			fromCache: feed.fromCache,
		})
	} catch (error) {
		const message = error instanceof DeelautoConfigError || error instanceof DeelautoApiError
			? error.message
			: 'Onbekende fout bij het ophalen van reserveringen'

		console.error('Error checking the Deelauto reservation feed:', error)

		return NextResponse.json({ success: false, feedUrl, error: message }, { status: 200 })
	}
}
