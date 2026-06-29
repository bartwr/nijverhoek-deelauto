import { Db } from 'mongodb'
import { Reservation, User } from '@/types/models'
import { Payment } from '@/types/payment'

// The car is considered "available for booking" within this daily window,
// expressed in local (Europe/Amsterdam) wall-clock time.
const WINDOW_START_HOUR = 6 // 06:00
const WINDOW_END_HOUR = 24 // 24:00 (end of day, i.e. 23:59)
const WINDOW_HOURS = WINDOW_END_HOUR - WINDOW_START_HOUR // 18 hours

const MS_PER_HOUR = 3600000
const MS_PER_DAY = 24 * MS_PER_HOUR

const TIMEZONE = 'Europe/Amsterdam'

const MONTH_LABELS = [
	'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
	'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
]
const WEEKDAY_LABELS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

interface NLParts {
	year: number
	month: number
	day: number
	hour: number
	minute: number
	second: number
}

const nlFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: TIMEZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hour12: false
})

/**
 * Convert a UTC Date into its Europe/Amsterdam wall-clock components.
 */
function getNLParts(date: Date): NLParts {
	const map: Record<string, number> = {}
	for (const part of nlFormatter.formatToParts(date)) {
		if (part.type !== 'literal') {
			map[part.type] = Number(part.value)
		}
	}

	return {
		year: map.year,
		month: map.month,
		day: map.day,
		hour: map.hour === 24 ? 0 : map.hour,
		minute: map.minute,
		second: map.second
	}
}

/**
 * Build a synthetic "local epoch" in milliseconds from wall-clock parts.
 * Treating local wall-clock as if it were UTC keeps day iteration and window
 * overlap math consistent (consecutive local midnights are exactly 24h apart).
 */
function localMs(parts: NLParts): number {
	return Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second
	)
}

