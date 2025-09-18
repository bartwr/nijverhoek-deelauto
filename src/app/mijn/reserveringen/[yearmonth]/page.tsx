'use client'

import { useState, useEffect } from 'react'
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

export default function ReservationsPage() {
	const params = useParams()
	const router = useRouter()
	const yearmonth = params.yearmonth as string
	const [reservations, setReservations] = useState<ReservationWithUser[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<AuthUser | null>(null)

	useEffect(() => {
		checkAuthStatus()
	}, [])

	useEffect(() => {
		if (isLoggedIn) {
			fetchReservations()
		}
	}, [yearmonth, isLoggedIn])

	const checkAuthStatus = async () => {
		try {
			const response = await fetch('/api/user/check-auth')
			if (response.ok) {
				const data = await response.json()
				if (data.isLoggedIn) {
					setIsLoggedIn(true)
					setUser(data.user)
				} else {
					router.push('/mijn/login')
				}
			} else {
				router.push('/mijn/login')
			}
		} catch (error) {
			console.error('Error checking auth status:', error)
			router.push('/mijn/login')
		}
	}

	const fetchReservations = async () => {
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
	}

	const toggleBusinessStatus = async (reservationId: string, currentStatus: boolean) => {
		try {
			const response = await fetch(`/api/reservations/${reservationId}/business-status`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ is_business_transaction: !currentStatus })
			})

			const data = await response.json()

			if (data.success) {
				// Update the local state
				setReservations(prev => 
					prev.map(reservation => 
						reservation._id?.toString() === reservationId
							? { ...reservation, is_business_transaction: !currentStatus }
							: reservation
					)
				)
			} else {
				setError(data.error || 'Failed to update business status')
			}
		} catch (error) {
			setError('An error occurred while updating business status')
			console.error('Error updating business status:', error)
		}
	}

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString('nl-NL', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		})
	}

	const formatTime = (date: Date) => {
		return new Date(date).toLocaleTimeString('nl-NL', {
			hour: '2-digit',
			minute: '2-digit'
		})
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
					<p className="text-gray-600 dark:text-gray-300">Loading...</p>
				</div>
			</div>
		)
	}

	if (!isLoggedIn || !user) {
		return null // Will redirect to login
	}

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
												{formatDate(new Date(reservation.reservation_start))}
											</h3>
											<p className="text-sm text-gray-600 dark:text-gray-300">
												{formatTime(new Date(reservation.reservation_start))} - {formatTime(new Date(reservation.effective_end > reservation.reservation_end ? reservation.effective_end : reservation.reservation_end))}
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
                            )}
                          </div>
                        </details>
                        </p>
												<p>Kilometers: {reservation.kilometers_driven} km = {formatCurrency(calculateKilometerCosts(
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
									<button
										onClick={() => toggleBusinessStatus(reservation._id!.toString(), reservation.is_business_transaction || false)}
										className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
											reservation.is_business_transaction
												? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50'
												: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50'
										}`}
									>
										<span>{reservation.is_business_transaction ? '💼' : '🏠'}</span>
										<span>{reservation.is_business_transaction ? 'Zakelijk' : 'Privé'}</span>
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</AdminLayout>
	)
}
