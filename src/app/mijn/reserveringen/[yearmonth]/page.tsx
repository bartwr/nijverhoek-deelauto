'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { Reservation, User, PriceScheme } from '@/types/models'
import { displayTimeCostsCalculation, displayKilometerCostsCalculation, calculateKilometerCosts, calculateTimeCosts } from '@/lib/reservation-utils'

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

	const sidebarItems = [
		{ href: '/mijn', label: 'Start', isActive: false },
		{ href: `/mijn/reserveringen/${yearmonth}`, label: 'Reserveringen', isActive: true },
		{ href: '/mijn/betalingen', label: 'Betalingen', isActive: false }
	]

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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

      <div className="flex gap-2 mb-6">
        <button
          onClick={handlePreviousMonth}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
        >
          ← Vorige maand
        </button>
        <button
          onClick={handleNextMonth}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
        >
          Volgende maand →
        </button>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Reserveringen in {formatMonthYear(yearmonth)}
      </h2>

			{error && (
				<div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200">
					{error}
				</div>
			)}

			{reservations.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-gray-600 dark:text-gray-300">
						Geen reserveringen gevonden voor {formatMonthYear(yearmonth)}
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{reservations.map((reservation) => (
						<div key={reservation._id?.toString()} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
							<div className="flex justify-between items-start mb-4">
								<div className="flex-1">
									<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
										Rit van {formatTime(new Date(reservation.reservation_start))} tot {formatTime(new Date(reservation.effective_end > reservation.reservation_end ? reservation.effective_end : reservation.reservation_end))} op {formatDate(new Date(reservation.reservation_start))}
									</h3>
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
										<p className="font-semibold">Totaal: {formatCurrency(reservation.total_costs)}</p>
									</div>
								</div>
								<button
									onClick={() => toggleBusinessStatus(reservation._id!.toString(), reservation.is_business_transaction || false)}
									className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
										reservation.is_business_transaction
											? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
											: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
									}`}
								>
									{reservation.is_business_transaction ? 'Zakelijk' : 'Prive'}
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</AdminLayout>
	)
}
