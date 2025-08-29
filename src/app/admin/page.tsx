'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
				setMessage('Check your email for a login link!')
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

	if (isLoggedIn && user) {
		return (
					<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Topbar */}
			<header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Deelauto Nijverhoek admin
						</h1>
						<button
							onClick={handleLogout}
							className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
						>
							Logout
						</button>
					</div>
				</div>
			</header>

			<div className="flex">
				{/* Left Sidebar */}
				<aside className="w-64 bg-white dark:bg-gray-800 shadow-sm min-h-screen">
					<nav className="mt-8">
						<div className="px-4 space-y-2">
							<a
								href="#"
								className="block px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 rounded-md"
							>
								Dashboard
							</a>
							<a
								href="#"
								className="block px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
							>
								Maandincasso
							</a>
						</div>
					</nav>
				</aside>

				{/* Main Content */}
				<main className="flex-1 p-8">
					<div className="max-w-4xl">
						<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
							Hi there
						</h2>
						<p className="text-gray-600 dark:text-gray-300">
							Welcome to the admin dashboard. You are logged in as {user.email}
						</p>
					</div>
				</main>
			</div>
		</div>
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
							className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isLoading ? 'Sending...' : 'Log in'}
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
