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
 * Calculate the time-based costs for a reservation with 10-hour daily cap across all cost types
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
	return calculateTimeCostsWithDailyCap(
		reservedStart,
		reservedEnd,
		effectiveStart,
		effectiveEnd,
		priceScheme
	)
}


/**
 * Calculate time costs with a 10-hour daily cap applied across all cost types
 * This ensures that no more than 10 hours are charged per day, prioritizing effective hours
 * @param reservedStart - When the reservation was supposed to start
 * @param reservedEnd - When the reservation was supposed to end
 * @param effectiveStart - When the car was actually picked up
 * @param effectiveEnd - When the car was actually returned
 * @param priceScheme - The price scheme to use for calculations
 * @returns The total time-based costs with daily caps applied
 */
function calculateTimeCostsWithDailyCap(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme
): number {
	const MAX_DAILY_HOURS = 10
	let totalCost = 0
	
	// Find the overall start and end dates to iterate through all relevant days
	const overallStart = new Date(Math.min(reservedStart.getTime(), effectiveStart.getTime()))
	const overallEnd = new Date(Math.max(reservedEnd.getTime(), effectiveEnd.getTime()))
	
	// Create a copy of the start date to iterate through days
	const currentDate = new Date(overallStart)
	currentDate.setHours(0, 0, 0, 0)
	
	while (currentDate <= overallEnd) {
		// Get the start and end of the current day
		const dayStart = new Date(currentDate)
		const dayEnd = new Date(currentDate)
		dayEnd.setHours(23, 59, 59, 999)
		
		// Calculate hours for each cost type within this day
		const dayHours = calculateDayHours(
			reservedStart,
			reservedEnd,
			effectiveStart,
			effectiveEnd,
			dayStart,
			dayEnd
		)
		
		// Apply 10-hour cap with priority: effective hours first, then reserved hours
		let remainingHours = MAX_DAILY_HOURS
		let dayCost = 0
		
		// 1. First, charge effective hours (highest priority)
		const effectiveHoursToCharge = Math.min(dayHours.effective, remainingHours)
		dayCost += effectiveHoursToCharge * priceScheme.costs_per_effective_hour
		remainingHours -= effectiveHoursToCharge
		
		// 2. Then charge start reservation hours if there's remaining capacity
		if (remainingHours > 0) {
			const startHoursToCharge = Math.min(dayHours.startReserved, remainingHours)
			dayCost += startHoursToCharge * priceScheme.costs_per_unused_reserved_hour_start_trip
			remainingHours -= startHoursToCharge
		}
		
		// 3. Finally charge end reservation hours if there's still remaining capacity
		if (remainingHours > 0) {
			const endHoursToCharge = Math.min(dayHours.endReserved, remainingHours)
			dayCost += endHoursToCharge * priceScheme.costs_per_unused_reserved_hour_end_trip
			remainingHours -= endHoursToCharge
		}
		
		totalCost += dayCost
		
		// Move to next day
		currentDate.setDate(currentDate.getDate() + 1)
	}
	
	return totalCost
}

/**
 * Calculate the hours for each cost type within a specific day
 * @param reservedStart - When the reservation was supposed to start
 * @param reservedEnd - When the reservation was supposed to end
 * @param effectiveStart - When the car was actually picked up
 * @param effectiveEnd - When the car was actually returned
 * @param dayStart - Start of the day being calculated
 * @param dayEnd - End of the day being calculated
 * @returns Object with hours for each cost type within the day
 */
function calculateDayHours(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	dayStart: Date,
	dayEnd: Date
): { effective: number; startReserved: number; endReserved: number } {
	// Calculate effective hours within this day
	const effectivePeriodStart = new Date(Math.max(effectiveStart.getTime(), dayStart.getTime()))
	const effectivePeriodEnd = new Date(Math.min(effectiveEnd.getTime(), dayEnd.getTime()))
	const effective = effectivePeriodStart < effectivePeriodEnd 
		? (effectivePeriodEnd.getTime() - effectivePeriodStart.getTime()) / 3600000 
		: 0
	
	// Calculate start reservation hours (reserved time before effective start) within this day
	let startReserved = 0
	if (effectiveStart >= reservedStart) {
		const startReservedPeriodStart = new Date(Math.max(reservedStart.getTime(), dayStart.getTime()))
		const startReservedPeriodEnd = new Date(Math.min(effectiveStart.getTime(), dayEnd.getTime()))
		startReserved = startReservedPeriodStart < startReservedPeriodEnd 
			? (startReservedPeriodEnd.getTime() - startReservedPeriodStart.getTime()) / 3600000 
			: 0
	}
	
	// Calculate end reservation hours (reserved time after effective end) within this day
	let endReserved = 0
	if (effectiveEnd <= reservedEnd) {
		const endReservedPeriodStart = new Date(Math.max(effectiveEnd.getTime(), dayStart.getTime()))
		const endReservedPeriodEnd = new Date(Math.min(reservedEnd.getTime(), dayEnd.getTime()))
		endReserved = endReservedPeriodStart < endReservedPeriodEnd 
			? (endReservedPeriodEnd.getTime() - endReservedPeriodStart.getTime()) / 3600000 
			: 0
	}
	
	return { effective, startReserved, endReserved }
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
 * Display a detailed breakdown of how time costs are calculated with daily caps across all cost types
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
	const breakdown = getTimeCostsBreakdownByDay(
		reservedStart,
		reservedEnd,
		effectiveStart,
		effectiveEnd,
		priceScheme
	)
	
	return breakdown.join(' + ')
}

