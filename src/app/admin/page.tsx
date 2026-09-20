'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'

interface AdminUser {
	email: string
	expiresAt: number
}

interface ReservationFeedStatus {
	success: boolean
	feedUrl: string | null
	reservationCount?: number
	generatedAt?: string
	firstStart?: string | null
	lastEnd?: string | null
	error?: string
}

interface BunqAccountSummary {
	id: number
	type: string
	description: string
	iban: string | null
	status: string
}

interface BunqStatus {
	success: boolean
	config: {
		hasClientId: boolean
		hasClientSecret: boolean
		hasAccessToken: boolean
		hasInstallationToken: boolean
		hasPrivateKey: boolean
		configuredAccountId: string | null
		isSandbox: boolean
	}
	redirectUri: string
	connection?: {
		userId: number
		pinnedAccount: BunqAccountSummary
		grantedAccounts: BunqAccountSummary[]
	}
	error?: string
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
	const [emailSubject, setEmailSubject] = useState('Deelauto Nijverhoek - Maand september 2026')
	const [emailBody, setEmailBody] = useState(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
		<h1 style="color: #f97316;">Deelauto Nijverhoek - September 2026</h1>
		<p>Er staat een nieuw betaalverzoek voor je klaar voor september 2026.</p>
		<div style="margin: 30px 0;">
			<a href="\${loginUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Open betaaloverzicht</a>
		</div>
<img src="https://auto.nijverhoek.nl/_next/image?url=%2Fladiedada.webp&w=1200&q=75" alt="Lekker cruisen animatie" />
	</div>
</body>
</html>`)
	const [emailMessage, setEmailMessage] = useState('')
	const [isSendingEmail, setIsSendingEmail] = useState(false)
	const [feedStatus, setFeedStatus] = useState<ReservationFeedStatus | null>(null)
	const [isCheckingFeed, setIsCheckingFeed] = useState(false)
	const [isFeedUrlCopied, setIsFeedUrlCopied] = useState(false)
	const [bunqStatus, setBunqStatus] = useState<BunqStatus | null>(null)
	const [isCheckingBunq, setIsCheckingBunq] = useState(false)
	const [isRegisteringIp, setIsRegisteringIp] = useState(false)
	const [registerIpMessage, setRegisterIpMessage] = useState('')
	const [newInstallationToken, setNewInstallationToken] = useState<string | null>(null)
	const router = useRouter()

	useEffect(() => {
		// Check if user is logged in on component mount
		checkAuthStatus()
	}, [])

	const loadFeedStatus = useCallback(async (forceRefresh = false) => {
		setIsCheckingFeed(true)

		try {
			const response = await fetch(
				`/api/admin/reservation-feed${forceRefresh ? '?refresh=1' : ''}`
			)

			if (!response.ok) {
				setFeedStatus({
					success: false,
					feedUrl: null,
					error: 'Kon de feedstatus niet ophalen'
				})
				return
			}

			setFeedStatus(await response.json())
		} catch (error) {
			console.error('Error loading reservation feed status:', error)
			setFeedStatus({
				success: false,
				feedUrl: null,
				error: 'Kon de feedstatus niet ophalen'
			})
		} finally {
			setIsCheckingFeed(false)
		}
	}, [])

	const loadBunqStatus = useCallback(async () => {
		setIsCheckingBunq(true)

		try {
			const response = await fetch('/api/admin/bunq/status')
			const data = await response.json() as BunqStatus

			if (!response.ok) {
				setBunqStatus({
					...data,
					success: false,
					error: data.error || 'Kon de bunq-status niet ophalen'
				})
				return
			}

			setBunqStatus(data)
		} catch (error) {
			console.error('Error loading bunq status:', error)
			setBunqStatus(null)
		} finally {
			setIsCheckingBunq(false)
		}
	}, [])

	useEffect(() => {
		if (isLoggedIn) {
			loadFeedStatus()
			loadBunqStatus()
		}
	}, [isLoggedIn, loadFeedStatus, loadBunqStatus])

	const handleRegisterServerIp = async () => {
		setIsRegisteringIp(true)
		setRegisterIpMessage('')
		setNewInstallationToken(null)

		try {
			const response = await fetch('/api/bunq/register-ip', { method: 'POST' })
			const data = await response.json()

			if (response.ok && data.success) {
				if (data.newInstallationToken) {
					setNewInstallationToken(data.newInstallationToken)
					setRegisterIpMessage(
						`Server-IP ${data.ipAddress} geregistreerd op een nieuwe bunq-installatie. ` +
						'Zet het token hieronder als BUNQ_INSTALLATION_RESPONSE_TOKEN en deploy opnieuw.'
					)
				} else {
					setRegisterIpMessage(`Server-IP ${data.ipAddress} geregistreerd bij bunq`)
					await loadBunqStatus()
				}
			} else {
				setRegisterIpMessage(`Error: ${data.message || data.error || 'IP-registratie mislukt'}`)
			}
		} catch (error) {
			console.error('Error registering server IP:', error)
			setRegisterIpMessage('Error: IP-registratie mislukt')
		} finally {
			setIsRegisteringIp(false)
		}
	}

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

	const handleCopyFeedUrl = async () => {
		if (!feedStatus?.feedUrl) return

		try {
			await navigator.clipboard.writeText(feedStatus.feedUrl)
			setIsFeedUrlCopied(true)
			setTimeout(() => setIsFeedUrlCopied(false), 2000)
		} catch (error) {
			console.error('Error copying feed URL:', error)
		}
	}

	const formatFeedDate = (value: string | null | undefined): string => {
		if (!value) return '-'

		return new Date(value).toLocaleString('nl-NL', {
			timeZone: 'Europe/Amsterdam',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
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
			{ href: '/stats', label: 'Jaaroverzicht', isActive: false },
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
							<path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
						</svg>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Bunq-koppeling
						</h3>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
						De app gebruikt een bunq OAuth-token dat alleen toegang heeft tot de geselecteerde
						rekening en geen geld naar derden kan overmaken. Koppel het account eenmalig via
						de bunq-app; het token zet je daarna als omgevingsvariabele.
					</p>

					{bunqStatus && (
						<dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
							<div>
								<dt className="text-gray-500 dark:text-gray-400">OAuth-client (id + secret)</dt>
								<dd className="text-gray-900 dark:text-gray-100 font-medium">
									{bunqStatus.config.hasClientId && bunqStatus.config.hasClientSecret ? 'Ingesteld' : 'Ontbreekt'}
								</dd>
							</div>
							<div>
								<dt className="text-gray-500 dark:text-gray-400">Access token</dt>
								<dd className="text-gray-900 dark:text-gray-100 font-medium">
									{bunqStatus.config.hasAccessToken ? 'Ingesteld' : 'Ontbreekt'}
									{bunqStatus.config.isSandbox ? ' (sandbox)' : ''}
								</dd>
							</div>
							<div>
								<dt className="text-gray-500 dark:text-gray-400">Vastgezette rekening</dt>
								<dd className="text-gray-900 dark:text-gray-100 font-medium">
									{bunqStatus.connection
										? `${bunqStatus.connection.pinnedAccount.description || 'Rekening'} (#${bunqStatus.connection.pinnedAccount.id}${bunqStatus.connection.pinnedAccount.iban ? `, ${bunqStatus.connection.pinnedAccount.iban}` : ''})`
										: bunqStatus.config.configuredAccountId
											? `#${bunqStatus.config.configuredAccountId} (niet geverifieerd)`
											: '-'}
								</dd>
							</div>
							<div>
								<dt className="text-gray-500 dark:text-gray-400">Rekeningen in de OAuth-toestemming</dt>
								<dd className="text-gray-900 dark:text-gray-100 font-medium">
									{bunqStatus.connection
										? bunqStatus.connection.grantedAccounts.map(account => `#${account.id}`).join(', ')
										: '-'}
								</dd>
							</div>
							<div className="sm:col-span-2">
								<dt className="text-gray-500 dark:text-gray-400">Redirect-URL voor de OAuth-client in de bunq-app</dt>
								<dd className="text-gray-900 dark:text-gray-100 font-mono text-xs break-all">{bunqStatus.redirectUri}</dd>
							</div>
						</dl>
					)}

					<div className="flex flex-col sm:flex-row gap-2">
						<a
							href="/api/admin/bunq/oauth/start"
							className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-[#ea5c33] hover:bg-[#ea5c33]/90 text-white font-medium rounded-lg transition-colors cursor-pointer"
						>
							<span>Koppel bunq-account</span>
						</a>
						<button
							type="button"
							onClick={handleRegisterServerIp}
							disabled={isRegisteringIp || !bunqStatus?.config.hasAccessToken}
							className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors cursor-pointer"
						>
							{isRegisteringIp ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									<span>Registreren...</span>
								</>
							) : (
								<span>Registreer server-IP</span>
							)}
						</button>
						<button
							type="button"
							onClick={loadBunqStatus}
							disabled={isCheckingBunq}
							className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors cursor-pointer"
						>
							{isCheckingBunq ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									<span>Controleren...</span>
								</>
							) : (
								<span>Test verbinding</span>
							)}
						</button>
					</div>

					{registerIpMessage && (
						<div className={`mt-4 p-3 rounded-lg text-sm ${
							registerIpMessage.startsWith('Error')
								? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
								: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
						}`}>
							{registerIpMessage}
						</div>
					)}

					{newInstallationToken && (
						<div className="mt-4">
							<label htmlFor="newInstallationToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Nieuw BUNQ_INSTALLATION_RESPONSE_TOKEN (wordt maar één keer getoond)
							</label>
							<textarea
								id="newInstallationToken"
								readOnly
								rows={3}
								value={newInstallationToken}
								className="w-full rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 font-mono text-xs break-all"
							/>
							<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
								Zolang de oude installatietoken in de omgeving staat, mislukt &quot;Test verbinding&quot; nog.
							</p>
						</div>
					)}

					{bunqStatus && !bunqStatus.success && bunqStatus.error && (
						<div className="mt-4 p-3 rounded-lg text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
							{bunqStatus.error}
						</div>
					)}

					{bunqStatus?.success && (
						<div className="mt-4 p-3 rounded-lg text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
							Verbinding met bunq werkt; betaalverzoeken worden aangemaakt op rekening #{bunqStatus.connection?.pinnedAccount.id}
						</div>
					)}
				</div>

				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 mt-6">
					<div className="flex items-center space-x-2 mb-4">
						<svg className="w-6 h-6 text-[#ea5c33]" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
						</svg>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Agenda-feed reserveringen
						</h3>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
						Abonneer je agenda op deze link om alle reserveringen van de deelauto te zien. De reserveringen komen live uit de Deelauto (TMF) API.
					</p>

					{feedStatus?.feedUrl && (
						<div className="mb-4">
							<label htmlFor="feedUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Feed-URL (deel alleen met mede-gebruikers)
							</label>
							<div className="flex flex-col sm:flex-row gap-2">
								<input
									id="feedUrl"
									type="text"
									readOnly
									value={feedStatus.feedUrl}
									className="flex-1 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 font-mono text-xs"
								/>
								<button
									type="button"
									onClick={handleCopyFeedUrl}
									className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
								>
									{isFeedUrlCopied ? 'Gekopieerd' : 'Kopieer'}
								</button>
							</div>
						</div>
					)}

					{feedStatus?.success && (
						<dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
							<div>
								<dt className="text-gray-500 dark:text-gray-400">Reserveringen</dt>
								<dd className="text-gray-900 dark:text-gray-100 font-medium">{feedStatus.reservationCount}</dd>
							</div>
							<div>
								<dt className="text-gray-500 dark:text-gray-400">Eerste start</dt>
								<dd className="text-gray-900 dark:text-gray-100 font-medium">{formatFeedDate(feedStatus.firstStart)}</dd>
							</div>
							<div>
								<dt className="text-gray-500 dark:text-gray-400">Laatste einde</dt>
								<dd className="text-gray-900 dark:text-gray-100 font-medium">{formatFeedDate(feedStatus.lastEnd)}</dd>
							</div>
						</dl>
					)}

					<button
						onClick={() => loadFeedStatus(true)}
						disabled={isCheckingFeed}
						className="inline-flex items-center space-x-2 px-6 py-3 bg-[#ea5c33] hover:bg-[#ea5c33]/90 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors cursor-pointer"
					>
						{isCheckingFeed ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								<span>Controleren...</span>
							</>
						) : (
							<span>Test verbinding</span>
						)}
					</button>

					{feedStatus && !feedStatus.success && feedStatus.error && (
						<div className="mt-4 p-3 rounded-lg text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
							{feedStatus.error}
						</div>
					)}

					{feedStatus?.success && feedStatus.generatedAt && (
						<div className="mt-4 p-3 rounded-lg text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
							Feed bijgewerkt op {formatFeedDate(feedStatus.generatedAt)}
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
