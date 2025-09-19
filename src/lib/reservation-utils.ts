import { PriceScheme } from '@/types/models'

/**
 * Calculate the kilometer costs for a reservation
 * @param kilometersDriven - Number of kilometers driven
 * @param priceScheme - The price scheme to use for calculations
 * @returns The cost for kilometers driven
 */
export function calculateKilometerCosts(
	kilometersDriven: number,
	priceScheme: PriceScheme
): number {
	return kilometersDriven * priceScheme.costs_per_kilometer
}

/**
 * Calculate the time-based costs for a reservation with 10-hour daily cap
 * @param reservedStart - When the reservation was supposed to start
 * @param reservedEnd - When the reservation was supposed to end
 * @param effectiveStart - When the car was actually picked up
 * @param effectiveEnd - When the car was actually returned
 * @param priceScheme - The price scheme to use for calculations
 * @returns The total time-based costs for the reservation
 */
export function calculateTimeCosts(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme
): number {
	const startReservationCost = (
		effectiveStart < reservedStart ? 0 : (effectiveStart.getTime() - reservedStart.getTime())
		* priceScheme.costs_per_unused_reserved_hour_start_trip
		/ 3600000
	)

	// Calculate effective cost with daily 10-hour cap
	const effectiveReservationCost = calculateEffectiveCostWithDailyCap(
		effectiveStart,
		effectiveEnd,
		priceScheme.costs_per_effective_hour
	)

	const endReservationCost = effectiveEnd > reservedEnd ? 0 : (
		(reservedEnd.getTime() - effectiveEnd.getTime())
		* priceScheme.costs_per_unused_reserved_hour_end_trip
		/ 3600000
	)

	return startReservationCost + effectiveReservationCost + endReservationCost
}

/**
 * Calculate effective cost with a 10-hour daily maximum cap
 * @param effectiveStart - When the effective period started
 * @param effectiveEnd - When the effective period ended
 * @param hourlyRate - The hourly rate to apply
 * @returns The total cost with daily caps applied
 */
function calculateEffectiveCostWithDailyCap(
	effectiveStart: Date,
	effectiveEnd: Date,
	hourlyRate: number
): number {
	const MAX_DAILY_HOURS = 10
	let totalCost = 0
	
	// Create a copy of the start date to iterate through days
	const currentDate = new Date(effectiveStart)
	
	while (currentDate < effectiveEnd) {
		// Get the start of the current day (00:00:00)
		const dayStart = new Date(currentDate)
		dayStart.setHours(0, 0, 0, 0)
		
		// Get the end of the current day (23:59:59.999)
		const dayEnd = new Date(dayStart)
		dayEnd.setHours(23, 59, 59, 999)
		
		// Determine the actual start and end times for this day
		const periodStart = new Date(Math.max(currentDate.getTime(), effectiveStart.getTime()))
		const periodEnd = new Date(Math.min(dayEnd.getTime(), effectiveEnd.getTime()))
		
		// Calculate hours for this day
		const hoursInDay = (periodEnd.getTime() - periodStart.getTime()) / 3600000
		
		// Apply the 10-hour cap
		const chargeableHours = Math.min(hoursInDay, MAX_DAILY_HOURS)
		
		// Add to total cost
		totalCost += chargeableHours * hourlyRate
		
		// Move to next day
		currentDate.setDate(currentDate.getDate() + 1)
		currentDate.setHours(0, 0, 0, 0)
	}
	
	return totalCost
}



/**
 * Calculate the total costs for a reservation based on the price scheme
 * @param kilometersDriven - Number of kilometers driven
 * @param reservedStart - When the reservation was supposed to start
 * @param reservedEnd - When the reservation was supposed to end
 * @param effectiveStart - When the car was actually picked up
 * @param effectiveEnd - When the car was actually returned
 * @param priceScheme - The price scheme to use for calculations
 * @returns The total cost for the reservation
 */