/**
 * Get a breakdown of time costs by day with 10-hour cap applied across all cost types
 * @param reservedStart - When the reservation was supposed to start
 * @param reservedEnd - When the reservation was supposed to end
 * @param effectiveStart - When the car was actually picked up
 * @param effectiveEnd - When the car was actually returned
 * @param priceScheme - The price scheme to use for calculations
 * @returns Array of strings describing each day's calculation
 */
function getTimeCostsBreakdownByDay(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme
): string[] {
	const MAX_DAILY_HOURS = 10
	const parts: string[] = []

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
	
	// Find the overall start and end dates to iterate through all relevant days
	const overallStart = new Date(Math.min(reservedStart.getTime(), effectiveStart.getTime()))
	const overallEnd = new Date(Math.max(reservedEnd.getTime(), effectiveEnd.getTime()))
	
	// Create a copy of the start date to iterate through days
	const currentDate = new Date(overallStart)
	currentDate.setHours(0, 0, 0, 0)
	
	while (currentDate <= overallEnd) {
		// Get the start and end of the current day
		const dayStart = new Date(currentDate)
		const dayEnd = new Date(currentDate)
		dayEnd.setHours(23, 59, 59, 999)
		
		// Calculate hours for each cost type within this day
		const dayHours = calculateDayHours(
			reservedStart,
			reservedEnd,
			effectiveStart,
			effectiveEnd,
			dayStart,
			dayEnd
		)
		
		// Skip days with no hours
		const totalHours = dayHours.effective + dayHours.startReserved + dayHours.endReserved
		if (totalHours === 0) {
			currentDate.setDate(currentDate.getDate() + 1)
			continue
		}
		
		// Build description for this day
		const dayStr = formatDate(dayStart)
		const isMultiDay = overallStart.toDateString() !== overallEnd.toDateString()
		
		const dayParts: string[] = []
		let remainingHours = MAX_DAILY_HOURS
		
		// 1. Effective hours (highest priority)
		if (dayHours.effective > 0) {
			const effectiveHoursToCharge = Math.min(dayHours.effective, remainingHours)
			const rateStr = formatCurrency(priceScheme.costs_per_effective_hour)
			
			if (dayHours.effective > remainingHours) {
				dayParts.push(`${dayHours.effective.toFixed(1)}u gebruik (max ${effectiveHoursToCharge.toFixed(1)}u) × ${rateStr}/u`)
			} else {
				dayParts.push(`${effectiveHoursToCharge.toFixed(1)}u gebruik × ${rateStr}/u`)
			}
			remainingHours -= effectiveHoursToCharge
		}
		
		// 2. Start reservation hours
		if (dayHours.startReserved > 0 && remainingHours > 0) {
			const startHoursToCharge = Math.min(dayHours.startReserved, remainingHours)
			const rateStr = formatCurrency(priceScheme.costs_per_unused_reserved_hour_start_trip)
			
			if (dayHours.startReserved > remainingHours) {
				dayParts.push(`${dayHours.startReserved.toFixed(1)}u start-reservering (max ${startHoursToCharge.toFixed(1)}u) × ${rateStr}/u`)
			} else {
				dayParts.push(`${startHoursToCharge.toFixed(1)}u start-reservering × ${rateStr}/u`)
			}
			remainingHours -= startHoursToCharge
		}
		
		// 3. End reservation hours
		if (dayHours.endReserved > 0 && remainingHours > 0) {
			const endHoursToCharge = Math.min(dayHours.endReserved, remainingHours)
			const rateStr = formatCurrency(priceScheme.costs_per_unused_reserved_hour_end_trip)
			
			if (dayHours.endReserved > remainingHours) {
				dayParts.push(`${dayHours.endReserved.toFixed(1)}u eind-reservering (max ${endHoursToCharge.toFixed(1)}u) × ${rateStr}/u`)
			} else {
				dayParts.push(`${endHoursToCharge.toFixed(1)}u eind-reservering × ${rateStr}/u`)
			}
		}
		
		// Format the final description
		let description: string
		if (isMultiDay) {
			description = `${dayStr}: ${dayParts.join(' + ')}`
		} else {
			description = dayParts.join(' + ')
		}
		
		// Add cap notice if total hours exceed 10
		if (totalHours > MAX_DAILY_HOURS) {
			if (isMultiDay) {
				description += ` (max ${MAX_DAILY_HOURS}u per dag)`
			} else {
				description += ` (max ${MAX_DAILY_HOURS}u)`
			}
		}
		
		parts.push(description)
		
		// Move to next day
		currentDate.setDate(currentDate.getDate() + 1)
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

