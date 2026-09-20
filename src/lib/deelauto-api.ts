import { createHash } from 'crypto'

const DEFAULT_API_BASE_URL = 'https://carsharing.themobilityfactory.coop'
const DEFAULT_ADMIN_GROUP = 'coop'
const DEFAULT_DAYS_PAST = 30
const DEFAULT_DAYS_FUTURE = 90

/**
 * A single reservation on the shared car, normalised from the TMF Admin API.
 */
export interface DeelautoReservation {
	uid: string
	vehicleServiceUnitId: string
	start: Date
	end: Date
	effectiveStart?: Date
	effectiveEnd?: Date
}

/**
 * Resolved configuration for talking to the TMF Admin REST API.
 */
export interface DeelautoApiConfig {
	baseUrl: string
	adminGroup: string
	apiKey: string
	vehicleServiceUnitIds: string[]
	daysPast: number
	daysFuture: number
}

/**
 * Window of time for which reservations are requested.
 */
export interface ReservationWindow {
	from: Date
	until: Date
}

/**
 * Thrown when required TMF environment variables are missing or malformed.
 */
export class DeelautoConfigError extends Error {
	constructor (message: string) {
		super(message)
		this.name = 'DeelautoConfigError'
	}
}

/**
 * Thrown when the TMF Admin API responds with an error or unusable payload.
 */
export class DeelautoApiError extends Error {
	readonly status?: number

	constructor (message: string, status?: number) {
		super(message)
		this.name = 'DeelautoApiError'
		this.status = status
	}
}

/**
 * The shape of a single item in the TMF `ReservationPublicInfo` list.
 */
interface TmfReservationPublicInfo {
	startTime?: string
	endTime?: string
	effectiveStartTime?: string
	effectiveEndTime?: string
}

interface TmfReservationsResponse {
	results?: TmfReservationPublicInfo[]
}

function readTrimmedEnv (name: string): string {
	return (process.env[name] ?? '').trim()
}

function readPositiveIntEnv (name: string, fallback: number): number {
	const raw = readTrimmedEnv(name)
	if (raw === '') return fallback

	const parsed = Number.parseInt(raw, 10)
	if (Number.isNaN(parsed) || parsed < 0) {
		throw new DeelautoConfigError(
			`${name} must be a positive whole number of days`
		)
	}

	return parsed
}

/**
 * Reads and validates the TMF Admin API configuration from the environment.
 *
 * @throws {DeelautoConfigError} When a required variable is missing.
 */
export function getDeelautoApiConfig (): DeelautoApiConfig {
	const apiKey = readTrimmedEnv('TMF_API_KEY')
	const vehicleServiceUnitIds = readTrimmedEnv('TMF_VEHICLE_SERVICE_UNIT_ID')
		.split(',')
		.map(id => id.trim())
		.filter(id => id !== '')

	const missing: string[] = []
	if (apiKey === '') missing.push('TMF_API_KEY')
	if (vehicleServiceUnitIds.length === 0) missing.push('TMF_VEHICLE_SERVICE_UNIT_ID')

	if (missing.length > 0) {
		throw new DeelautoConfigError(
			`Missing environment variable(s): ${missing.join(', ')}`
		)
	}

	const baseUrl = readTrimmedEnv('TMF_API_BASE_URL') || DEFAULT_API_BASE_URL

	return {
		baseUrl: baseUrl.replace(/\/+$/, ''),
		adminGroup: readTrimmedEnv('TMF_ADMIN_GROUP') || DEFAULT_ADMIN_GROUP,
		apiKey,
		vehicleServiceUnitIds,
		daysPast: readPositiveIntEnv('TMF_FEED_DAYS_PAST', DEFAULT_DAYS_PAST),
		daysFuture: readPositiveIntEnv('TMF_FEED_DAYS_FUTURE', DEFAULT_DAYS_FUTURE),
	}
}

/**
 * Builds the reservation window relative to now, using the configured
 * look-back and look-ahead in days.
 */
export function getDefaultReservationWindow (
	config: DeelautoApiConfig,
	now: Date = new Date()
): ReservationWindow {
	const dayInMs = 24 * 60 * 60 * 1000

	return {
		from: new Date(now.getTime() - config.daysPast * dayInMs),
		until: new Date(now.getTime() + config.daysFuture * dayInMs),
	}
}

function parseDate (value: string | undefined): Date | undefined {
	if (!value) return undefined

	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

/**
 * The public reservation info carries no id, so we derive a stable one from
 * the vehicle and the reserved period. Calendar clients rely on this UID
 * staying identical across refreshes to update instead of duplicate events.
 */
function buildReservationUid (
	vehicleServiceUnitId: string,
	start: Date,
	end: Date
): string {
	const fingerprint = `${vehicleServiceUnitId}|${start.toISOString()}|${end.toISOString()}`
	const digest = createHash('sha1').update(fingerprint).digest('hex')

	return `${digest}@auto.nijverhoek.nl`
}

async function fetchReservationsForVehicle (
	config: DeelautoApiConfig,
	vehicleServiceUnitId: string,
	reservationWindow: ReservationWindow
): Promise<DeelautoReservation[]> {
	const endpoint = new URL(
		`${config.baseUrl}/api/admin/v1/${encodeURIComponent(config.adminGroup)}` +
		`/vehicleServiceUnits/${encodeURIComponent(vehicleServiceUnitId)}/reservations`
	)
	endpoint.searchParams.set('from', reservationWindow.from.toISOString())
	endpoint.searchParams.set('until', reservationWindow.until.toISOString())

	let response: Response
	try {
		response = await fetch(endpoint, {
			headers: {
				apikey: config.apiKey,
				Accept: 'application/json',
			},
			cache: 'no-store',
		})
	} catch (err) {
		throw new DeelautoApiError(
			`Could not reach the TMF API: ${err instanceof Error ? err.message : 'unknown error'}`
		)
	}

	if (!response.ok) {
		throw new DeelautoApiError(
			`TMF API returned ${response.status} for vehicle ${vehicleServiceUnitId}`,
			response.status
		)
	}

	let payload: TmfReservationsResponse
	try {
		payload = await response.json() as TmfReservationsResponse
	} catch {
		throw new DeelautoApiError('TMF API returned a response that is not valid JSON')
	}

	const results = Array.isArray(payload.results) ? payload.results : []

	return results.reduce<DeelautoReservation[]>((reservations, item) => {
		const start = parseDate(item.startTime)
		const end = parseDate(item.endTime)

		if (!start || !end || end <= start) return reservations

		reservations.push({
			uid: buildReservationUid(vehicleServiceUnitId, start, end),
			vehicleServiceUnitId,
			start,
			end,
			effectiveStart: parseDate(item.effectiveStartTime),
			effectiveEnd: parseDate(item.effectiveEndTime),
		})

		return reservations
	}, [])
}

/**
 * Fetches reservations for every configured vehicle service unit within the
 * given window, de-duplicated and sorted chronologically.
 */
export async function fetchDeelautoReservations (
	config: DeelautoApiConfig,
	reservationWindow: ReservationWindow
): Promise<DeelautoReservation[]> {
	const perVehicle = await Promise.all(
		config.vehicleServiceUnitIds.map(id =>
			fetchReservationsForVehicle(config, id, reservationWindow)
		)
	)

	const byUid = new Map<string, DeelautoReservation>()
	for (const reservation of perVehicle.flat()) {
		byUid.set(reservation.uid, reservation)
	}

	return [...byUid.values()].sort(
		(a, b) => a.start.getTime() - b.start.getTime()
	)
}
