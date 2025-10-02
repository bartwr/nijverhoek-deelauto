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
	const breakdown = getTimeCostsBreakdownWithTimeRanges(
		reservedStart,
		reservedEnd,
		effectiveStart,
		effectiveEnd,
		priceScheme
	)
	
	return breakdown.join('\n')
}


/**
 * Get a breakdown of time costs with time ranges displayed in the new format
 * @param reservedStart - When the reservation was supposed to start
 * @param reservedEnd - When the reservation was supposed to end
 * @param effectiveStart - When the car was actually picked up
 * @param effectiveEnd - When the car was actually returned
 * @param priceScheme - The price scheme to use for calculations
 * @returns Array of strings describing each time period's calculation
 */
function getTimeCostsBreakdownWithTimeRanges(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme
): string[] {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('nl-NL', {
			style: 'currency',
			currency: 'EUR'
		}).format(amount)
	}

	const formatDate = (date: Date) => {
		return `${date.getDate()}/${date.getMonth() + 1}`
	}

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString('nl-NL', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		})
	}

	// Determine if this is a single day or multi-day reservation
	const overallStart = new Date(Math.min(reservedStart.getTime(), effectiveStart.getTime()))
	const overallEnd = new Date(Math.max(reservedEnd.getTime(), effectiveEnd.getTime()))
	const isMultiDay = overallStart.toDateString() !== overallEnd.toDateString()

	if (!isMultiDay) {
		// Single day reservation - handle all scenarios
		return getSingleDayBreakdown(
			reservedStart,
			reservedEnd,
			effectiveStart,
			effectiveEnd,
			priceScheme,
			formatCurrency,
			formatTime
		)
	} else {
		// Multi-day reservation
		return getMultiDayBreakdown(
			reservedStart,
			reservedEnd,
			effectiveStart,
			effectiveEnd,
			priceScheme,
			formatCurrency,
			formatDate,
			formatTime
		)
	}
}

/**
 * Handle single day reservation breakdown
 */
function getSingleDayBreakdown(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme,
	formatCurrency: (amount: number) => string,
	formatTime: (date: Date) => string
): string[] {
	const MAX_DAILY_HOURS = 10
	const parts: string[] = []

	// Calculate total hours for each type
	const effectiveHours = (effectiveEnd.getTime() - effectiveStart.getTime()) / 3600000
	const startReservedHours = effectiveStart > reservedStart 
		? (effectiveStart.getTime() - reservedStart.getTime()) / 3600000 
		: 0
	const endReservedHours = effectiveEnd < reservedEnd 
		? (reservedEnd.getTime() - effectiveEnd.getTime()) / 3600000 
		: 0

	const totalHours = effectiveHours + startReservedHours + endReservedHours
	let remainingHours = MAX_DAILY_HOURS

	// Apply the same priority logic as the original calculation
	// 1. First, charge effective hours (highest priority)
	const effectiveHoursToCharge = Math.min(effectiveHours, remainingHours)
	remainingHours -= effectiveHoursToCharge

	// 2. Then charge start reservation hours if there's remaining capacity
	const startHoursToCharge = remainingHours > 0 ? Math.min(startReservedHours, remainingHours) : 0
	remainingHours -= startHoursToCharge

	// 3. Finally charge end reservation hours if there's still remaining capacity
	const endHoursToCharge = remainingHours > 0 ? Math.min(endReservedHours, remainingHours) : 0

	// Now create the display strings
	// Main usage period (from start of reservation or effective start to effective end)
	if (effectiveHoursToCharge > 0 || startHoursToCharge > 0) {
		const rateStr = formatCurrency(priceScheme.costs_per_effective_hour)
		const displayHours = effectiveHoursToCharge + startHoursToCharge
		
		let description: string
		if (startReservedHours > 0) {
			// There was start reservation time - show from reservation start to effective end
			description = `Start reservering ${formatTime(reservedStart)} t/m einde gebruik ${formatTime(effectiveEnd)}: ${displayHours.toFixed(1)}u × ${rateStr}/u`
		} else {
			// No start reservation time - show from effective start to effective end
			description = `Start reservering ${formatTime(effectiveStart)} t/m einde gebruik ${formatTime(effectiveEnd)}: ${displayHours.toFixed(1)}u × ${rateStr}/u`
		}

		// Add max hours notice if needed
		if (totalHours > MAX_DAILY_HOURS) {
			description += ` (max ${MAX_DAILY_HOURS}u)`
		}

		parts.push(description)
	}

	// End reservation period (unused time after effective end)
	if (endHoursToCharge > 0) {
		const rateStr = formatCurrency(priceScheme.costs_per_unused_reserved_hour_end_trip)
		const description = `Einde gebruik ${formatTime(effectiveEnd)} t/m einde reservering ${formatTime(reservedEnd)}: ${endHoursToCharge.toFixed(1)}u × ${rateStr}/u`
		parts.push(description)
	}

	return parts
}

