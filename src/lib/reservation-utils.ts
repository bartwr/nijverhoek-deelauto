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
 * Calculate the time-based costs for a reservation
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

	const effectiveReservationCost = (
		(
			effectiveEnd.getTime() - effectiveStart.getTime()
		)
		* priceScheme.costs_per_effective_hour
		/ 3600000
	)

	const endReservationCost = effectiveEnd > reservedEnd ? 0 : (
		(reservedEnd.getTime() - effectiveEnd.getTime())
		* priceScheme.costs_per_unused_reserved_hour_end_trip
		/ 3600000
	)

	return startReservationCost + effectiveReservationCost + endReservationCost
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
 * Display a detailed breakdown of how time costs are calculated
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

	// Define time periods with their rates
	const periods: Array<{
		start: Date
		end: Date
		rate: number
		rateType: string
	}> = []

	// Check if there's a start reservation cost (late pickup)
	if (effectiveStart >= reservedStart) {
		const startCost = (effectiveStart.getTime() - reservedStart.getTime()) * priceScheme.costs_per_unused_reserved_hour_start_trip / 3600000
		if (startCost > 0) {
			periods.push({
				start: reservedStart,
				end: effectiveStart,
				rate: priceScheme.costs_per_unused_reserved_hour_start_trip,
				rateType: 'start'
			})
		}
	}

	// Effective reservation cost (actual usage time)
	const effectiveCost = (effectiveEnd.getTime() - effectiveStart.getTime()) * priceScheme.costs_per_effective_hour / 3600000
	if (effectiveCost > 0) {
		periods.push({
			start: effectiveStart,
			end: effectiveEnd,
			rate: priceScheme.costs_per_effective_hour,
			rateType: 'effective'
		})
	}

	// Check if there's an end reservation cost (early return)
	if (effectiveEnd <= reservedEnd) {
		const endCost = (reservedEnd.getTime() - effectiveEnd.getTime()) * priceScheme.costs_per_unused_reserved_hour_end_trip / 3600000
		if (endCost > 0) {
			periods.push({
				start: effectiveEnd,
				end: reservedEnd,
				rate: priceScheme.costs_per_unused_reserved_hour_end_trip,
				rateType: 'end'
			})
		}
	}

	// Merge consecutive periods with the same rate
	const mergedPeriods: Array<{
		start: Date
		end: Date
		rate: number
		rateType: string
	}> = []

	for (let i = 0; i < periods.length; i++) {
		const currentPeriod = periods[i]
		
		// Check if we can merge with the previous period
		if (mergedPeriods.length > 0) {
			const lastPeriod = mergedPeriods[mergedPeriods.length - 1]
			
			// Check if rates are the same and periods are consecutive
			if (lastPeriod.rate === currentPeriod.rate && 
				lastPeriod.end.getTime() === currentPeriod.start.getTime()) {
				// Merge periods
				lastPeriod.end = currentPeriod.end
				continue
			}
		}
		
		mergedPeriods.push(currentPeriod)
	}

	// Format the merged periods
	const parts: string[] = []
	
	for (const period of mergedPeriods) {
		const startStr = formatDateTime(period.start, period.end)
		const endStr = formatDateTime(period.end, period.start)
		const rateStr = formatCurrency(period.rate)
		
		parts.push(`${startStr} tot ${endStr} maal ${rateStr}/uur`)
	}

	return parts.join(' plus ')
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

