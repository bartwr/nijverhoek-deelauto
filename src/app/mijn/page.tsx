'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'

interface User {
	email: string
	expiresAt: number
}

export default function MijnStartPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const router = useRouter()

	// Function to get previous month in YYYY-MM format
	const getPreviousMonth = () => {
		const now = new Date()
		const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
		const year = previousMonth.getFullYear()
		const month = String(previousMonth.getMonth() + 1).padStart(2, '0')
		return `${year}-${month}`
	}

	useEffect(() => {
		checkAuthStatus()
	}, [])

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

	const sidebarItems = [
		{ href: '/mijn', label: 'Start', isActive: true },
		{ href: `/mijn/reserveringen/${getPreviousMonth()}`, label: 'Reserveringen', isActive: false },
		{ href: '/mijn/betalingen', label: 'Betalingen', isActive: false }
	]

	return (
		<AdminLayout
			title="Deelauto Nijverhoek"
			sidebarItems={sidebarItems}
			onLogout={handleLogout}
		>
			<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
				Welkom bij Mijn Deelauto
			</h2>
			<p className="text-gray-600 dark:text-gray-300 mb-4">
				Hoi {user.email}! Hier kun je je reserveringen bekijken en beheren.
			</p>
			<div className="space-y-6">
				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-2 mb-3">
						<svg className="w-6 h-6 text-[#ea5c33]" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
						</svg>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Reserveringen
						</h3>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
						Bekijk je reserveringen per maand en markeer ze als zakelijk of privé.
					</p>
					<a
						href={`/mijn/reserveringen/${getPreviousMonth()}`}
						className="inline-flex items-center space-x-2 px-6 py-3 bg-[#ea5c33] text-white rounded-lg hover:bg-[#ea5c33]/90 transition-colors cursor-pointer font-medium"
					>
						<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
						</svg>
						<span>Bekijk reserveringen</span>
					</a>
				</div>
				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-2 mb-3">
						<svg className="w-6 h-6 text-[#ea5c33]" fill="currentColor" viewBox="0 0 20 20">
							<path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zM6 8a2 2 0 012 2v2H6V8z" />
						</svg>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Betalingen
						</h3>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
						Bekijk je betalingsgeschiedenis en openstaande facturen.
					</p>
					<a
						href="/mijn/betalingen"
						className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer font-medium"
					>
						<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
						</svg>
						<span>Bekijk betalingen</span>
					</a>
				</div>
			</div>
		</AdminLayout>
	)
}
