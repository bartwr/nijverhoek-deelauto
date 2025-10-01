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
	return calculateCombinedTimeCostsWithDailyCap(
		reservedStart,
		reservedEnd,
		effectiveStart,
		effectiveEnd,
		priceScheme
	)
}

/**
 * Calculate combined time costs with a true 10-hour daily maximum cap across all cost types
 * @param reservedStart - When the reservation was supposed to start
 * @param reservedEnd - When the reservation was supposed to end
 * @param effectiveStart - When the car was actually picked up
 * @param effectiveEnd - When the car was actually returned
 * @param priceScheme - The price scheme to use for calculations
 * @returns The total cost with daily caps applied to combined time
 */
function calculateCombinedTimeCostsWithDailyCap(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme
): number {
	const MAX_DAILY_HOURS = 10
	let totalCost = 0
	
	// Find the overall start and end dates to iterate through all days
	const overallStart = new Date(Math.min(reservedStart.getTime(), effectiveStart.getTime()))
	const overallEnd = new Date(Math.max(reservedEnd.getTime(), effectiveEnd.getTime()))
	
	// Create a copy of the start date to iterate through days
	const currentDate = new Date(overallStart)
	
	while (currentDate < overallEnd) {
		// Get the start of the current day (00:00:00)
		const dayStart = new Date(currentDate)
		dayStart.setHours(0, 0, 0, 0)
		
		// Get the end of the current day (23:59:59.999)
		const dayEnd = new Date(dayStart)
		dayEnd.setHours(23, 59, 59, 999)
		
		// Calculate total chargeable hours for this day across all cost types
		let totalHoursThisDay = 0
		let totalCostThisDay = 0
		
		// Start reservation cost (late pickup)
		if (effectiveStart >= reservedStart) {
			const startPeriodStart = new Date(Math.max(dayStart.getTime(), reservedStart.getTime()))
			const startPeriodEnd = new Date(Math.min(dayEnd.getTime(), effectiveStart.getTime()))
			
			if (startPeriodStart < startPeriodEnd) {
				const hoursInPeriod = (startPeriodEnd.getTime() - startPeriodStart.getTime()) / 3600000
				totalHoursThisDay += hoursInPeriod
				totalCostThisDay += hoursInPeriod * priceScheme.costs_per_unused_reserved_hour_start_trip
			}
		}
		
		// Effective usage cost
		const effectivePeriodStart = new Date(Math.max(dayStart.getTime(), effectiveStart.getTime()))
		const effectivePeriodEnd = new Date(Math.min(dayEnd.getTime(), effectiveEnd.getTime()))
		
		if (effectivePeriodStart < effectivePeriodEnd) {
			const hoursInPeriod = (effectivePeriodEnd.getTime() - effectivePeriodStart.getTime()) / 3600000
			totalHoursThisDay += hoursInPeriod
			totalCostThisDay += hoursInPeriod * priceScheme.costs_per_effective_hour
		}
		
		// End reservation cost (early return)
		if (effectiveEnd <= reservedEnd) {
			const endPeriodStart = new Date(Math.max(dayStart.getTime(), effectiveEnd.getTime()))
			const endPeriodEnd = new Date(Math.min(dayEnd.getTime(), reservedEnd.getTime()))
			
			if (endPeriodStart < endPeriodEnd) {
				const hoursInPeriod = (endPeriodEnd.getTime() - endPeriodStart.getTime()) / 3600000
				totalHoursThisDay += hoursInPeriod
				totalCostThisDay += hoursInPeriod * priceScheme.costs_per_unused_reserved_hour_end_trip
			}
		}
		
		// Apply the 10-hour cap to the total hours for this day
		if (totalHoursThisDay > MAX_DAILY_HOURS) {
			// Scale down the cost proportionally to respect the 10-hour cap
			const scaleFactor = MAX_DAILY_HOURS / totalHoursThisDay
			totalCostThisDay *= scaleFactor
		}
		
		totalCost += totalCostThisDay
		
		// Move to next day
		currentDate.setDate(currentDate.getDate() + 1)
		currentDate.setHours(0, 0, 0, 0)
	}
	
	return totalCost
}

/**
 * Calculate cost with a 10-hour daily maximum cap (legacy function, kept for compatibility)
 * @param periodStart - When the period started
 * @param periodEnd - When the period ended
 * @param hourlyRate - The hourly rate to apply
 * @returns The total cost with daily caps applied
 */
