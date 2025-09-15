'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'

interface User {
	email: string
	expiresAt: number
}

export default function BetalingenPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const router = useRouter()

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
		{ href: '/mijn', label: 'Start', isActive: false },
		{ href: '/mijn/reserveringen/2025-09', label: 'Reserveringen', isActive: false },
		{ href: '/mijn/betalingen', label: 'Betalingen', isActive: true }
	]

	return (
		<AdminLayout
			title="Deelauto Nijverhoek"
			sidebarItems={sidebarItems}
			onLogout={handleLogout}
		>
			<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
				Betalingen
			</h2>
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
				<p className="text-gray-600 dark:text-gray-300">
					Deze pagina is nog in ontwikkeling. Hier kun je straks je betalingsgeschiedenis bekijken.
				</p>
			</div>
		</AdminLayout>
	)
}
