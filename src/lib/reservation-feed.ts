import { timingSafeEqual } from 'crypto'
import {
	DeelautoReservation,
	fetchDeelautoReservations,
	getDeelautoApiConfig,
	getDefaultReservationWindow,
} from '@/lib/deelauto-api'
import { CalendarEvent, generateIcsCalendar } from '@/lib/ical-generator'
import { EUROPE_AMSTERDAM } from '@/lib/zoned-time'

const TIME_ZONE = EUROPE_AMSTERDAM
const CALENDAR_NAME = 'Deelauto Nijverhoek'
const CALENDAR_DESCRIPTION = 'Reserveringen van de deelauto in de Nijverhoek'
const REFRESH_INTERVAL = 'PT15M'
const DEFAULT_CACHE_SECONDS = 600

/**
 * A rendered feed plus the metadata the admin dashboard reports on.
 */
export interface ReservationFeed {
	ics: string
	reservationCount: number
	generatedAt: Date
	firstStart?: Date
	lastEnd?: Date
	fromCache: boolean
}

interface CachedFeed extends Omit<ReservationFeed, 'fromCache'> {
	expiresAt: number
}

let cachedFeed: CachedFeed | null = null

const dateTimeFormatter = new Intl.DateTimeFormat('nl-NL', {
	timeZone: TIME_ZONE,
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('nl-NL', {
	timeZone: TIME_ZONE,
	hour: '2-digit',
	minute: '2-digit',
})

function readCacheSeconds (): number {
	const raw = (process.env.TMF_FEED_CACHE_SECONDS ?? '').trim()
	if (raw === '') return DEFAULT_CACHE_SECONDS

	const parsed = Number.parseInt(raw, 10)
	return Number.isNaN(parsed) || parsed < 0 ? DEFAULT_CACHE_SECONDS : parsed
}

function buildDescription (reservation: DeelautoReservation): string {
	const lines = [
		`Gereserveerd: ${dateTimeFormatter.format(reservation.start)} - ` +
		`${timeFormatter.format(reservation.end)}`,
	]

	if (reservation.effectiveStart && reservation.effectiveEnd) {
		lines.push(
			`Werkelijk gebruik: ${dateTimeFormatter.format(reservation.effectiveStart)} - ` +
			`${timeFormatter.format(reservation.effectiveEnd)}`
		)
	}

	return lines.join('\n')
}

function toCalendarEvent (reservation: DeelautoReservation): CalendarEvent {
	return {
		uid: reservation.uid,
		start: reservation.start,
		end: reservation.end,
		summary: 'Deelauto bezet',
		description: buildDescription(reservation),
	}
}

/**
 * Builds the ICS feed from the TMF Admin API, reusing a recent render when one
 * is available so that frequent calendar polling does not hammer the API.
 *
 * @param forceRefresh Skip the cache and always call the TMF API.
 */
export async function getReservationFeed (
	forceRefresh = false
): Promise<ReservationFeed> {
	if (!forceRefresh && cachedFeed && cachedFeed.expiresAt > Date.now()) {
		return { ...cachedFeed, fromCache: true }
	}

	const config = getDeelautoApiConfig()
	const reservationWindow = getDefaultReservationWindow(config)
	const reservations = await fetchDeelautoReservations(config, reservationWindow)

	const generatedAt = new Date()
	const ics = generateIcsCalendar(reservations.map(toCalendarEvent), {
		name: CALENDAR_NAME,
		description: CALENDAR_DESCRIPTION,
		timeZone: TIME_ZONE,
		refreshInterval: REFRESH_INTERVAL,
		timestamp: generatedAt,
	})

	cachedFeed = {
		ics,
		reservationCount: reservations.length,
		generatedAt,
		firstStart: reservations[0]?.start,
		lastEnd: reservations.reduce<Date | undefined>(
			(latest, reservation) =>
				!latest || reservation.end > latest ? reservation.end : latest,
			undefined
		),
		expiresAt: Date.now() + readCacheSeconds() * 1000,
	}

	return { ...cachedFeed, fromCache: false }
}

/**
 * Compares a request token against `ICAL_FEED_TOKEN` without leaking timing
 * information about how much of the token matched.
 */
export function isValidFeedToken (token: string | null): boolean {
	const expected = (process.env.ICAL_FEED_TOKEN ?? '').trim()
	if (expected === '' || !token) return false

	const expectedBuffer = Buffer.from(expected, 'utf8')
	const providedBuffer = Buffer.from(token, 'utf8')

	if (expectedBuffer.length !== providedBuffer.length) return false

	return timingSafeEqual(expectedBuffer, providedBuffer)
}
