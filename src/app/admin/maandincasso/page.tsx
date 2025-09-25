'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import XLSXUploadComponent from '@/components/XLSXUploadComponent'
import ReservationTableComponent from '@/components/ReservationTableComponent'
import AdminLayout from '@/components/AdminLayout'
import { ProcessedReservationData } from '@/types/models'

interface AdminUser {
	email: string
	expiresAt: number
}

export default function MaandincassoPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<AdminUser | null>(null)
	const [currentStep, setCurrentStep] = useState<'upload' | 'review'>('upload')
	const [reservationData, setReservationData] = useState<ProcessedReservationData[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [savedUserIds, setSavedUserIds] = useState<string[]>([])
	const [showEmailForm, setShowEmailForm] = useState(false)
	const [emailSubject, setEmailSubject] = useState('Deelauto Nijverhoek - Maand september 2025')
	const [emailBody, setEmailBody] = useState(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
		<h1 style="color: #f97316;">Deelauto Nijverhoek - September 2025</h1>
		<p>Er staat een nieuw betaalverzoek voor je klaar voor september 2025.</p>
		<div style="margin: 30px 0;">
			<a href="\${loginUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Open betaaloverzicht</a>
		</div>
<img src="https://auto.nijverhoek.nl/_next/image?url=%2Fladiedada.webp&w=1200&q=75" alt="Lekker cruisen animatie" />
	</div>
</body>
</html>`)
	const [emailMessage, setEmailMessage] = useState('')
	const [isSendingEmail, setIsSendingEmail] = useState(false)
	const router = useRouter()

	useEffect(() => {
		// Check if user is logged in on component mount
		checkAuthStatus()
	}, [])

	const checkAuthStatus = async () => {
		try {
			const response = await fetch('/api/admin/check-auth')
			if (response.ok) {
				const data = await response.json()
				if (data.isLoggedIn) {
					setIsLoggedIn(true)
					setUser(data.user)
				}
			}
		} catch (error) {
			console.error('Error checking auth status:', error)
		}
	}

	const handleLogout = async () => {
		try {
			await fetch('/api/admin/logout', { method: 'POST' })
			setIsLoggedIn(false)
			setUser(null)
			router.push('/admin')
		} catch (error) {
			console.error('Error logging out:', error)
		}
	}

	const handleFileUpload = (data: ProcessedReservationData[]) => {
		setReservationData(data)
		setCurrentStep('review')
	}

	const handleSaveReservations = async (editedData: ProcessedReservationData[]) => {
		setIsLoading(true)
		setMessage('')

		try {
			const response = await fetch('/api/admin/save-reservations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ reservations: editedData })
			})

			const data = await response.json()

			if (response.ok) {
				setMessage('Reserveringen succesvol opgeslagen!')
				setSavedUserIds(data.userIds || [])
				setCurrentStep('upload')
				setReservationData([])
			} else {
				setMessage(data.error || 'Fout bij opslaan van reserveringen')
			}
		} catch {
			setMessage('Er is een fout opgetreden. Probeer het opnieuw.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleBackToUpload = () => {
		setCurrentStep('upload')
		setReservationData([])
		setMessage('')
		setSavedUserIds([])
		setShowEmailForm(false)
		setEmailMessage('')
	}

	const handleSendEmail = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!emailSubject || !emailBody || savedUserIds.length === 0) return

		setIsSendingEmail(true)
		setEmailMessage('')

		try {
			const response = await fetch('/api/admin/send-monthly-email-to-users', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userIds: savedUserIds,
					subject: emailSubject,
					html: emailBody
				})
			})

			const data = await response.json()

			if (response.ok && data.success) {
				setMessage('Emails succesvol verzonden!');
    		setSavedUserIds([]);
				setEmailMessage(data.message)
				setShowEmailForm(false)
			} else {
				setEmailMessage(data.error || 'Failed to send emails')
			}
		} catch (error) {
			console.error('Error sending emails:', error)
			setEmailMessage('Er is een fout opgetreden bij het verzenden van de emails')
		} finally {
			setIsSendingEmail(false)
		}
	}

	if (!isLoggedIn || !user) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 dark:from-[#ea5c33]/10 dark:via-gray-900 dark:to-[#ea5c33]/10 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea5c33] mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-300">Laden...</p>
				</div>
			</div>
		)
	}

	const sidebarItems = [
		{ href: '/admin', label: 'Dashboard', isActive: false },
		{ href: '/admin/maandincasso', label: 'Maandincasso', isActive: true }
	]

	return (
		<AdminLayout
			title="Deelauto Nijverhoek admin"
			sidebarItems={sidebarItems}
			onLogout={handleLogout}
		>
			<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
				Stuur maandelijkse betaallinks
			</h2>

			{message && (
				<div className={`mb-6 p-4 rounded-lg border ${
					message.includes('succesvol') || message.includes('success')
						? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
						: 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
				}`}>
					<div className="flex items-start space-x-2">
						<svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
							message.includes('succesvol') || message.includes('success')
								? 'text-green-600 dark:text-green-400'
								: 'text-red-600 dark:text-red-400'
						}`} fill="currentColor" viewBox="0 0 20 20">
							{message.includes('succesvol') || message.includes('success') ? (
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							) : (
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
							)}
						</svg>
						<div>{message}</div>
					</div>

					{message.includes('succesvol') && savedUserIds.length > 0 && (
						<div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
							<button
								onClick={() => setShowEmailForm(true)}
								className="inline-flex items-center space-x-2 px-4 py-2 bg-[#ea5c33] hover:bg-[#ea5c33]/90 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
							>
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
									<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
								</svg>
								<span>Zend maandmails aan gebruikers</span>
							</button>
						</div>
					)}
				</div>
			)}

      {showEmailForm && savedUserIds.length > 0 && (
				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mt-6">
					<div className="flex items-center space-x-2 mb-4">
						<svg className="w-6 h-6 text-[#ea5c33]" fill="currentColor" viewBox="0 0 20 20">
							<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
							<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
						</svg>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Zend maandmail aan gebruikers
						</h3>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
						Zend een mail naar alle gebruikers van de zojuist opgeslagen reserveringen ({savedUserIds.length} gebruikers)
					</p>
					
					<form onSubmit={handleSendEmail} className="space-y-4">
						<div>
							<label htmlFor="emailSubject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Onderwerp
							</label>
							<input
								id="emailSubject"
								type="text"
								required
								value={emailSubject}
								onChange={(e) => setEmailSubject(e.target.value)}
								className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ea5c33] focus:border-[#ea5c33] transition-colors"
							/>
						</div>

						<div>
							<label htmlFor="emailBody" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Email body HTML
							</label>
							<textarea
								id="emailBody"
								required
								rows={12}
								value={emailBody}
								onChange={(e) => setEmailBody(e.target.value)}
								className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ea5c33] focus:border-[#ea5c33] transition-colors font-mono text-sm"
							/>
						</div>

						<div className="flex space-x-3">
							<button
								type="submit"
								disabled={isSendingEmail}
								className="inline-flex items-center space-x-2 px-6 py-3 bg-[#ea5c33] hover:bg-[#ea5c33]/90 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors cursor-pointer"
							>
								{isSendingEmail ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										<span>Verzenden...</span>
									</>
								) : (
									<>
										<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
											<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
											<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
										</svg>
										<span>Verzend</span>
									</>
								)}
							</button>
							<button
								type="button"
								onClick={() => {
									setShowEmailForm(false)
									setEmailMessage('')
								}}
								className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors cursor-pointer"
							>
								Annuleer
							</button>
						</div>
					</form>
					
					{emailMessage && (
						<div className={`mt-4 p-3 rounded-lg text-sm ${
							emailMessage.includes('Error') || emailMessage.includes('fout')
								? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
								: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
						}`}>
							{emailMessage}
						</div>
					)}
				</div>
			)}

			{currentStep === 'upload' && (
				<XLSXUploadComponent onFileUpload={handleFileUpload} />
			)}

			{currentStep === 'review' && (
				<ReservationTableComponent
					data={reservationData}
					onSave={handleSaveReservations}
					onBack={handleBackToUpload}
					isLoading={isLoading}
				/>
			)}

		</AdminLayout>
	)
}
