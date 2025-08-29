'use client'

import { useDeviceLink } from '../lib/use-device-link'
import { useEffect, useState } from 'react'

export function AppLinkButton() {
	const { appLink, isLoading, handleAppClick } = useDeviceLink()
	const [isAndroid, setIsAndroid] = useState(false)

	useEffect(() => {
		if (typeof window !== 'undefined') {
			setIsAndroid(/android/.test(navigator.userAgent.toLowerCase()))
		}
	}, [])

	return (
		<a 
			href={appLink}
			target={isAndroid ? undefined : "_blank"}
			onClick={handleAppClick}
			className="block absolute -bottom-4 -right-4 bg-[#ea5c33] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg no-underline"
			aria-label={isLoading ? 'Open de app...' : 'Open de app'}
		>
			🚗 Open de app
		</a>
	)
}
