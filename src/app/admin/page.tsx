'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'

interface AdminUser {
	email: string
	expiresAt: number
}

export default function AdminPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<AdminUser | null>(null)
	const [email, setEmail] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [syncMessage, setSyncMessage] = useState('')
	const [isSyncing, setIsSyncing] = useState(false)
	const [showEmailForm, setShowEmailForm] = useState(false)
	const [emailTo, setEmailTo] = useState('')
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
			const response = await fetch('/api/admin/check-auth');
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

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!email) return

		setIsLoading(true)
		setMessage('')

		try {
			const response = await fetch('/api/admin/send-login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			})

			const data = await response.json()

			if (response.ok) {
				setMessage('Controleer je mailbox voor een login-link')
				setEmail('')
			} else {
				setMessage(data.error || 'Failed to send login email')
			}
		} catch {
			setMessage('An error occurred. Please try again.')
		} finally {
			setIsLoading(false)
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

	const handleSyncBunqStatuses = async () => {
		setIsSyncing(true)
		setSyncMessage('')
		
		try {
			const response = await fetch('/api/payments/sync-bunq-status', {
				method: 'GET'
			})
			
			const data = await response.json()
			
			if (data.success) {
				setSyncMessage(`Success: ${data.message}`)
				if (data.errors && data.errors.length > 0) {
					setSyncMessage(prev => prev + ` (${data.errors.length} errors occurred)`)
				}
			} else {
				setSyncMessage(`Error: ${data.error || 'Failed to sync bunq statuses'}`)
			}
		} catch (error) {
			console.error('Error syncing bunq statuses:', error)
			setSyncMessage('Error: Failed to sync bunq statuses')
		} finally {
			setIsSyncing(false)
		}
	}

	const handleSendEmail = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!emailTo || !emailSubject || !emailBody) return

		setIsSendingEmail(true)
		setEmailMessage('')

		try {
			// Replace ${loginUrl} placeholder with actual URL
			const processedEmailBody = emailBody.replace(/\$\{loginUrl\}/g, 'https://auto.nijverhoek.nl/mijn/betalingen')

			const response = await fetch('/api/admin/send-monthly-email', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					to: emailTo,
					subject: emailSubject,
					html: processedEmailBody
				})
			})

			const data = await response.json()

			if (response.ok && data.success) {
				setEmailMessage('Email succesvol verzonden!')
				setShowEmailForm(false)
				setEmailTo('')
			} else {
				setEmailMessage(data.error || 'Failed to send email')
			}
		} catch (error) {
			console.error('Error sending email:', error)
			setEmailMessage('Er is een fout opgetreden bij het verzenden van de email')
		} finally {
			setIsSendingEmail(false)
		}
	}

	if (isLoggedIn && user) {
		const sidebarItems = [
			{ href: '/admin', label: 'Dashboard', isActive: true },
			{ href: '/admin/maandincasso', label: 'Maandincasso', isActive: false }
		]

		return (
			<AdminLayout
				title="Deelauto Nijverhoek admin"
				sidebarItems={sidebarItems}
				onLogout={handleLogout}
			>
				<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
					Hoi {user.email}
				</h2>
				<p className="text-gray-600 dark:text-gray-300 mb-6">
					Welkom bij het Deelauto Nijverhoek admin dashboard
				</p>
				
				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-2 mb-4">
						<svg className="w-6 h-6 text-[#ea5c33]" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
						</svg>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Bunq Status Synchronisatie
						</h3>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
						Synchroniseer de bunq payment statussen met de database. Dit controleert alle openstaande betalingen bij bunq en werkt hun status bij.
					</p>
					
					<button
						onClick={handleSyncBunqStatuses}
						disabled={isSyncing}
						className="inline-flex items-center space-x-2 px-6 py-3 bg-[#ea5c33] hover:bg-[#ea5c33]/90 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors cursor-pointer"
					>
						{isSyncing ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								<span>Synchroniseren...</span>
							</>
						) : (
							<>
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
								</svg>
								<span>Synchroniseer Bunq Statussen</span>
							</>
						)}
					</button>
					
					{syncMessage && (
						<div className={`mt-4 p-3 rounded-lg text-sm ${
							syncMessage.includes('Error') 
								? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
								: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
						}`}>
							{syncMessage}
						</div>
					)}
				</div>

				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mt-6">
					<div className="flex items-center space-x-2 mb-4">
						<svg className="w-6 h-6 text-[#ea5c33]" fill="currentColor" viewBox="0 0 20 20">
							<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
							<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
						</svg>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Zend maandmail
						</h3>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
						Zend een mail waarin je meldt dat er een nieuwe betaling klaar staat
					</p>
					
					{!showEmailForm ? (
						<button
							onClick={() => setShowEmailForm(true)}
							className="inline-flex items-center space-x-2 px-6 py-3 bg-[#ea5c33] hover:bg-[#ea5c33]/90 text-white font-medium rounded-lg transition-colors cursor-pointer"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
								<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
								<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
							</svg>
							<span>Zend mail</span>
						</button>
					) : (
						<form onSubmit={handleSendEmail} className="space-y-4">
							<div>
								<label htmlFor="emailTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									To address
								</label>
								<input
									id="emailTo"
									type="email"
									required
									value={emailTo}
									onChange={(e) => setEmailTo(e.target.value)}
									className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ea5c33] focus:border-[#ea5c33] transition-colors"
									placeholder="user@example.com"
								/>
							</div>

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
					)}
					
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
			</AdminLayout>
		)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 dark:from-[#ea5c33]/10 dark:via-gray-900 dark:to-[#ea5c33]/10 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-[#ea5c33] to-[#ea5c33] bg-clip-text text-transparent">
						Deelauto Nijverhoek
					</h1>
					<p className="text-gray-600 dark:text-gray-300 mt-2">
						Admin Dashboard
					</p>
				</div>
				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
					<form className="space-y-6" onSubmit={handleLogin}>
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Admin email adres
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ea5c33] focus:border-[#ea5c33] transition-colors"
								placeholder="admin@email.nl"
							/>
						</div>

						<div>
							<button
								type="submit"
								disabled={isLoading}
								className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#ea5c33] hover:bg-[#ea5c33]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ea5c33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
							>
								{isLoading ? 'Mail wordt verstuurd...' : 'Admin Login'}
							</button>
						</div>

						{message && (
							<div className={`text-sm text-center p-3 rounded-lg ${
								message.includes('error') 
									? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
									: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
							}`}>
								{message}
							</div>
						)}
					</form>
				</div>
			</div>
		</div>
	)
}
