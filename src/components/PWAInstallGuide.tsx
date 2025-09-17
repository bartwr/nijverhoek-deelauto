'use client'

import { useState } from 'react'
import { usePWAStatus } from '@/lib/use-pwa-status'
import { detectDevice } from '@/lib/device-utils'

export function PWAInstallGuide() {
	const [isOpen, setIsOpen] = useState(false)
	const { isInstalled } = usePWAStatus()
	const deviceInfo = detectDevice()

	// Don't show the button if PWA is already installed or if not on mobile
	if (isInstalled || !deviceInfo.isMobile) {
		return null
	}

	return (
		<>
			<button
				onClick={() => setIsOpen(true)}
				className="fixed bottom-4 left-4 z-50 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors cursor-pointer"
				title="Hoe installeer ik de app?"
			>
				<svg
					className="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</button>

			{isOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
						<div className="p-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-bold text-gray-900">
									App installeren op je telefoon
								</h2>
							<button
								onClick={() => setIsOpen(false)}
								className="text-gray-400 hover:text-gray-600 cursor-pointer"
							>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<h3 className="font-semibold text-gray-900 mb-2">📱 Android (Chrome)</h3>
									<ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
										<li>Open de website in Chrome</li>
										<li>Tap op het menu (drie puntjes)</li>
										<li>Kies &quot;Toevoegen aan startscherm&quot;</li>
										<li>Bevestig de installatie</li>
									</ol>
								</div>

								<div>
									<h3 className="font-semibold text-gray-900 mb-2">🍎 iPhone (Safari)</h3>
									<ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
										<li>Open de website in Safari</li>
										<li>Tap op de deel-knop (vierkant met pijl)</li>
										<li>Kies &quot;Zet op beginscherm&quot;</li>
										<li>Bevestig de installatie</li>
									</ol>
								</div>

								<div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
									<p className="text-sm text-orange-800">
										💡 <strong>Tip:</strong> Na installatie verschijnt de app als een gewone app op je startscherm!
									</p>
								</div>
							</div>

						<button
							onClick={() => setIsOpen(false)}
							className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-colors cursor-pointer"
						>
								Begrepen
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
