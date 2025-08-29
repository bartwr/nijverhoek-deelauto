'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook that provides the appropriate app link based on device type
 * @returns Object containing the app link, loading state, and click handler
 */
export function useDeviceLink() {
	const [appLink, setAppLink] = useState<string>('https://mijn.deelauto.nl/')
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		// Only run device detection on the client side
		if (typeof window !== 'undefined') {
			const userAgent = navigator.userAgent.toLowerCase()
			
			let newAppLink = 'https://mijn.deelauto.nl/' // default to web app
			
			if (/android/.test(userAgent)) {
				// Use intent URL without fallback to prevent Play Store redirects
				newAppLink = 'intent://mijn.deelauto.nl/#Intent;scheme=https;package=coop.themobilityfactory.deelauto;end'
			} else if (/iphone|ipad|ipod/.test(userAgent)) {
				newAppLink = 'https://apps.apple.com/nl/app/deelauto-nl/id6445947447'
			}
			
			setAppLink(newAppLink)
		}
		setIsLoading(false)
	}, [])

	/**
	 * Handle app link click with improved Android deep linking
	 */
	const handleAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if (typeof window !== 'undefined' && /android/.test(navigator.userAgent.toLowerCase())) {
			e.preventDefault()
			
			// Try to open the app using intent URL without fallback
			const intentUrl = 'intent://mijn.deelauto.nl/#Intent;scheme=https;package=coop.themobilityfactory.deelauto;end'
			
			// Use window.location.href for better Android compatibility
			// This prevents the Play Store fallback issue
			window.location.href = intentUrl
		}
		// For other devices, let the default link behavior work
	}

	return { appLink, isLoading, handleAppClick }
}