function dayKeyFromLocalMs(ms: number): string {
	const d = new Date(ms)
	const y = d.getUTCFullYear()
	const m = String(d.getUTCMonth() + 1).padStart(2, '0')
	const day = String(d.getUTCDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

function monthKeyFromLocalMs(ms: number): string {
	return dayKeyFromLocalMs(ms).slice(0, 7)
}

function clampHours(value: number): number {
	if (value < 0) return 0
	return value
}

function round(value: number): number {
	return Math.round(value)
}

function round1(value: number): number {
	return Math.round(value * 10) / 10
}

function round2(value: number): number {
	return Math.round(value * 100) / 100
}

interface MonthlyBucket {
	month: string
	label: string
	reservations: number
	km: number
	effectiveHours: number
	reservedHours: number
	incomeBusiness: number
	incomePrivate: number
	occupiedWindowHours: number
	daysInMonth: number
}

interface DailyBucket {
	date: string
	reservations: number
	km: number
	effectiveHours: number
	occupiedWindowHours: number
}

export interface OverviewResult {
	success: true
	empty: boolean
	availableYears: number[]
	selectedYear: string
	message?: string
	period?: { start: string; end: string; days: number }
	window?: { startHour: number; endHour: number; hours: number; timezone: string }
	kpis?: {
		totalReservations: number
		totalKm: number
		totalEffectiveHours: number
		totalReservedHours: number
		avgReservationsPerDay: number
		avgKmPerReservation: number
		avgEffectiveHoursPerReservation: number
		avgAvailableHoursPerDay: number
		avgOccupiedHoursPerDay: number
		occupancyPct: number
		incomeTotal: number
		incomeBusiness: number
		incomePrivate: number
		paidTotal: number
		outstandingTotal: number
		activeUsers: number
	}
	monthly?: Array<{
		month: string
		label: string
		reservations: number
		km: number
		effectiveHours: number
		reservedHours: number
		incomeBusiness: number
		incomePrivate: number
		incomeTotal: number
		avgAvailableHoursPerDay: number
		occupancyPct: number
	}>
	daily?: Array<{
		date: string
		reservations: number
		km: number
		effectiveHours: number
		availableHours: number
	}>
	byWeekday?: Array<{
		weekday: number
		label: string
		reservations: number
		effectiveHours: number
	}>
	byHour?: Array<{ hour: number; occupiedHours: number }>
	byUser?: Array<{
		name: string
		reservations: number
		km: number
		effectiveHours: number
		income: number
	}>
}

/**
 * Compute the full deelauto usage overview for a given scope.
 *
 * @param db - Connected MongoDB database
 * @param yearParam - 'all' for all-time, or a 4-digit year string to filter to
 * @returns Aggregated KPIs, time series and breakdowns
 */
export async function computeOverview(
	db: Db,
	yearParam: string
): Promise<OverviewResult> {
	const allReservations = await db
		.collection<Reservation>('Reservations')
		.find({})
		.toArray()

	const users = await db.collection<User>('Users').find({}).toArray()
	const userNameById = new Map<string, string>()
	for (const user of users) {
		userNameById.set(user._id!.toString(), user.name || 'Onbekend')
	}

	const allPayments = await db.collection<Payment>('Payments').find({}).toArray()

	const availableYears = Array.from(
		new Set(
			allReservations.map((r) => getNLParts(new Date(r.reservation_start)).year)
		)
	).sort((a, b) => b - a)

	const isYearFilter = yearParam !== 'all' && /^\d{4}$/.test(yearParam)
	const selectedYear = isYearFilter ? Number(yearParam) : null
	const selectedYearLabel = isYearFilter ? String(selectedYear) : 'all'

	const reservations = isYearFilter
		? allReservations.filter(
				(r) => getNLParts(new Date(r.reservation_start)).year === selectedYear
			)
		: allReservations

	const payments = isYearFilter
		? allPayments.filter(
				(p) =>
					p.datetime_created &&
					getNLParts(new Date(p.datetime_created)).year === selectedYear
			)
		: allPayments

	if (reservations.length === 0) {
		return {
			success: true,
			empty: true,
			message: 'Geen reserveringen gevonden voor deze periode',
			availableYears,
			selectedYear: selectedYearLabel
		}
	}

	const monthly = new Map<string, MonthlyBucket>()
	const daily = new Map<string, DailyBucket>()
	const byWeekday = WEEKDAY_LABELS.map((label, idx) => ({
		weekday: idx,
		label,
		reservations: 0,
		effectiveHours: 0
	}))
	const byHour = Array.from({ length: 24 }, (_, hour) => ({
		hour,
		occupiedHours: 0
	}))
	const byUser = new Map<string, {
		name: string
		reservations: number
		km: number
		effectiveHours: number
		income: number
	}>()

	let totalKm = 0
	let totalEffectiveHours = 0
	let totalReservedHours = 0
	let incomeBusiness = 0
	let incomePrivate = 0

	let minStartMs = Infinity
	let maxEndMs = -Infinity

	function ensureMonth(monthKey: string): MonthlyBucket {
		let bucket = monthly.get(monthKey)
		if (!bucket) {
			const monthIndex = Number(monthKey.slice(5, 7)) - 1
			const year = monthKey.slice(0, 4)
			bucket = {
				month: monthKey,
				label: `${MONTH_LABELS[monthIndex]} '${year.slice(2)}`,
				reservations: 0,
				km: 0,
				effectiveHours: 0,
				reservedHours: 0,
				incomeBusiness: 0,
				incomePrivate: 0,
				occupiedWindowHours: 0,
				daysInMonth: 0
			}
			monthly.set(monthKey, bucket)
		}
		return bucket
	}

	function ensureDay(dayKey: string): DailyBucket {
		let bucket = daily.get(dayKey)
		if (!bucket) {
			bucket = {
				date: dayKey,
				reservations: 0,
				km: 0,
				effectiveHours: 0,
				occupiedWindowHours: 0
			}
			daily.set(dayKey, bucket)
		}
		return bucket
	}

	for (const reservation of reservations) {
		const reservedStart = new Date(reservation.reservation_start)
		const reservedEnd = new Date(reservation.reservation_end)
		const effectiveStart = new Date(reservation.effective_start)
		const effectiveEnd = new Date(reservation.effective_end)

		const km = Number(reservation.kilometers_driven) || 0
		const cost = Number(reservation.total_costs) || 0
		const isBusiness = reservation.is_business_transaction === true

		const effectiveHours = clampHours(
			(effectiveEnd.getTime() - effectiveStart.getTime()) / MS_PER_HOUR
		)
		const reservedHours = clampHours(
			(reservedEnd.getTime() - reservedStart.getTime()) / MS_PER_HOUR
		)

		totalKm += km
		totalEffectiveHours += effectiveHours
		totalReservedHours += reservedHours
		if (isBusiness) {
			incomeBusiness += cost
		} else {
			incomePrivate += cost
		}

		const startParts = getNLParts(reservedStart)
		const startLocal = localMs(startParts)
		const startDayKey = dayKeyFromLocalMs(startLocal)
		const startMonthKey = monthKeyFromLocalMs(startLocal)

		minStartMs = Math.min(minStartMs, startLocal)
		const endLocalForRange = localMs(getNLParts(reservedEnd))
		maxEndMs = Math.max(maxEndMs, endLocalForRange)

		const monthBucket = ensureMonth(startMonthKey)
		monthBucket.reservations += 1
		monthBucket.km += km
		monthBucket.effectiveHours += effectiveHours
		monthBucket.reservedHours += reservedHours
		if (isBusiness) {
			monthBucket.incomeBusiness += cost
		} else {
			monthBucket.incomePrivate += cost
		}

		const dayBucket = ensureDay(startDayKey)
		dayBucket.reservations += 1
		dayBucket.km += km
		dayBucket.effectiveHours += effectiveHours

		const weekday = new Date(startLocal).getUTCDay()
		byWeekday[weekday].reservations += 1
		byWeekday[weekday].effectiveHours += effectiveHours

		const userId = reservation.user_id?.toString() || 'unknown'
		let userBucket = byUser.get(userId)
		if (!userBucket) {
			userBucket = {
				name: userNameById.get(userId) || 'Onbekend',
				reservations: 0,
				km: 0,
				effectiveHours: 0,
				income: 0
			}
			byUser.set(userId, userBucket)
		}
		userBucket.reservations += 1
		userBucket.km += km
		userBucket.effectiveHours += effectiveHours
		userBucket.income += cost

		// Occupancy: distribute the reserved window across local days.
		const resStartLocal = localMs(getNLParts(reservedStart))
		const resEndLocal = localMs(getNLParts(reservedEnd))

		let dayMidnight = Math.floor(resStartLocal / MS_PER_DAY) * MS_PER_DAY
		const lastMidnight = Math.floor(resEndLocal / MS_PER_DAY) * MS_PER_DAY

		while (dayMidnight <= lastMidnight) {
			const windowStart = dayMidnight + WINDOW_START_HOUR * MS_PER_HOUR
			const windowEnd = dayMidnight + WINDOW_END_HOUR * MS_PER_HOUR

			const overlapStart = Math.max(resStartLocal, windowStart)
			const overlapEnd = Math.min(resEndLocal, windowEnd)
			const overlapHours = clampHours((overlapEnd - overlapStart) / MS_PER_HOUR)

			if (overlapHours > 0) {
				const dKey = dayKeyFromLocalMs(dayMidnight)
				const mKey = dKey.slice(0, 7)
				ensureDay(dKey).occupiedWindowHours += overlapHours
				ensureMonth(mKey).occupiedWindowHours += overlapHours
			}

			dayMidnight += MS_PER_DAY
		}

		// Hour-of-day occupancy (effective usage), local time.
		const effStartLocal = localMs(getNLParts(effectiveStart))
		const effEndLocal = localMs(getNLParts(effectiveEnd))
		let hourCursor = Math.floor(effStartLocal / MS_PER_HOUR) * MS_PER_HOUR
		const effEndCursor = effEndLocal
		while (hourCursor < effEndCursor) {
			const slotStart = hourCursor
			const slotEnd = hourCursor + MS_PER_HOUR
			const overlap = clampHours(
				(Math.min(effEndCursor, slotEnd) - Math.max(effStartLocal, slotStart)) /
					MS_PER_HOUR
			)
			if (overlap > 0) {
				const hourOfDay = new Date(slotStart).getUTCHours()
				byHour[hourOfDay].occupiedHours += overlap
			}
			hourCursor += MS_PER_HOUR
		}
	}

	const periodStartMidnight = Math.floor(minStartMs / MS_PER_DAY) * MS_PER_DAY
	const periodEndMidnight = Math.floor(maxEndMs / MS_PER_DAY) * MS_PER_DAY
	const totalDays =
		Math.round((periodEndMidnight - periodStartMidnight) / MS_PER_DAY) + 1

	const monthDayCount = new Map<string, number>()
	let totalAvailableHours = 0
	for (
		let midnight = periodStartMidnight;
		midnight <= periodEndMidnight;
		midnight += MS_PER_DAY
	) {
		const dKey = dayKeyFromLocalMs(midnight)
		const mKey = dKey.slice(0, 7)
		monthDayCount.set(mKey, (monthDayCount.get(mKey) || 0) + 1)

		const occupied = daily.get(dKey)?.occupiedWindowHours || 0
		const available = clampHours(Math.min(WINDOW_HOURS, WINDOW_HOURS - occupied))
		totalAvailableHours += available
	}

	for (const [mKey, count] of monthDayCount) {
		ensureMonth(mKey).daysInMonth = count
	}

	const monthlyArr = Array.from(monthly.values())
		.sort((a, b) => a.month.localeCompare(b.month))
		.map((m) => {
			const availableHours = clampHours(
				WINDOW_HOURS * m.daysInMonth - m.occupiedWindowHours
			)
			const avgAvailablePerDay =
				m.daysInMonth > 0 ? availableHours / m.daysInMonth : 0
			const occupancyPct =
				m.daysInMonth > 0
					? (m.occupiedWindowHours / (WINDOW_HOURS * m.daysInMonth)) * 100
					: 0
			return {
				month: m.month,
				label: m.label,
				reservations: round(m.reservations),
				km: round(m.km),
				effectiveHours: round(m.effectiveHours),
				reservedHours: round(m.reservedHours),
				incomeBusiness: round2(m.incomeBusiness),
				incomePrivate: round2(m.incomePrivate),
				incomeTotal: round2(m.incomeBusiness + m.incomePrivate),
				avgAvailableHoursPerDay: round1(avgAvailablePerDay),
				occupancyPct: round1(occupancyPct)
			}
		})

	const dailyArr = Array.from(daily.values())
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((d) => ({
			date: d.date,
			reservations: d.reservations,
			km: round(d.km),
			effectiveHours: round1(d.effectiveHours),
			availableHours: round1(
				clampHours(Math.min(WINDOW_HOURS, WINDOW_HOURS - d.occupiedWindowHours))
			)
		}))

	const byUserArr = Array.from(byUser.values())
		.sort((a, b) => b.income - a.income)
		.map((u) => ({
			name: u.name,
			reservations: u.reservations,
			km: round(u.km),
			effectiveHours: round1(u.effectiveHours),
			income: round2(u.income)
		}))

	const paidTotal = payments
		.filter((p) => p.paid_at)
		.reduce((sum, p) => sum + (Number(p.amount_in_euros) || 0), 0)
	const outstandingTotal = payments
		.filter((p) => !p.paid_at)
		.reduce((sum, p) => sum + (Number(p.amount_in_euros) || 0), 0)

	const incomeTotal = incomeBusiness + incomePrivate

	return {
		success: true,
		empty: false,
		availableYears,
		selectedYear: selectedYearLabel,
		period: {
			start: dayKeyFromLocalMs(periodStartMidnight),
			end: dayKeyFromLocalMs(periodEndMidnight),
			days: totalDays
		},
		window: {
			startHour: WINDOW_START_HOUR,
			endHour: WINDOW_END_HOUR,
			hours: WINDOW_HOURS,
			timezone: TIMEZONE
		},
		kpis: {
			totalReservations: reservations.length,
			totalKm: round(totalKm),
			totalEffectiveHours: round(totalEffectiveHours),
			totalReservedHours: round(totalReservedHours),
			avgReservationsPerDay: round2(reservations.length / totalDays),
			avgKmPerReservation: round1(totalKm / reservations.length),
			avgEffectiveHoursPerReservation: round1(
				totalEffectiveHours / reservations.length
			),
			avgAvailableHoursPerDay: round1(totalAvailableHours / totalDays),
			avgOccupiedHoursPerDay: round1(
				(WINDOW_HOURS * totalDays - totalAvailableHours) / totalDays
			),
			occupancyPct: round1(
				((WINDOW_HOURS * totalDays - totalAvailableHours) /
					(WINDOW_HOURS * totalDays)) *
					100
			),
			incomeTotal: round2(incomeTotal),
			incomeBusiness: round2(incomeBusiness),
			incomePrivate: round2(incomePrivate),
			paidTotal: round2(paidTotal),
			outstandingTotal: round2(outstandingTotal),
			activeUsers: byUser.size
		},
		monthly: monthlyArr,
		daily: dailyArr,
		byWeekday: byWeekday.map((w) => ({
			...w,
			effectiveHours: round1(w.effectiveHours)
		})),
		byHour: byHour.map((h) => ({
			...h,
			occupiedHours: round1(h.occupiedHours)
		})),
		byUser: byUserArr
	}
}
