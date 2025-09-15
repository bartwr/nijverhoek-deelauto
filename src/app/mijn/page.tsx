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
			<div className="space-y-4">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
						Reserveringen
					</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						Bekijk je reserveringen per maand en markeer ze als zakelijk of privé.
					</p>
					<a
						href={`/mijn/reserveringen/${getPreviousMonth()}`}
						className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
					>
						Bekijk reserveringen
					</a>
				</div>
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
						Betalingen
					</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						Bekijk je betalingsgeschiedenis en openstaande facturen.
					</p>
					<a
						href="/mijn/betalingen"
						className="inline-block px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						Bekijk betalingen
					</a>
				</div>
			</div>
		</AdminLayout>
	)
}
