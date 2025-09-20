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
	const [paymentCooldowns, setPaymentCooldowns] = useState<{ [key: string]: number }>({})
	const router = useRouter()

	useEffect(() => {
		checkAuthStatus()
	}, [])

	useEffect(() => {
		if (isLoggedIn) {
      syncBunqStatus();
			fetchPaymentData()
		}
	}, [isLoggedIn])

	// Update cooldown timers every second
	useEffect(() => {
		const interval = setInterval(() => {
			setPaymentCooldowns(prev => {
				const now = Date.now()
				const updated = { ...prev }
				let hasChanges = false
				
				Object.keys(updated).forEach(key => {
					const timeDiff = now - updated[key]
					if (timeDiff >= 10 * 1000) { // 10 seconds
						delete updated[key]
						hasChanges = true
					}
				})
				
				return hasChanges ? updated : prev
			})
		}, 1000)
		
		return () => clearInterval(interval)
	}, [])

  const syncBunqStatus = async () => {
    try {
      const response = await fetch('/api/payments/sync-bunq-status')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.updated_count > 0) {
          // Refresh payment data if any payments were updated
          await fetchPaymentData()
        }
      }
    } catch (error) {
      console.error('Error syncing bunq status:', error)
    }
  }

	const checkAuthStatus = async () => {
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

	const getPaymentCooldownInfo = (groupKey: string) => {
		const lastClickTime = paymentCooldowns[groupKey]
		if (!lastClickTime) return { isOnCooldown: false, remainingSeconds: 0 }
		
		const now = Date.now()
		const timeDiff = now - lastClickTime
		const cooldownDuration = 10 * 1000 // 10 seconds
		
		if (timeDiff < cooldownDuration) {
			const remainingSeconds = Math.ceil((cooldownDuration - timeDiff) / 1000)
			return { isOnCooldown: true, remainingSeconds }
		}
		
		return { isOnCooldown: false, remainingSeconds: 0 }
	}

	const handlePayNow = async (yearMonth: string, reservations: Array<Reservation & { user: User; priceScheme?: PriceScheme }>) => {
		const isBusiness = reservations.some(r => r.is_business_transaction)
		const groupKey = `${yearMonth}-${isBusiness ? 'business' : 'personal'}`
		
		// Check if this payment group is on cooldown
		const { isOnCooldown, remainingSeconds } = getPaymentCooldownInfo(groupKey)
		if (isOnCooldown) {
			alert(`Je kunt pas over ${remainingSeconds} seconden opnieuw een betaling aanmaken.`)
			return
		}
		
		// Set cooldown for this payment group
		setPaymentCooldowns(prev => ({
			...prev,
			[groupKey]: Date.now()
		}))
		
		// Calculate total amount for this group
		const totalAmount = reservations.reduce((sum, reservation) => sum + reservation.total_costs, 0)
		const transactionType = isBusiness ? 'zakelijke' : 'privé'
		const userName = reservations[0]?.user?.name || 'Onbekend'
		const userEmail = reservations[0]?.user?.email_address
		
		// Format all reservation details
		const reservationDetails = reservations.map(reservation => formatReservationDetails(reservation)).join('\n\n')
		
		// Create payment request
		const paymentData = {
			title: `Deelauto Nijverhoek - ${yearMonth} - ${transactionType} - ${userName}`,
			description: `Betaling voor ${reservations.length} ${transactionType} reservering(en) in ${yearMonth}\n\n👤 ${userName}\n\n${reservationDetails}`,
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
				
				// Handle bunq payment based on whether URL was created
				if (payment.bunq_payment_url) {
					// Universal payment URL - open in new tab
					window.open(payment.bunq_payment_url, '_blank');
          
          // Sync bunq status after 60 seconds
          setTimeout(async () => {
            await syncBunqStatus()
          }, 60000)
					
					// Show appropriate message based on whether payment was reused
					if (result.message === 'Existing payment found and reused') {
						// Don't show alert for existing payment - just open the URL
						console.log('Reusing existing payment URL')
					} else {
						// alert('Betaling aangemaakt! Je wordt doorgestuurd naar de betalingspagina.')
					}
				} else if (payment.bunq_request_id) {
					// Direct bunq user request - no URL needed, user will see it in their bunq app
					alert('Betaling aangemaakt! Je ontvangt het betalingsverzoek direct in je bunq app.')
					
					// Sync bunq status after 30 seconds (faster for direct requests)
					setTimeout(async () => {
						await syncBunqStatus()
					}, 30000)
				} else {
					// No bunq integration
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

	const formatReservationDetails = (reservation: Reservation & { user: User; priceScheme?: PriceScheme }) => {
		const startDate = new Date(reservation.effective_start)
		const endDate = new Date(reservation.effective_end)
		
		// Format: DD/M HH:MM - HH:MM (XX km)
		const dayMonth = `${startDate.getDate()}/${startDate.getMonth() + 1}`
		const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
		const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
		
		let details = `🚗 ${dayMonth} ${startTime} - ${endTime} (${reservation.kilometers_driven} km)`
		
		if (reservation.remarks && reservation.remarks.trim()) {
			details += `\n🏷️ ${reservation.remarks.trim()}`
		}
		
		return details
	}

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
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea5c33]"></div>
					<span className="ml-2 text-gray-600 dark:text-gray-300">Betalingen laden...</span>
				</div>
			) : (
				<div className="space-y-8">
					{/* Openstaande acties */}
					<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
						<div className="flex items-center space-x-2 mb-6">
							<svg className="w-6 h-6 text-[#ea5c33]" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
							</svg>
							<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
								Openstaande acties
							</h3>
						</div>

						<div
							className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 transition-colors border border-blue-200 dark:border-blue-800"
						>
							<div className="flex items-start space-x-2">
								<svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
								</svg>
								<div>
									<span className="font-medium">Tip:</span> klik op <b>Details</b> om per reservering op te geven of het een privé-rit of zakelijke rit was, en kom daarna terug op deze pagina om zowel zakelijk als privé te betalen.
								</div>
							</div>
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
									
									// Check cooldown status for this payment group
									const { isOnCooldown, remainingSeconds } = getPaymentCooldownInfo(groupKey)
									
									return (
										<div key={groupKey} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80">
											<div className="flex justify-between items-start mb-4">
												<div className="flex-1">
													<h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
														Deelauto Nijverhoek - {yearMonth}
													</h4>
													<p className="text-gray-600 dark:text-gray-400 mb-1">
														{reservations[0]?.user?.name || 'Onbekend'}
													</p>
													<div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
														isBusiness 
															? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
															: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
													}`}>
														{isBusiness ? '💼 Zakelijk' : '🏠 Privé'}
													</div>
												</div>
												<div className="text-right ml-4">
													<p className="font-bold text-2xl text-gray-900 dark:text-gray-100">
														{formatAmount(totalAmount)}
													</p>
													<p className="text-sm text-gray-600 dark:text-gray-300">
														{reservations.length} reservering{reservations.length !== 1 ? 'en' : ''}
													</p>
												</div>
											</div>
                      <div className="flex justify-between items-center gap-4 ">
                        <button
                          onClick={() => router.push('/mijn/reserveringen/' + yearMonth)}
                          className="w-full flex-1 font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white cursor-pointer shadow-lg hover:shadow-xl"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Details</span>
                        </button>
                        <button
                          onClick={() => handlePayNow(yearMonth, reservations)}
                          disabled={isOnCooldown}
                          className={`w-full flex-2 font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                            isOnCooldown 
                              ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed' 
                              : 'bg-[#ea5c33] hover:bg-[#ea5c33]/90 text-white cursor-pointer shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {isOnCooldown ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-200"></div>
                              <span>
                                Betaal<span className="hidden sm:inline"> nu</span>... ({remainingSeconds}s)</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zM6 8a2 2 0 012 2v2H6V8z" />
                              </svg>
                              <span>Betaal<span className="hidden sm:inline"> nu</span></span>
                            </>
                          )}
                        </button>
                      </div>
										</div>
									)
								})}
							</div>
						)}
					</div>

					{/* Voltooide betalingen */}
					<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
						<div className="flex items-center space-x-2 mb-6">
							<svg className="w-6 h-6 text-[#ea5c33]" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
								Voltooide betalingen
							</h3>
						</div>
						
						{completedPayments.length === 0 ? (
							<p className="text-gray-600 dark:text-gray-300">
								Geen voltooide betalingen gevonden.
							</p>
						) : (
							<div className="space-y-4">
								{completedPayments.map((payment) => (
									<div key={payment._id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80">
										<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
											<div className="flex-1">
												<h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
													{payment.title}
												</h4>
												<div className="flex flex-wrap gap-2 text-sm">
													<div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
														payment.is_business_transaction 
															? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
															: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
													}`}>
														{payment.is_business_transaction ? '💼 Zakelijk' : '🏠 Privé'}
													</div>
													{payment.bunq_status && (
														<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
															payment.bunq_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' :
															payment.bunq_status === 'ACCEPTED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
															payment.bunq_status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
															'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
														}`}>
															{payment.bunq_status}
														</span>
													)}
												</div>
												{payment.paid_at && (
													<p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
														Betaald op: {formatDate(payment.paid_at)}
													</p>
												)}
											</div>
											<div className="text-right">
												<p className="font-bold text-xl text-gray-900 dark:text-gray-100">
													{formatAmount(payment.amount_in_euros)}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</AdminLayout>
	)
}
