'use client'

import { useDeviceLink } from '../lib/use-device-link'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

export function AppLinkButton() {
	const { appLink, isLoading, handleAppClick } = useDeviceLink()
	const [isAndroid, setIsAndroid] = useState(false)
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [isCheckingAuth, setIsCheckingAuth] = useState(true)

	useEffect(() => {
		if (typeof window !== 'undefined') {
			setIsAndroid(/android/.test(navigator.userAgent.toLowerCase()))
		}
	}, [])

	const checkAuthStatus = useCallback(async () => {
		try {
			const response = await fetch('/api/user/check-auth')
			if (response.ok) {
				const data = await response.json()
				if (data.isLoggedIn) {
					setIsLoggedIn(true)
				} else {
					setIsLoggedIn(false)
				}
			} else {
				setIsLoggedIn(false)
			}
		} catch (error) {
			console.error('Error checking auth status:', error)
			setIsLoggedIn(false)
		} finally {
			setIsCheckingAuth(false)
		}
	}, [])

	useEffect(() => {
		checkAuthStatus()
	}, [checkAuthStatus])

	if (isCheckingAuth) {
		return null // Don't show buttons while checking auth
	}

	return (
		<div className="absolute -bottom-4 -right-4 flex gap-2">
			{isLoggedIn && (
				<Link 
					href="/mijn/betalingen"
					className="block bg-[#3b82f6] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg no-underline cursor-pointer hover:bg-[#2563eb] transition-colors"
					aria-label="Mijn betalingen"
				>
					💳 Mijn betalingen
				</Link>
			)}
			<a 
				href={isAndroid ? undefined : appLink}
				target={isAndroid ? undefined : "_blank"}
				onClick={handleAppClick}
				className="block bg-[#ea5c33] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg no-underline cursor-pointer hover:bg-[#d14d2a] transition-colors"
				aria-label={isLoading ? 'Open de app...' : 'Open de app'}
			>
				🚗 Open de app
			</a>
		</div>
	)
}
