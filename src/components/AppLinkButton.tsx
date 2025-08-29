'use client'

import { useDeviceLink } from '../lib/use-device-link'

export function AppLinkButton() {
	const { appLink, isLoading, handleAppClick } = useDeviceLink()

	return (
		<a 
			href={appLink}
			target="_blank"
			onClick={handleAppClick}
			className="block absolute -bottom-4 -right-4 bg-[#ea5c33] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg no-underline"
			aria-label={isLoading ? 'Open de app...' : 'Open de app'}
		>
			🚗 Open de app
		</a>
	)
}
