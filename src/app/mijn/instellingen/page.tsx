'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { getUserSidebarItems } from '@/lib/sidebar-utils'

interface User {
	email: string
	expiresAt: number
}

interface UserSettings {
	use_bunq_user_request?: boolean
}

export default function InstellingenPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [settings, setSettings] = useState<UserSettings>({})
	const [isSaving, setIsSaving] = useState(false)
	const [saveMessage, setSaveMessage] = useState<string | null>(null)
	const router = useRouter()

	const fetchUserSettings = useCallback(async () => {
		try {
			const response = await fetch('/api/user/settings')
			if (response.ok) {
				const data = await response.json()
				setSettings(data.settings || {})
			}
		} catch (error) {
			console.error('Error fetching user settings:', error)
		}
	}, [])

	const checkAuthStatus = useCallback(async () => {
		try {
			const response = await fetch('/api/user/check-auth')
			if (response.ok) {
				const data = await response.json()
				if (data.isLoggedIn) {
					setIsLoggedIn(true)
					setUser(data.user)
					await fetchUserSettings()
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
	}, [router, fetchUserSettings])

	useEffect(() => {
		checkAuthStatus()
	}, [checkAuthStatus])

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

	const handleToggleChange = async (checked: boolean) => {
		setIsSaving(true)
		setSaveMessage(null)

		try {
			const response = await fetch('/api/user/settings', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					use_bunq_user_request: checked
				})
			})

			if (response.ok) {
				setSettings({ ...settings, use_bunq_user_request: checked })
				setSaveMessage('Instelling opgeslagen!')
				setTimeout(() => setSaveMessage(null), 3000)
			} else {
				setSaveMessage('Er is een fout opgetreden bij het opslaan.')
				setTimeout(() => setSaveMessage(null), 5000)
			}
		} catch (error) {
			console.error('Error saving settings:', error)
			setSaveMessage('Er is een fout opgetreden bij het opslaan.')
			setTimeout(() => setSaveMessage(null), 5000)
		} finally {
			setIsSaving(false)
		}
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

	const sidebarItems = getUserSidebarItems('/mijn/instellingen')

	return (
		<AdminLayout
			title="Instellingen"
			sidebarItems={sidebarItems}
			onLogout={handleLogout}
		>
			<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
				Instellingen
			</h2>

			<div className="space-y-6">
				{/* Bunq Payment Preference Setting */}
				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-2 mb-4">
						<svg className="w-6 h-6 text-[#ea5c33]" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
						</svg>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Betalingsvoorkeur
						</h3>
					</div>

					<div className="space-y-4">
						<div className="flex items-start space-x-4">
							<div className="flex items-center h-5 mt-1">
								<button
									type="button"
									className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ea5c33] focus:ring-offset-2 ${
										settings.use_bunq_user_request ? 'bg-[#ea5c33]' : 'bg-gray-200 dark:bg-gray-600'
									} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
									role="switch"
									aria-checked={settings.use_bunq_user_request || false}
									onClick={() => !isSaving && handleToggleChange(!settings.use_bunq_user_request)}
									disabled={isSaving}
								>
									<span className="sr-only">Bunq betalingsverzoek voorkeur</span>
									<span
										aria-hidden="true"
										className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
											settings.use_bunq_user_request ? 'translate-x-5' : 'translate-x-0'
										}`}
									/>
								</button>
							</div>
							<div className="flex-1">
								<label className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed cursor-pointer">
									Wil je een bunq request in je bunq-app ontvangen als je een bunq account hebt met je e-mailadres?
								</label>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
									{settings.use_bunq_user_request 
										? '✅ Je ontvangt betalingsverzoeken direct in je bunq app' 
										: '💳 Je krijgt een betalingslink om per iDEAL of andere methoden te betalen'
									}
								</p>
							</div>
						</div>

						{saveMessage && (
							<div className={`p-3 rounded-lg text-sm ${
								saveMessage.includes('opgeslagen') 
									? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
									: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
							}`}>
								{saveMessage}
							</div>
						)}

						{isSaving && (
							<div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ea5c33]"></div>
								<span>Instelling wordt opgeslagen...</span>
							</div>
						)}
					</div>
				</div>

				{/* Additional settings can be added here in the future
				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-2 mb-4">
						<svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
						</svg>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Meer instellingen
						</h3>
					</div>
					<p className="text-gray-600 dark:text-gray-300">
						Meer instellingen worden hier toegevoegd in toekomstige updates.
					</p>
				</div>*/}
			</div>
		</AdminLayout>
	)
}
