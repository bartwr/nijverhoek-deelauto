'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { Reservation, User, PriceScheme } from '@/types/models'
import { displayTimeCostsCalculation, displayKilometerCostsCalculation, calculateKilometerCosts, calculateTimeCosts } from '@/lib/reservation-utils'
import { getUserSidebarItems } from '@/lib/sidebar-utils'

interface ReservationWithUser extends Reservation {
	user?: User
	priceScheme?: PriceScheme
}

interface AuthUser {
	email: string
	expiresAt: number
}

interface PaymentInfo {
	reservations_paid?: string[]
	bunq_status?: string
	paid_at?: Date
}

export default function ReservationsPage() {
	const params = useParams()
	const router = useRouter()
	const yearmonth = params.yearmonth as string
	const [reservations, setReservations] = useState<ReservationWithUser[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<AuthUser | null>(null)
	const [payments, setPayments] = useState<PaymentInfo[]>([])
	const [isLoadingPayments, setIsLoadingPayments] = useState(true)
	const [updatingReservations, setUpdatingReservations] = useState<Set<string>>(new Set())

	const checkAuthStatus = useCallback(async () => {
		try {
			const response = await fetch('/api/user/check-auth')
			if (response.ok) {
				const data = await response.json()
				if (data.isLoggedIn) {
					setIsLoggedIn(true)
					setUser(data.user)
				} else {
					router.push(`/mijn/login?redirect=${encodeURIComponent(window.location.pathname)}`)
				}
			} else {
				router.push(`/mijn/login?redirect=${encodeURIComponent(window.location.pathname)}`)
			}
		} catch (error) {
			console.error('Error checking auth status:', error)
			router.push(`/mijn/login?redirect=${encodeURIComponent(window.location.pathname)}`)
		}
	}, [router])

	const fetchReservations = useCallback(async () => {
		try {
			setIsLoading(true)
			setError('')
			
			const response = await fetch(`/api/reservations?yearmonth=${yearmonth}`)
			const data = await response.json()

			if (data.success) {
				setReservations(data.data)
			} else {
				setError(data.error || 'Failed to fetch reservations')
			}
		} catch (error) {
			setError('An error occurred while fetching reservations')
			console.error('Error fetching reservations:', error)
		} finally {
			setIsLoading(false)
		}
	}, [yearmonth])

	useEffect(() => {
		checkAuthStatus()
	}, [checkAuthStatus])

	useEffect(() => {
		if (isLoggedIn) {
			fetchReservations()
			fetchPayments()
		}
	}, [yearmonth, isLoggedIn, fetchReservations])

	const fetchPayments = async () => {
		try {
			setIsLoadingPayments(true)
			
			const response = await fetch('/api/user/payments')
			const data = await response.json()

			if (data.success) {
				setPayments(data.data || [])
			} else {
				console.error('Failed to fetch payments:', data.error)
			}
		} catch (error) {
			console.error('Error fetching payments:', error)
		} finally {
			setIsLoadingPayments(false)
		}
	}

	const isReservationUnpaid = (reservation: ReservationWithUser) => {
		// A reservation is unpaid if:
		// 1. The reservation_start date is before the start of the current month
		// 2. Its ID is not in the reservations_paid of any Payment that has bunq_status "ACCEPTED" or "PAID"
		
		const now = new Date()
		const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
		
		// Check if reservation_start is before current month
		const reservationStart = new Date(reservation.reservation_start)
		if (reservationStart >= currentMonthStart) {
			return false
		}
		
		// Check if this reservation ID is in any paid payment
		const reservationId = reservation._id?.toString()
		if (!reservationId) return false
		
		const isPaid = payments.some(payment => {
			const hasValidStatus = payment.bunq_status === 'ACCEPTED' || payment.bunq_status === 'PAID'
			const hasValidPaidAt = payment.paid_at !== null && payment.paid_at !== undefined
			const includesReservation = payment.reservations_paid?.includes(reservationId)
			
			return (hasValidStatus || hasValidPaidAt) && includesReservation
		})
		
		return !isPaid
	}

	const toggleBusinessStatus = async (reservationId: string, currentStatus: boolean) => {
		const newStatus = !currentStatus
		
		// Optimistically update the UI immediately
		setReservations(prev => 
			prev.map(reservation => 
				reservation._id?.toString() === reservationId
					? { ...reservation, is_business_transaction: newStatus }
					: reservation
			)
		)

		// Add to updating set for loading indicator
		setUpdatingReservations(prev => new Set(prev).add(reservationId))

		try {
			const response = await fetch(`/api/reservations/${reservationId}/business-status`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ is_business_transaction: newStatus })
			})

			const data = await response.json()

			if (!data.success) {
				// Revert the optimistic update if the API call failed
				setReservations(prev => 
					prev.map(reservation => 
						reservation._id?.toString() === reservationId
							? { ...reservation, is_business_transaction: currentStatus }
							: reservation
					)
				)
				setError(data.error || 'Failed to update business status')
			}
		} catch (error) {
			// Revert the optimistic update if there was an error
			setReservations(prev => 
				prev.map(reservation => 
					reservation._id?.toString() === reservationId
						? { ...reservation, is_business_transaction: currentStatus }
						: reservation
				)
			)
			setError('An error occurred while updating business status')
			console.error('Error updating business status:', error)
		} finally {
			// Remove from updating set
			setUpdatingReservations(prev => {
				const newSet = new Set(prev)
				newSet.delete(reservationId)
				return newSet
			})
		}
	}

	const formatReservationDate = (startDate: Date, endDate: Date) => {
		const start = new Date(startDate)
		const end = new Date(endDate)
		
		// Check if it's the same day
		if (start.toDateString() === end.toDateString()) {
			return start.toLocaleDateString('nl-NL', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})
		}
		
		// Check if it's multi-day
		const startMonth = start.getMonth()
		const startYear = start.getFullYear()
		const endMonth = end.getMonth()
		const endYear = end.getFullYear()
		
		// If same month and year: "3 t/m 4 september 2025"
		if (startMonth === endMonth && startYear === endYear) {
			const startDay = start.getDate()
			const endDay = end.getDate()
			const monthYear = end.toLocaleDateString('nl-NL', {
				month: 'long',
				year: 'numeric'
			})
			return `${startDay} t/m ${endDay} ${monthYear}`
		}
		
		// If different months: "30 augustus t/m 1 september 2025"
		const startFormatted = start.toLocaleDateString('nl-NL', {
			day: 'numeric',
			month: 'long'
		})
		const endFormatted = end.toLocaleDateString('nl-NL', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
		return `${startFormatted} t/m ${endFormatted}`
	}

	const formatTime = (date: Date) => {
		return new Date(date).toLocaleTimeString('nl-NL', {
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	const formatTimeWithDate = (startDate: Date, endDate: Date) => {
		const start = new Date(startDate)
		const end = new Date(endDate)
		
		// Check if it's the same day
		if (start.toDateString() === end.toDateString()) {
			return `${formatTime(start)} - ${formatTime(end)}`
		}
		
		// Different days: include date in format "3/9 06:30 - 4/9 19:32"
		const startFormatted = `${start.getDate()}/${start.getMonth() + 1} ${formatTime(start)}`
		const endFormatted = `${end.getDate()}/${end.getMonth() + 1} ${formatTime(end)}`
		
		return `${startFormatted} - ${endFormatted}`
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('nl-NL', {
			style: 'currency',
			currency: 'EUR'
		}).format(amount)
	}

	const handleLogout = async () => {
		try {
			await fetch('/api/user/logout', { method: 'POST' })
			setIsLoggedIn(false)
			setUser(null)
			router.push('/mijn/login')
		} catch (error) {
			console.error('Error logging out:', error)
		}
	}

	const getPreviousMonth = (yearmonth: string) => {
		const [year, month] = yearmonth.split('-').map(Number)
		const date = new Date(year, month - 1, 1)
		date.setMonth(date.getMonth() - 1)
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
	}

	const getNextMonth = (yearmonth: string) => {
		const [year, month] = yearmonth.split('-').map(Number)
		const date = new Date(year, month - 1, 1)
		date.setMonth(date.getMonth() + 1)
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
	}

	const formatMonthYear = (yearmonth: string) => {
		const [year, month] = yearmonth.split('-').map(Number)
		const date = new Date(year, month - 1, 1)
		return date.toLocaleDateString('nl-NL', {
			year: 'numeric',
			month: 'long'
		})
	}

	const handlePreviousMonth = () => {
		const prevMonth = getPreviousMonth(yearmonth)
		router.push(`/mijn/reserveringen/${prevMonth}`)
	}

	const handleNextMonth = () => {
		const nextMonth = getNextMonth(yearmonth)
		router.push(`/mijn/reserveringen/${nextMonth}`)
	}

	const isCurrentMonth = () => {
		const now = new Date()
		const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
		return yearmonth === currentYearMonth
	}

	const sidebarItems = getUserSidebarItems(`/mijn/reserveringen/${yearmonth}`, yearmonth)

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 dark:from-[#ea5c33]/10 dark:via-gray-900 dark:to-[#ea5c33]/10 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea5c33] mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-300">Laden...</p>
				</div>
			</div>
		)
	}

	if (!isLoggedIn || !user) {
		return null // Will redirect to login
	}

  console.log('reservations',reservations);

	return (
		<AdminLayout
			title="Deelauto Nijverhoek"
			sidebarItems={sidebarItems}
			onLogout={handleLogout}
		>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handlePreviousMonth}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:border-[#ea5c33] focus:outline-none focus:ring-2 focus:ring-[#ea5c33] transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Vorige maand</span>
        </button>
        {!isCurrentMonth() && (
          <button
            onClick={handleNextMonth}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:border-[#ea5c33] focus:outline-none focus:ring-2 focus:ring-[#ea5c33] transition-colors cursor-pointer"
          >
            <span>Volgende maand</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Reserveringen in {formatMonthYear(yearmonth)}
      </h2>

      <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <span className="font-medium">Tip:</span> geef optioneel per rit aan of het een privé-rit of zakelijke rit was. Standaard is elke rit privé, tenzij anders ingesteld.
          </div>
        </div>
      </div>

			{error && (
				<div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
					<div className="flex items-start space-x-2">
						<svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
						</svg>
						<div>{error}</div>
					</div>
				</div>
			)}

			{reservations.length === 0 ? (
				<div className="text-left py-12">
					<p className="text-gray-600 dark:text-gray-300">
						Geen reserveringen gevonden voor {formatMonthYear(yearmonth)}. De reserveringen worden pas rond de eerste week van de opvolgende maand hier getoond. Je reserveringen staan wel altijd actueel in de Deelauto app en op mijn.deelauto.nl
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{reservations.map((reservation) => (
						<div key={reservation._id?.toString()} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
							<div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 space-y-4 lg:space-y-0">
								<div className="flex-1">
									<div className="flex items-start space-x-3 mb-3">
										<svg className="w-6 h-6 text-[#ea5c33] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
										</svg>
										<div>
											<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
												{formatReservationDate(
													new Date(reservation.reservation_start),
													new Date(reservation.effective_end > reservation.reservation_end ? reservation.effective_end : reservation.reservation_end)
												)}
											</h3>
											<p className="text-sm text-gray-600 dark:text-gray-300">
												{formatTimeWithDate(
													new Date(reservation.reservation_start),
													new Date(reservation.effective_end > reservation.reservation_end ? reservation.effective_end : reservation.reservation_end)
												)}
											</p>
										</div>
									</div>
									<div className="space-y-1 text-gray-600 dark:text-gray-300">
                    {reservation.remarks && <p><i>{reservation.remarks}</i></p>}
										{reservation.priceScheme ? (
											<>
												<p>Huur: {formatCurrency(calculateTimeCosts(
													new Date(reservation.reservation_start),
													new Date(reservation.reservation_end),
													new Date(reservation.effective_start),
													new Date(reservation.effective_end),
													reservation.priceScheme
												))}<br />
                        <details className="text-xs text-gray-500 dark:text-gray-400">
                          <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                            Bekijk berekening
                          </summary>
                          <div className="mt-1 pl-2 border-l-2 border-gray-300 dark:border-gray-600">
                            {displayTimeCostsCalculation(
                              new Date(reservation.reservation_start),
                              new Date(reservation.reservation_end),
                              new Date(reservation.effective_start),
                              new Date(reservation.effective_end),
                              reservation.priceScheme
                            ).split('\n').map((line, index) => (
                              <div key={index} className="mb-1">{line}</div>
                            ))}
                          </div>
                        </details>
                        </p>
												<p>Kilometers: {reservation.kilometers_driven?.toFixed(2)} km = {formatCurrency(calculateKilometerCosts(
													reservation.kilometers_driven,
													reservation.priceScheme
												))}<br />
                        <details className="text-xs text-gray-500 dark:text-gray-400">
                          <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                            Bekijk berekening
                          </summary>
                          <div className="mt-1 pl-2 border-l-2 border-gray-300 dark:border-gray-600">
                            {displayKilometerCostsCalculation(
                              reservation.kilometers_driven,
                              reservation.priceScheme
                            )}
                          </div>
                        </details>
                        </p>
											</>
										) : <></>}
									</div>
								</div>
								<div className="flex flex-col items-end space-y-3">
									<div className="text-right">
										<p className="font-bold text-2xl text-gray-900 dark:text-gray-100">
											{formatCurrency(reservation.total_costs)}
										</p>
										<p className="text-sm text-gray-500 dark:text-gray-400">Totaal</p>
									</div>
									<div className="w-full sm:w-auto flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2">
										<button
											onClick={() => toggleBusinessStatus(reservation._id!.toString(), reservation.is_business_transaction || false)}
											disabled={updatingReservations.has(reservation._id!.toString())}
											className={`w-1/2 sm:w-auto px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
												reservation.is_business_transaction
													? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50'
													: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50'
											} ${updatingReservations.has(reservation._id!.toString()) ? 'opacity-75' : ''}`}
										>
											{updatingReservations.has(reservation._id!.toString()) ? (
												<>
													<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
													<span>Bezig...</span>
												</>
											) : (
												<>
													<span>{reservation.is_business_transaction ? '💼' : '🏠'}</span>
													<span>{reservation.is_business_transaction ? 'Zakelijk' : 'Privé'}</span>
												</>
											)}
										</button>
										{!isLoadingPayments && isReservationUnpaid(reservation) && (
											<button
												onClick={() => router.push('/mijn/betalingen')}
												className="w-1/2 sm:w-auto px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1 bg-[#ea5c33] hover:bg-[#ea5c33]/90 text-white shadow-lg hover:shadow-xl"
											>
												<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
													<path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zM6 8a2 2 0 012 2v2H6V8z" />
												</svg>
												<span>Naar betalen</span>
											</button>
										)}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</AdminLayout>
	)
}
