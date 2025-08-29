'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook that provides the appropriate app link based on device type
 * @returns Object containing the app link and loading state
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
				newAppLink = 'https://play.google.com/store/apps/details?id=coop.themobilityfactory.deelauto&pli=1'
			} else if (/iphone|ipad|ipod/.test(userAgent)) {
				newAppLink = 'https://apps.apple.com/nl/app/deelauto-nl/id6445947447'
			}
			
			setAppLink(newAppLink)
		}
		setIsLoading(false)
	}, [])

	return { appLink, isLoading }
}
