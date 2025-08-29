'use client'

import { useEffect, useState } from 'react'

export default function PWATestPage() {
	const [pwaStatus, setPwaStatus] = useState({
		isInstalled: false,
		isStandalone: false,
		hasServiceWorker: false,
		canInstall: false,
	})

	useEffect(() => {
		// Check if app is installed
		const checkPWAStatus = () => {
			const isStandalone = window.matchMedia('(display-mode: standalone)').matches
			const isInstalled = window.navigator.standalone || isStandalone
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

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 p-4">
			<div className="max-w-2xl mx-auto">
				<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-6">
						PWA Status Test
					</h1>

					<div className="space-y-4">
						<div className="flex items-center justify-between p-4 border rounded-lg">
							<span className="font-medium">App geïnstalleerd:</span>
							<span className={`px-3 py-1 rounded-full text-sm font-medium ${
								pwaStatus.isInstalled 
									? 'bg-green-100 text-green-800' 
									: 'bg-red-100 text-red-800'
							}`}>
								{pwaStatus.isInstalled ? '✅ Ja' : '❌ Nee'}
							</span>
						</div>

						<div className="flex items-center justify-between p-4 border rounded-lg">
							<span className="font-medium">Standalone modus:</span>
							<span className={`px-3 py-1 rounded-full text-sm font-medium ${
								pwaStatus.isStandalone 
									? 'bg-green-100 text-green-800' 
									: 'bg-red-100 text-red-800'
							}`}>
								{pwaStatus.isStandalone ? '✅ Ja' : '❌ Nee'}
							</span>
						</div>

						<div className="flex items-center justify-between p-4 border rounded-lg">
							<span className="font-medium">Service Worker:</span>
							<span className={`px-3 py-1 rounded-full text-sm font-medium ${
								pwaStatus.hasServiceWorker 
									? 'bg-green-100 text-green-800' 
									: 'bg-red-100 text-red-800'
							}`}>
								{pwaStatus.hasServiceWorker ? '✅ Beschikbaar' : '❌ Niet beschikbaar'}
							</span>
						</div>

						<div className="flex items-center justify-between p-4 border rounded-lg">
							<span className="font-medium">Kan installeren:</span>
							<span className={`px-3 py-1 rounded-full text-sm font-medium ${
								pwaStatus.canInstall 
									? 'bg-green-100 text-green-800' 
									: 'bg-red-100 text-red-800'
							}`}>
								{pwaStatus.canInstall ? '✅ Ja' : '❌ Nee'}
							</span>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-lg p-6">
					<h2 className="text-xl font-bold text-gray-900 mb-4">
						PWA Functies
					</h2>

					<div className="space-y-3 text-sm text-gray-600">
						<p>✅ <strong>Offline functionaliteit:</strong> App werkt zonder internet</p>
						<p>✅ <strong>Home screen installatie:</strong> Voeg toe aan startscherm</p>
						<p>✅ <strong>App-achtige ervaring:</strong> Volledig scherm zonder browser UI</p>
						<p>✅ <strong>Push notificaties:</strong> (Kan later worden toegevoegd)</p>
						<p>✅ <strong>Automatische updates:</strong> Nieuwe versies worden gedownload</p>
					</div>

					<div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
						<h3 className="font-semibold text-orange-800 mb-2">📱 Installatie instructies:</h3>
						<ul className="text-sm text-orange-700 space-y-1">
							<li><strong>Android:</strong> Menu → "Toevoegen aan startscherm"</li>
							<li><strong>iPhone:</strong> Deel-knop → "Zet op beginscherm"</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	)
}
