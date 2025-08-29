'use client'

import { useEffect, useState } from 'react'
import { registerServiceWorker } from '@/lib/sw-register'

// Define the type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstaller() {
	const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
	const [showInstallButton, setShowInstallButton] = useState(false)

	useEffect(() => {
		// Register service worker
		registerServiceWorker()

		// Listen for beforeinstallprompt event
		const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
			e.preventDefault()
			setDeferredPrompt(e)
			setShowInstallButton(true)
		}

		// Listen for appinstalled event
		const handleAppInstalled = () => {
			setShowInstallButton(false)
			setDeferredPrompt(null)
			console.log('PWA was installed')
		}

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
		window.addEventListener('appinstalled', handleAppInstalled)

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
			window.removeEventListener('appinstalled', handleAppInstalled)
		}
	}, [])

	const handleInstallClick = async () => {
		if (!deferredPrompt) return

		deferredPrompt.prompt()
		const { outcome } = await deferredPrompt.userChoice

		if (outcome === 'accepted') {
			console.log('User accepted the install prompt')
		} else {
			console.log('User dismissed the install prompt')
		}

		setDeferredPrompt(null)
		setShowInstallButton(false)
	}

	if (!showInstallButton) return null

	return (
		<div className="fixed bottom-4 right-4 z-50">
			<button
				onClick={handleInstallClick}
				className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
			>
				<svg
					className="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
					/>
				</svg>
				App installeren
			</button>
		</div>
	)
}
