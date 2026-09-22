import { formatIcsDateTimeInTimeZone } from '@/lib/zoned-time'

const MAX_LINE_OCTETS = 75
const LINE_BREAK = '\r\n'

/**
 * A single event to publish in an iCalendar feed.
 */
export interface CalendarEvent {
	uid: string
	start: Date
	end: Date
	summary: string
	description?: string
	location?: string
}

/**
 * Calendar-level metadata shown by subscribing calendar apps.
 */
export interface CalendarOptions {
	name: string
	description?: string
	timeZone?: string
	productId?: string
	refreshInterval?: string
	timestamp?: Date
}

const textEncoder = new TextEncoder()

/**
 * Escapes a value for use in an iCalendar TEXT property (RFC 5545 §3.3.11).
 */
function escapeText (value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Formats a date as an iCalendar UTC date-time, e.g. `20260824T183000Z`.
 */
function formatUtcDateTime (date: Date): string {
	const pad = (value: number): string => String(value).padStart(2, '0')

	return (
		`${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}` +
		`${pad(date.getUTCDate())}` +
		`T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}` +
		`${pad(date.getUTCSeconds())}Z`
	)
}

/**
 * Formats a DTSTART/DTEND value. Uses `TZID` when a calendar timezone is set
 * so clients in the Netherlands show Amsterdam wall-clock time.
 */
function formatEventDateTime (date: Date, timeZone?: string): string {
	if (timeZone) {
		return (
			`;TZID=${timeZone}:` +
			`${formatIcsDateTimeInTimeZone(date, timeZone)}`
		)
	}

	return `:${formatUtcDateTime(date)}`
}

/**
 * Standard European DST rules for `Europe/Amsterdam` (CET/CEST).
 */
function buildTimeZoneLines (timeZone: string): string[] {
	if (timeZone !== 'Europe/Amsterdam') return []

	return [
		'BEGIN:VTIMEZONE',
		`TZID:${timeZone}`,
		'BEGIN:DAYLIGHT',
		'TZOFFSETFROM:+0100',
		'TZOFFSETTO:+0200',
		'TZNAME:CEST',
		'DTSTART:19700329T020000',
		'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
		'END:DAYLIGHT',
		'BEGIN:STANDARD',
		'TZOFFSETFROM:+0200',
		'TZOFFSETTO:+0100',
		'TZNAME:CET',
		'DTSTART:19701025T030000',
		'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
		'END:STANDARD',
		'END:VTIMEZONE',
	]
}

/**
 * Folds a content line to at most 75 octets per line, continuing on the next
 * line with a leading space as required by RFC 5545 §3.1.
 */
function foldLine (line: string): string {
	if (textEncoder.encode(line).length <= MAX_LINE_OCTETS) return line

	const segments: string[] = []
	let current = ''
	let currentOctets = 0
	// Continuation lines lose one octet to their leading space.
	let limit = MAX_LINE_OCTETS

	for (const char of line) {
		const charOctets = textEncoder.encode(char).length

		if (currentOctets + charOctets > limit) {
			segments.push(current)
			current = ''
			currentOctets = 0
			limit = MAX_LINE_OCTETS - 1
		}

		current += char
		currentOctets += charOctets
	}

	if (current !== '') segments.push(current)

	return segments.join(`${LINE_BREAK} `)
}

function buildEventLines (
	event: CalendarEvent,
	timestamp: Date,
	timeZone?: string
): string[] {
	const lines = [
		'BEGIN:VEVENT',
		`UID:${escapeText(event.uid)}`,
		`DTSTAMP:${formatUtcDateTime(timestamp)}`,
		`DTSTART${formatEventDateTime(event.start, timeZone)}`,
		`DTEND${formatEventDateTime(event.end, timeZone)}`,
		`SUMMARY:${escapeText(event.summary)}`,
	]

	if (event.description) {
		lines.push(`DESCRIPTION:${escapeText(event.description)}`)
	}

	if (event.location) {
		lines.push(`LOCATION:${escapeText(event.location)}`)
	}

	lines.push('TRANSP:OPAQUE', 'END:VEVENT')

	return lines
}

/**
 * Renders a complete iCalendar (`text/calendar`) document.
 *
 * @example
 * const ics = generateIcsCalendar(
 *   [{ uid: 'a@example.com', start: new Date(), end: new Date(), summary: 'Rit' }],
 *   { name: 'Deelauto' }
 * )
 */
export function generateIcsCalendar (
	events: CalendarEvent[],
	options: CalendarOptions
): string {
	const timestamp = options.timestamp ?? new Date()
	const productId = options.productId ?? '-//Deelauto Nijverhoek//Reserveringen//NL'

	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		`PRODID:${escapeText(productId)}`,
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`NAME:${escapeText(options.name)}`,
		`X-WR-CALNAME:${escapeText(options.name)}`,
	]

	if (options.description) {
		lines.push(
			`DESCRIPTION:${escapeText(options.description)}`,
			`X-WR-CALDESC:${escapeText(options.description)}`
		)
	}

	if (options.timeZone) {
		lines.push(`X-WR-TIMEZONE:${escapeText(options.timeZone)}`)
		lines.push(...buildTimeZoneLines(options.timeZone))
	}

	if (options.refreshInterval) {
		lines.push(
			`REFRESH-INTERVAL;VALUE=DURATION:${options.refreshInterval}`,
			`X-PUBLISHED-TTL:${options.refreshInterval}`
		)
	}

	for (const event of events) {
		lines.push(...buildEventLines(event, timestamp, options.timeZone))
	}

	lines.push('END:VCALENDAR')

	return `${lines.map(foldLine).join(LINE_BREAK)}${LINE_BREAK}`
}