export function calculateTotalCosts(
	kilometersDriven: number,
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme
): number {
	const kilometerCosts = calculateKilometerCosts(kilometersDriven, priceScheme)
	const timeCosts = calculateTimeCosts(reservedStart, reservedEnd, effectiveStart, effectiveEnd, priceScheme)

	// Calculate total costs
	const totalCosts = parseFloat(
		(kilometerCosts + timeCosts).toFixed(2)
	)

	return totalCosts
}

/**
 * Display a detailed breakdown of how time costs are calculated with daily caps
 * @param reservedStart - When the reservation was supposed to start
 * @param reservedEnd - When the reservation was supposed to end
 * @param effectiveStart - When the car was actually picked up
 * @param effectiveEnd - When the car was actually returned
 * @param priceScheme - The price scheme to use for calculations
 * @returns A string describing the time cost calculation
 */
export function displayTimeCostsCalculation(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme
): string {
	const formatDateTime = (date: Date, referenceDate?: Date) => {
		const timeStr = date.toLocaleTimeString('nl-NL', {
			hour: '2-digit',
			minute: '2-digit'
		})

		// If referenceDate is provided, check if dates are the same
		if (referenceDate) {
			const isSameDate = date.toDateString() === referenceDate.toDateString()
			if (isSameDate) {
				return timeStr // Only show time if same date
			}
		}

		// Show date and time for different dates
		const dateStr = date.toLocaleDateString('nl-NL', {
			day: '2-digit',
			month: '2-digit'
		})

		return `${dateStr} ${timeStr}`
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('nl-NL', {
			style: 'currency',
			currency: 'EUR'
		}).format(amount)
	}

	const parts: string[] = []

	// Check if there's a start reservation cost (late pickup)
	if (effectiveStart >= reservedStart) {
		const startCost = (effectiveStart.getTime() - reservedStart.getTime()) * priceScheme.costs_per_unused_reserved_hour_start_trip / 3600000
		if (startCost > 0) {
			const startStr = formatDateTime(reservedStart, effectiveStart)
			const endStr = formatDateTime(effectiveStart, reservedStart)
			const rateStr = formatCurrency(priceScheme.costs_per_unused_reserved_hour_start_trip)
			parts.push(`${startStr} tot ${endStr} maal ${rateStr}/uur (start reservering tot start gebruik)`)
		}
	}

	// Add effective cost breakdown by day with 10-hour cap
	const effectiveBreakdown = getEffectiveCostBreakdownByDay(
		effectiveStart,
		effectiveEnd,
		priceScheme.costs_per_effective_hour
	)
	
	for (const dayBreakdown of effectiveBreakdown) {
		parts.push(dayBreakdown)
	}

	// Check if there's an end reservation cost (early return)
	if (effectiveEnd <= reservedEnd) {
		const endCost = (reservedEnd.getTime() - effectiveEnd.getTime()) * priceScheme.costs_per_unused_reserved_hour_end_trip / 3600000
		if (endCost > 0) {
			const startStr = formatDateTime(effectiveEnd, reservedEnd)
			const endStr = formatDateTime(reservedEnd, effectiveEnd)
			const rateStr = formatCurrency(priceScheme.costs_per_unused_reserved_hour_end_trip)
			parts.push(`${startStr} tot ${endStr} maal ${rateStr}/uur (eind gebruik tot eind reservering)`)
		}
	}

	return parts.join(' + ')
}

/**
 * Get a breakdown of effective costs by day with 10-hour cap
 * @param effectiveStart - When the effective period started
 * @param effectiveEnd - When the effective period ended
 * @param hourlyRate - The hourly rate to apply
 * @returns Array of strings describing each day's calculation
 */
