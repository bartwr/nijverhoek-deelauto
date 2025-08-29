'use client'

import { useState, useEffect } from 'react'

// Extend Navigator interface to include iOS-specific standalone property
interface NavigatorWithStandalone extends Navigator {
	standalone?: boolean
}

export interface PWAStatus {
	isInstalled: boolean
	isStandalone: boolean
	hasServiceWorker: boolean
	canInstall: boolean
}

/**
 * Custom hook that detects PWA installation status
 * @returns PWAStatus object with installation flags
 */
export function usePWAStatus(): PWAStatus {
	const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
		isInstalled: false,
		isStandalone: false,
		hasServiceWorker: false,
		canInstall: false,
	})

	useEffect(() => {
		// Check if app is installed
		const checkPWAStatus = () => {
			const isStandalone = window.matchMedia('(display-mode: standalone)').matches
			// navigator.standalone is iOS-specific, so we need to check if it exists
			const isInstalled = (navigator as NavigatorWithStandalone).standalone || isStandalone
			const hasServiceWorker = 'serviceWorker' in navigator
			const canInstall = 'BeforeInstallPromptEvent' in window

			setPwaStatus({
				isInstalled,
				isStandalone,
				hasServiceWorker,
				canInstall,
			})
		}

		checkPWAStatus()

		// Listen for display mode changes
		const mediaQuery = window.matchMedia('(display-mode: standalone)')
		mediaQuery.addEventListener('change', checkPWAStatus)

		return () => mediaQuery.removeEventListener('change', checkPWAStatus)
	}, [])

	return pwaStatus
}