function calculateCostWithDailyCap(
	periodStart: Date,
	periodEnd: Date,
	hourlyRate: number
): number {
	const MAX_DAILY_HOURS = 10
	let totalCost = 0
	
	// Create a copy of the start date to iterate through days
	const currentDate = new Date(periodStart)
	
	while (currentDate < periodEnd) {
		// Get the start of the current day (00:00:00)
		const dayStart = new Date(currentDate)
		dayStart.setHours(0, 0, 0, 0)
		
		// Get the end of the current day (23:59:59.999)
		const dayEnd = new Date(dayStart)
		dayEnd.setHours(23, 59, 59, 999)
		
		// Determine the actual start and end times for this day
		const dayPeriodStart = new Date(Math.max(currentDate.getTime(), periodStart.getTime()))
		const dayPeriodEnd = new Date(Math.min(dayEnd.getTime(), periodEnd.getTime()))
		
		// Calculate hours for this day
		const hoursInDay = (dayPeriodEnd.getTime() - dayPeriodStart.getTime()) / 3600000
		
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
	return getCombinedTimeCostBreakdownByDay(
		reservedStart,
		reservedEnd,
		effectiveStart,
		effectiveEnd,
		priceScheme
	).join(' + ')
}

/**
 * Get a breakdown of combined time costs by day with true 10-hour daily cap
 * @param reservedStart - When the reservation was supposed to start
 * @param reservedEnd - When the reservation was supposed to end
 * @param effectiveStart - When the car was actually picked up
 * @param effectiveEnd - When the car was actually returned
 * @param priceScheme - The price scheme to use for calculations
 * @returns Array of strings describing each day's calculation with combined costs
 */
function getCombinedTimeCostBreakdownByDay(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme
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
	
	// Find the overall start and end dates to iterate through all days
	const overallStart = new Date(Math.min(reservedStart.getTime(), effectiveStart.getTime()))
	const overallEnd = new Date(Math.max(reservedEnd.getTime(), effectiveEnd.getTime()))
	
	// Create a copy of the start date to iterate through days
	const currentDate = new Date(overallStart)
	
	while (currentDate < overallEnd) {
		// Get the start of the current day (00:00:00)
		const dayStart = new Date(currentDate)
		dayStart.setHours(0, 0, 0, 0)
		
		// Get the end of the current day (23:59:59.999)
		const dayEnd = new Date(dayStart)
		dayEnd.setHours(23, 59, 59, 999)
		
		// Collect all periods for this day
		const dayPeriods: Array<{
			start: Date
			end: Date
			rate: number
			type: string
		}> = []
		
		// Start reservation cost (late pickup)
		if (effectiveStart >= reservedStart) {
			const startPeriodStart = new Date(Math.max(dayStart.getTime(), reservedStart.getTime()))
			const startPeriodEnd = new Date(Math.min(dayEnd.getTime(), effectiveStart.getTime()))
			
			if (startPeriodStart < startPeriodEnd) {
				dayPeriods.push({
					start: startPeriodStart,
					end: startPeriodEnd,
					rate: priceScheme.costs_per_unused_reserved_hour_start_trip,
					type: 'start reservering'
				})
			}
		}
		
		// Effective usage cost
		const effectivePeriodStart = new Date(Math.max(dayStart.getTime(), effectiveStart.getTime()))
		const effectivePeriodEnd = new Date(Math.min(dayEnd.getTime(), effectiveEnd.getTime()))
		
		if (effectivePeriodStart < effectivePeriodEnd) {
			dayPeriods.push({
				start: effectivePeriodStart,
				end: effectivePeriodEnd,
				rate: priceScheme.costs_per_effective_hour,
				type: 'effectief gebruik'
			})
		}
		
		// End reservation cost (early return)
		if (effectiveEnd <= reservedEnd) {
			const endPeriodStart = new Date(Math.max(dayStart.getTime(), effectiveEnd.getTime()))
			const endPeriodEnd = new Date(Math.min(dayEnd.getTime(), reservedEnd.getTime()))
			
			if (endPeriodStart < endPeriodEnd) {
				dayPeriods.push({
					start: endPeriodStart,
					end: endPeriodEnd,
					rate: priceScheme.costs_per_unused_reserved_hour_end_trip,
					type: 'eind reservering'
				})
			}
		}
		
		// If there are periods for this day, create the breakdown
		if (dayPeriods.length > 0) {
			// Calculate total hours and weighted average rate
			let totalHours = 0
			let totalCost = 0
			
			for (const period of dayPeriods) {
				const hours = (period.end.getTime() - period.start.getTime()) / 3600000
				totalHours += hours
				totalCost += hours * period.rate
			}
			
			// Check if we're spanning multiple days
			const isMultiDay = overallStart.toDateString() !== overallEnd.toDateString()
			
			// Apply the 10-hour cap
			const chargeableHours = Math.min(totalHours, MAX_DAILY_HOURS)
			let finalCost = totalCost
			
			if (totalHours > MAX_DAILY_HOURS) {
				// Scale down the cost proportionally
				const scaleFactor = MAX_DAILY_HOURS / totalHours
				finalCost = totalCost * scaleFactor
			}
			
			// Create description
			let description: string
			
			if (dayPeriods.length === 1) {
				// Single period for this day
				const period = dayPeriods[0]
				const startStr = formatDateTime(period.start, period.end)
				const endStr = formatDateTime(period.end, period.start)
				const rateStr = formatCurrency(period.rate)
				
				if (isMultiDay) {
					const dayStr = formatDate(period.start)
					if (totalHours > MAX_DAILY_HOURS) {
						description = `${dayStr}: ${startStr} tot ${endStr} = ${totalHours.toFixed(1)}u (max ${MAX_DAILY_HOURS}u) maal ${rateStr}/uur (${period.type})`
					} else {
						description = `${dayStr}: ${startStr} tot ${endStr} = ${chargeableHours.toFixed(1)}u maal ${rateStr}/uur (${period.type})`
					}
				} else {
					if (totalHours > MAX_DAILY_HOURS) {
						description = `${startStr} tot ${endStr} = ${totalHours.toFixed(1)}u (max ${MAX_DAILY_HOURS}u) maal ${rateStr}/uur (${period.type})`
					} else {
						description = `${startStr} tot ${endStr} = ${chargeableHours.toFixed(1)}u maal ${rateStr}/uur (${period.type})`
					}
				}
			} else {
				// Multiple periods for this day - show combined
				const dayStr = isMultiDay ? `${formatDate(currentDate)}: ` : ''
				const periodDescriptions = dayPeriods.map(period => {
					const startStr = formatDateTime(period.start, period.end)
					const endStr = formatDateTime(period.end, period.start)
					const hours = (period.end.getTime() - period.start.getTime()) / 3600000
					const rateStr = formatCurrency(period.rate)
					return `${startStr}-${endStr} (${hours.toFixed(1)}u × ${rateStr}, ${period.type})`
				}).join(' + ')
				
				if (totalHours > MAX_DAILY_HOURS) {
					description = `${dayStr}${periodDescriptions} = ${totalHours.toFixed(1)}u totaal (max ${MAX_DAILY_HOURS}u)`
				} else {
					description = `${dayStr}${periodDescriptions} = ${chargeableHours.toFixed(1)}u totaal`
				}
			}
			
			parts.push(description)
		}
		
		// Move to next day
		currentDate.setDate(currentDate.getDate() + 1)
		currentDate.setHours(0, 0, 0, 0)
	}
	
	return parts
}

/**
 * Get a breakdown of costs by day with 10-hour cap
 * @param periodStart - When the period started
 * @param periodEnd - When the period ended
 * @param hourlyRate - The hourly rate to apply
 * @returns Array of strings describing each day's calculation
 */
function getCostBreakdownByDay(
	periodStart: Date,
	periodEnd: Date,
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
	const currentDate = new Date(periodStart)
	
	while (currentDate < periodEnd) {
		// Get the start of the current day (00:00:00)
		const dayStart = new Date(currentDate)
		dayStart.setHours(0, 0, 0, 0)
		
		// Get the end of the current day (23:59:59.999)
		const dayEnd = new Date(dayStart)
		dayEnd.setHours(23, 59, 59, 999)
		
		// Determine the actual start and end times for this day
		const dayPeriodStart = new Date(Math.max(currentDate.getTime(), periodStart.getTime()))
		const dayPeriodEnd = new Date(Math.min(dayEnd.getTime(), periodEnd.getTime()))
		
		// Calculate hours for this day
		const hoursInDay = (dayPeriodEnd.getTime() - dayPeriodStart.getTime()) / 3600000
		
		// Apply the 10-hour cap
		const chargeableHours = Math.min(hoursInDay, MAX_DAILY_HOURS)
		
		// Format the period description
		const startStr = formatDateTime(dayPeriodStart, dayPeriodEnd)
		const endStr = formatDateTime(dayPeriodEnd, dayPeriodStart)
		const rateStr = formatCurrency(hourlyRate)
		
		// Check if we're spanning multiple days
		const isMultiDay = periodStart.toDateString() !== periodEnd.toDateString()
		
		let description: string
		if (isMultiDay) {
			// Show date for multi-day reservations
			const dayStr = formatDate(dayPeriodStart)
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

