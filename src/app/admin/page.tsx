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
		} catch (error) {
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
				
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
						Bunq Status Synchronisatie
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
						Synchroniseer de bunq payment statussen met de database. Dit controleert alle openstaande betalingen bij bunq en werkt hun status bij.
					</p>
					
					<button
						onClick={handleSyncBunqStatuses}
						disabled={isSyncing}
						className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors cursor-pointer"
					>
						{isSyncing ? 'Synchroniseren...' : 'Synchroniseer Bunq Statussen'}
					</button>
					
					{syncMessage && (
						<div className={`mt-4 text-sm ${syncMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
							{syncMessage}
						</div>
					)}
				</div>
			</AdminLayout>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h1 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
						Deelauto Nijverhoek admin
					</h1>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleLogin}>
					<div>
						<label htmlFor="email" className="sr-only">
							Email address
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
							placeholder="Email address"
						/>
					</div>

					<div>
						<button
							type="submit"
							disabled={isLoading}
							className="
                group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                cursor-pointer
              "
						>
							{isLoading ? 'Mail wordt verstuurd...' : 'Log in'}
						</button>
					</div>

					{message && (
						<div className={`text-sm text-center ${message.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
							{message}
						</div>
					)}
				</form>
			</div>
		</div>
	)
}