function getEffectiveCostBreakdownByDay(
	effectiveStart: Date,
	effectiveEnd: Date,
	hourlyRate: number
): string[] {
	const MAX_DAILY_HOURS = 10
	const parts: string[] = []
	
	const formatDateTime = (date: Date, referenceDate?: Date) => {
		const timeStr = date.toLocaleTimeString('nl-NL', {
			hour: '2-digit',
			minute: '2-digit'
		})

		// If referenceDate is provided, check if dates are the same
		if (referenceDate) {
			const isSameDate = date.toDateString() === referenceDate.toDateString()
			if (isSameDate) {
				return timeStr // Only show time if same date
			}
		}

		// Show date and time for different dates
		const dateStr = date.toLocaleDateString('nl-NL', {
			day: '2-digit',
			month: '2-digit'
		})

		return `${dateStr} ${timeStr}`
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('nl-NL', {
			style: 'currency',
			currency: 'EUR'
		}).format(amount)
	}

	const formatDate = (date: Date) => {
		return date.toLocaleDateString('nl-NL', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		})
	}
	
	// Create a copy of the start date to iterate through days
	const currentDate = new Date(effectiveStart)
	
	while (currentDate < effectiveEnd) {
		// Get the start of the current day (00:00:00)
		const dayStart = new Date(currentDate)
		dayStart.setHours(0, 0, 0, 0)
		
		// Get the end of the current day (23:59:59.999)
		const dayEnd = new Date(dayStart)
		dayEnd.setHours(23, 59, 59, 999)
		
		// Determine the actual start and end times for this day
		const periodStart = new Date(Math.max(currentDate.getTime(), effectiveStart.getTime()))
		const periodEnd = new Date(Math.min(dayEnd.getTime(), effectiveEnd.getTime()))
		
		// Calculate hours for this day
		const hoursInDay = (periodEnd.getTime() - periodStart.getTime()) / 3600000
		
		// Apply the 10-hour cap
		const chargeableHours = Math.min(hoursInDay, MAX_DAILY_HOURS)
		
		// Format the period description
		const startStr = formatDateTime(periodStart, periodEnd)
		const endStr = formatDateTime(periodEnd, periodStart)
		const rateStr = formatCurrency(hourlyRate)
		
		// Check if we're spanning multiple days
		const isMultiDay = effectiveStart.toDateString() !== effectiveEnd.toDateString()
		
		let description: string
		if (isMultiDay) {
			// Show date for multi-day reservations
			const dayStr = formatDate(periodStart)
			if (hoursInDay > MAX_DAILY_HOURS) {
				description = `${dayStr}: ${startStr} tot ${endStr} = ${hoursInDay.toFixed(1)}u (max ${MAX_DAILY_HOURS}u) maal ${rateStr}/uur`
			} else {
				description = `${dayStr}: ${startStr} tot ${endStr} = ${chargeableHours.toFixed(1)}u maal ${rateStr}/uur`
			}
		} else {
			// Single day - no date needed
			if (hoursInDay > MAX_DAILY_HOURS) {
				description = `${startStr} tot ${endStr} = ${hoursInDay.toFixed(1)}u (max ${MAX_DAILY_HOURS}u) maal ${rateStr}/uur`
			} else {
				description = `${startStr} tot ${endStr} = ${chargeableHours.toFixed(1)}u maal ${rateStr}/uur`
			}
		}
		
		parts.push(description)
		
		// Move to next day
		currentDate.setDate(currentDate.getDate() + 1)
		currentDate.setHours(0, 0, 0, 0)
	}
	
	return parts
}

/**
 * Display a detailed breakdown of how kilometer costs are calculated
 * @param kilometersDriven - Number of kilometers driven
 * @param priceScheme - The price scheme to use for calculations
 * @returns A string describing the kilometer cost calculation
 */
export function displayKilometerCostsCalculation(
	kilometersDriven: number,
	priceScheme: PriceScheme
): string {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('nl-NL', {
			style: 'currency',
			currency: 'EUR'
		}).format(amount)
	}

	const costPerKm = formatCurrency(priceScheme.costs_per_kilometer)
	const totalCost = formatCurrency(kilometersDriven * priceScheme.costs_per_kilometer)

	return `${kilometersDriven} km × ${costPerKm}/km = ${totalCost}`
}

