/**
 * Utility functions for device detection
 */

export interface DeviceInfo {
	isMobile: boolean
	isAndroid: boolean
	isIOS: boolean
	isDesktop: boolean
}

/**
 * Detects the current device type
 * @returns DeviceInfo object with device type flags
 */
export function detectDevice(): DeviceInfo {
	// Check if we're in a browser environment
	if (typeof window === 'undefined') {
		return {
			isMobile: false,
			isAndroid: false,
			isIOS: false,
			isDesktop: true
		}
	}

	const userAgent = navigator.userAgent.toLowerCase()
	
	const isAndroid = /android/.test(userAgent)
	const isIOS = /iphone|ipad|ipod/.test(userAgent)
	const isMobile = isAndroid || isIOS || /mobile|tablet/.test(userAgent)
	
	return {
		isMobile,
		isAndroid,
		isIOS,
		isDesktop: !isMobile
	}
}

/**
 * Gets the appropriate app link based on device type
 * @returns URL string for the appropriate platform
 */
export function getAppLink(): string {
	const device = detectDevice()
	
	if (device.isAndroid) {
		return 'https://play.google.com/store/apps/details?id=coop.themobilityfactory.deelauto&pli=1'
	}
	
	if (device.isIOS) {
		return 'https://apps.apple.com/nl/app/deelauto-nl/id6445947447'
	}
	
	// Default to web app for desktop and other devices
	return 'https://mijn.deelauto.nl/'
}
