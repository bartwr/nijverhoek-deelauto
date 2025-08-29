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
				// Use intent URL to try to open the app directly
				newAppLink = 'intent://mijn.deelauto.nl/#Intent;scheme=https;package=coop.themobilityfactory.deelauto;S.browser_fallback_url=https://play.google.com/store/apps/details?id=coop.themobilityfactory.deelauto;end'
			} else if (/iphone|ipad|ipod/.test(userAgent)) {
				newAppLink = 'https://apps.apple.com/nl/app/deelauto-nl/id6445947447'
			}
			
			setAppLink(newAppLink)
		}
		setIsLoading(false)
	}, [])

	/**
	 * Handle app link click with fallback for Android
	 */
	const handleAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if (typeof window !== 'undefined' && /android/.test(navigator.userAgent.toLowerCase())) {
			e.preventDefault()
			
			// Try to open the app using intent URL
			const intentUrl = 'intent://mijn.deelauto.nl/#Intent;scheme=https;package=coop.themobilityfactory.deelauto;S.browser_fallback_url=https://play.google.com/store/apps/details?id=coop.themobilityfactory.deelauto;end'
			
			// Create a hidden iframe to trigger the intent
			const iframe = document.createElement('iframe')
			iframe.style.display = 'none'
			iframe.src = intentUrl
			document.body.appendChild(iframe)
			
			// Remove the iframe after a short delay
			setTimeout(() => {
				document.body.removeChild(iframe)
			}, 100)
			
			// Fallback to Play Store after a delay if app doesn't open
			setTimeout(() => {
				window.location.href = 'https://play.google.com/store/apps/details?id=coop.themobilityfactory.deelauto'
			}, 2000)
		}
		// For other devices, let the default link behavior work
	}

	return { appLink, isLoading, handleAppClick }
}