/**
 * Handle multi-day reservation breakdown
 */
function getMultiDayBreakdown(
	reservedStart: Date,
	reservedEnd: Date,
	effectiveStart: Date,
	effectiveEnd: Date,
	priceScheme: PriceScheme,
	formatCurrency: (amount: number) => string,
	formatDate: (date: Date) => string,
	formatTime: (date: Date) => string
): string[] {
	const MAX_DAILY_HOURS = 10
	const parts: string[] = []

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
		let remainingHours = MAX_DAILY_HOURS
		
		// Apply the same priority logic as the original calculation
		// 1. First, charge effective hours (highest priority)
		const effectiveHoursToCharge = Math.min(dayHours.effective, remainingHours)
		remainingHours -= effectiveHoursToCharge

		// 2. Then charge start reservation hours if there's remaining capacity
		const startHoursToCharge = remainingHours > 0 ? Math.min(dayHours.startReserved, remainingHours) : 0
		remainingHours -= startHoursToCharge

		// 3. Finally charge end reservation hours if there's still remaining capacity
		const endHoursToCharge = remainingHours > 0 ? Math.min(dayHours.endReserved, remainingHours) : 0

		// Now create the display strings
		// Combine start reservation and effective usage into one line if both exist on the same day
		if (effectiveHoursToCharge > 0 || startHoursToCharge > 0) {
			const rateStr = formatCurrency(priceScheme.costs_per_effective_hour)
			const displayHours = effectiveHoursToCharge + startHoursToCharge
			
			// Determine the time range for the combined period
			let description: string
			
			if (dayHours.startReserved > 0 && dayHours.effective > 0) {
				// Both start reservation and effective usage on this day
				const periodStart = new Date(Math.max(reservedStart.getTime(), dayStart.getTime()))
				const periodEnd = new Date(Math.min(effectiveEnd.getTime(), dayEnd.getTime()))
				
				if (periodEnd.getTime() >= dayEnd.getTime() - 1000) {
					// Ended at end of day
					description = `${dayStr}: Start reservering ${formatTime(periodStart)} t/m einde dag: ${displayHours.toFixed(1)}u × ${rateStr}/u`
				} else {
					// Ended within the day
					description = `${dayStr}: Start reservering ${formatTime(periodStart)} t/m einde gebruik ${formatTime(periodEnd)}: ${displayHours.toFixed(1)}u × ${rateStr}/u`
				}
			} else if (dayHours.startReserved > 0) {
				// Only start reservation on this day
				const periodStart = new Date(Math.max(reservedStart.getTime(), dayStart.getTime()))
				description = `${dayStr}: Start reservering ${formatTime(periodStart)} t/m einde dag: ${displayHours.toFixed(1)}u × ${rateStr}/u`
			} else {
				// Only effective usage on this day
				const periodStart = new Date(Math.max(effectiveStart.getTime(), dayStart.getTime()))
				const periodEnd = new Date(Math.min(effectiveEnd.getTime(), dayEnd.getTime()))
				
				if (periodStart.getTime() === dayStart.getTime()) {
					// Started at beginning of day
					description = `${dayStr}: Gebruik 00:00 t/m einde gebruik ${formatTime(periodEnd)}: ${displayHours.toFixed(1)}u × ${rateStr}/u`
				} else if (periodEnd.getTime() >= dayEnd.getTime() - 1000) {
					// Ended at end of day
					description = `${dayStr}: Start reservering ${formatTime(periodStart)} t/m einde dag: ${displayHours.toFixed(1)}u × ${rateStr}/u`
				} else {
					// Started and ended within the day
					description = `${dayStr}: Gebruik ${formatTime(periodStart)} t/m einde gebruik ${formatTime(periodEnd)}: ${displayHours.toFixed(1)}u × ${rateStr}/u`
				}
			}
			
			parts.push(description)
		}
		
		// Handle end reservation period separately (if any)
		if (endHoursToCharge > 0) {
			const rateStr = formatCurrency(priceScheme.costs_per_unused_reserved_hour_end_trip)
			
			// Determine start and end times for this period
			const periodStart = new Date(Math.max(effectiveEnd.getTime(), dayStart.getTime()))
			const periodEnd = new Date(Math.min(reservedEnd.getTime(), dayEnd.getTime()))
			
			const description = `${dayStr}: Einde gebruik ${formatTime(periodStart)} t/m einde reservering ${formatTime(periodEnd)}: ${endHoursToCharge.toFixed(1)}u × ${rateStr}/u`
			parts.push(description)
		}
		
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

