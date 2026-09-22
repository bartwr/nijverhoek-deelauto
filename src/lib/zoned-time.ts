export const EUROPE_AMSTERDAM = 'Europe/Amsterdam'

interface WallClock {
	year: number
	month: number
	day: number
	hour: number
	minute: number
	second: number
	millisecond: number
}

const NAIVE_DATE_TIME =
	/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?$/

/**
 * Returns whether an ISO-like timestamp already includes a timezone offset
 * or a trailing `Z`.
 */
export function hasExplicitTimeZone (value: string): boolean {
	const trimmed = value.trim()

	return /[zZ]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)
}

function parseWallClock (value: string): WallClock | undefined {
	const match = NAIVE_DATE_TIME.exec(value.trim())
	if (!match) return undefined

	const millisecondRaw = match[7] ?? '0'

	return {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
		hour: Number(match[4]),
		minute: Number(match[5]),
		second: Number(match[6] ?? '0'),
		millisecond: Number(millisecondRaw.slice(0, 3).padEnd(3, '0')),
	}
}

function getTimeZoneOffsetMs (instant: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		hour12: false,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(instant))

	const map: Record<string, number> = {}
	for (const part of parts) {
		if (part.type !== 'literal') {
			map[part.type] = Number(part.value)
		}
	}

	const asUtc = Date.UTC(
		map.year,
		map.month - 1,
		map.day,
		map.hour,
		map.minute,
		map.second
	)

	return asUtc - instant
}

/**
 * Converts a wall-clock date-time in `timeZone` to a UTC `Date`.
 */
function zonedWallClockToUtc (
	wall: WallClock,
	timeZone: string
): Date {
	const utcGuess = Date.UTC(
		wall.year,
		wall.month - 1,
		wall.day,
		wall.hour,
		wall.minute,
		wall.second,
		wall.millisecond
	)
	const firstPass = utcGuess - getTimeZoneOffsetMs(utcGuess, timeZone)

	return new Date(utcGuess - getTimeZoneOffsetMs(firstPass, timeZone))
}

/**
 * Parses an ISO-like timestamp. Values without a timezone offset are read as
 * wall-clock time in `timeZone`, not in the server's local zone.
 *
 * @example
 * parseDateTimeInTimeZone('2026-09-22T14:42:00.000', 'Europe/Amsterdam')
 * // 2026-09-22T12:42:00.000Z (CEST is UTC+2)
 */
export function parseDateTimeInTimeZone (
	value: string | undefined,
	timeZone: string
): Date | undefined {
	if (!value) return undefined

	const trimmed = value.trim()
	if (trimmed === '') return undefined

	if (hasExplicitTimeZone(trimmed)) {
		const parsed = new Date(trimmed)
		return Number.isNaN(parsed.getTime()) ? undefined : parsed
	}

	const wall = parseWallClock(trimmed)
	if (!wall) {
		const parsed = new Date(trimmed)
		return Number.isNaN(parsed.getTime()) ? undefined : parsed
	}

	return zonedWallClockToUtc(wall, timeZone)
}

/**
 * Formats an instant as compact iCalendar local date-time in `timeZone`,
 * e.g. `20260922T144200`.
 */
export function formatIcsDateTimeInTimeZone (
	date: Date,
	timeZone: string
): string {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		hourCycle: 'h23',
		hour12: false,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(date)

	const map: Record<string, string> = {}
	for (const part of parts) {
		if (part.type !== 'literal') map[part.type] = part.value
	}

	const hour = map.hour === '24' ? '00' : map.hour

	return (
		`${map.year}${map.month}${map.day}` +
		`T${hour}${map.minute}${map.second}`
	)
}

/**
 * Builds a UTC ISO string as if a timezone-less timestamp were UTC. Used to
 * keep calendar UIDs stable after switching naive TMF times to Amsterdam.
 */
export function naiveTimestampAsUtcIso (
	raw: string,
	parsed: Date
): string {
	if (hasExplicitTimeZone(raw)) return parsed.toISOString()

	const asUtc = new Date(`${raw.trim()}Z`)
	if (Number.isNaN(asUtc.getTime())) return parsed.toISOString()

	return asUtc.toISOString()
}
