'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { Payment } from '@/types/payment'
import { Reservation, User, PriceScheme } from '@/types/models'
import { getUserSidebarItems } from '@/lib/sidebar-utils'

interface AuthUser {
	email: string
	expiresAt: number
}

interface OutstandingReservations {
	[yearMonth: string]: Array<Reservation & { user: User; priceScheme?: PriceScheme }>
}

export default function BetalingenPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<AuthUser | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [completedPayments, setCompletedPayments] = useState<Payment[]>([])
	const [outstandingReservations, setOutstandingReservations] = useState<OutstandingReservations>({})
	const [isLoadingPayments, setIsLoadingPayments] = useState(true)
	const router = useRouter()

	useEffect(() => {
		checkAuthStatus()
	}, [])

	useEffect(() => {
		if (isLoggedIn) {
			fetchPaymentData()
		}
	}, [isLoggedIn])

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
		} finally {
			setIsLoading(false)
		}
	}

	const fetchPaymentData = async () => {
		try {
			setIsLoadingPayments(true)
			
			// Fetch completed payments and outstanding reservations in parallel
			const [paymentsResponse, reservationsResponse] = await Promise.all([
				fetch('/api/user/payments'),
				fetch('/api/user/outstanding-reservations')
			])

			if (paymentsResponse.ok) {
				const paymentsData = await paymentsResponse.json()
				setCompletedPayments(paymentsData.data || [])
			}

			if (reservationsResponse.ok) {
				const reservationsData = await reservationsResponse.json()
				setOutstandingReservations(reservationsData.data || {})
			}
		} catch (error) {
			console.error('Error fetching payment data:', error)
		} finally {
			setIsLoadingPayments(false)
		}
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

	const handlePayNow = async (yearMonth: string, reservations: Array<Reservation & { user: User; priceScheme?: PriceScheme }>) => {
		// Calculate total amount for this group
		const totalAmount = reservations.reduce((sum, reservation) => sum + reservation.total_costs, 0)
		const isBusiness = reservations.some(r => r.is_business_transaction)
		const transactionType = isBusiness ? 'zakelijke' : 'privé'
		const userName = reservations[0]?.user?.name || 'Onbekend'
		const userEmail = reservations[0]?.user?.email_address
		
		// Create payment request
		const paymentData = {
			title: `Deelauto Nijverhoek - ${yearMonth} - ${transactionType} - ${userName}`,
			description: `Betaling voor ${reservations.length} ${transactionType} reservering(en) in ${yearMonth}`,
			amount_in_euros: totalAmount,
			is_business_transaction: isBusiness,
			send_at: new Date().toISOString(),
			reservations_paid: reservations.map(r => r._id?.toString()).filter(Boolean),
			user_email: userEmail,
			create_bunq_request: true
		}

		try {
			const response = await fetch('/api/payments', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(paymentData)
			})

			if (response.ok) {
				const result = await response.json()
				const payment = result.data
				
				// Refresh the data
				await fetchPaymentData()
				
				// If bunq payment URL was created, redirect to it
				if (payment.bunq_payment_url) {
					// Open bunq payment link in new tab
					window.open(payment.bunq_payment_url, '_blank')
					alert('Betaling aangemaakt! Je wordt doorgestuurd naar de betalingspagina.')
				} else {
					alert('Betaling aangemaakt! Er kon geen automatische betalingslink worden gemaakt.')
				}
			} else {
				const errorData = await response.json()
				alert(`Fout bij aanmaken betaling: ${errorData.error}`)
			}
		} catch (error) {
			console.error('Error creating payment:', error)
			alert('Er is een fout opgetreden bij het aanmaken van de betaling.')
		}
	}

	const formatAmount = (amount: number) => {
		return `€${amount.toFixed(2)}`
	}

	const formatDate = (date: Date | string) => {
		const d = new Date(date)
		return d.toLocaleDateString('nl-NL', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		})
	}

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

	const sidebarItems = getUserSidebarItems('/mijn/betalingen')

  function getPreviousMonth() {
    const now = new Date()
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const year = previousMonth.getFullYear()
    const month = String(previousMonth.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

	return (
		<AdminLayout
			title="Deelauto Nijverhoek"
			sidebarItems={sidebarItems}
			onLogout={handleLogout}
		>
			<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
				Betalingen
			</h2>

			{isLoadingPayments ? (
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<span className="ml-2 text-gray-600 dark:text-gray-300">Betalingen laden...</span>
				</div>
			) : (
				<div className="space-y-8">
					{/* Openstaande acties */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
							Openstaande acties
						</h3>

						<div
							className="mb-6 p-4 rounded-md bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
							onClick={() => {
								window.location.href = '/mijn/reserveringen/' + getPreviousMonth()
							}}
							role="button"
							tabIndex={0}
						>
							<span className="font-medium">Tip:</span> klik <u>hier</u> om per reservering op te geven of het een privé-rit of zakelijke rit was, en kom daarna terug op deze pagina om zowel zakelijk als privé te betalen.
						</div>
						
						{Object.keys(outstandingReservations).length === 0 ? (
							<p className="text-gray-600 dark:text-gray-300">
								Geen openstaande betalingen gevonden.
							</p>
						) : (
							<div className="space-y-4">
								{Object.entries(outstandingReservations).map(([groupKey, reservations]) => {
									const totalAmount = reservations.reduce((sum, reservation) => sum + reservation.total_costs, 0)
									const isBusiness = reservations.some(r => r.is_business_transaction)
									
									// Extract year-month from group key (format: YYYY-MM-business or YYYY-MM-personal)
									const yearMonth = groupKey.split('-').slice(0, 2).join('-')
									
									return (
										<div key={groupKey} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
											<div className="flex justify-between items-start mb-2">
												<div>
													<h4 className="font-medium text-gray-900 dark:text-gray-100">
														Deelauto Nijverhoek - {yearMonth} - {reservations[0]?.user?.name || 'Onbekend'}
													</h4>
													<p className="text-sm text-gray-600 dark:text-gray-300">
														{isBusiness ? 'Zakelijk' : 'Privé'}
													</p>
												</div>
												<div className="text-right">
													<p className="font-semibold text-gray-900 dark:text-gray-100">
														{formatAmount(totalAmount)}
													</p>
													<p className="text-sm text-gray-600 dark:text-gray-300">
														{reservations.length} reservering(en)
													</p>
												</div>
											</div>
											<button
												onClick={() => handlePayNow(yearMonth, reservations)}
												className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors cursor-pointer"
											>
												Betaal nu
											</button>
										</div>
									)
								})}
							</div>
						)}
					</div>

					{/* Voltooide betalingen */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
							Voltooide betalingen
						</h3>
						
						{completedPayments.length === 0 ? (
							<p className="text-gray-600 dark:text-gray-300">
								Geen voltooide betalingen gevonden.
							</p>
						) : (
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
									<thead className="bg-gray-50 dark:bg-gray-700">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												Title
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												Bedrag
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												Zakelijk?
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												Bunq Status
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												Betaald op
											</th>
										</tr>
									</thead>
									<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
										{completedPayments.map((payment) => (
											<tr key={payment._id}>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
													{payment.title}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
													{formatAmount(payment.amount_in_euros)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
													{payment.is_business_transaction ? 'Ja' : 'Nee'}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
													{payment.bunq_status ? (
														<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
															payment.bunq_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
															payment.bunq_status === 'ACCEPTED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
															payment.bunq_status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
															'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
														}`}>
															{payment.bunq_status}
														</span>
													) : '-'}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
													{payment.paid_at ? formatDate(payment.paid_at) : '-'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			)}
		</AdminLayout>
	)
}
