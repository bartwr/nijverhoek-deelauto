'use client'

import { useState, useEffect } from 'react'

export function AppLinkButton() {
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

	return (
		<a 
			href={appLink}
      target="_blank"
			className="block absolute -bottom-4 -right-4 bg-[#ea5c33] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg no-underline"
			aria-label={isLoading ? 'Open de app...' : 'Open de app'}
		>
			🚗 Open de app
		</a>
	)
}
