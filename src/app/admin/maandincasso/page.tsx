'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import XLSXUploadComponent from '@/components/XLSXUploadComponent'
import ReservationTableComponent from '@/components/ReservationTableComponent'
import AdminLayout from '@/components/AdminLayout'
import { ProcessedReservationData } from '@/types/models'

interface AdminUser {
	email: string
	expiresAt: number
}

export default function MaandincassoPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<AdminUser | null>(null)
	const [currentStep, setCurrentStep] = useState<'upload' | 'review'>('upload')
	const [reservationData, setReservationData] = useState<ProcessedReservationData[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [message, setMessage] = useState('')
	const router = useRouter()

	useEffect(() => {
		// Check if user is logged in on component mount
		checkAuthStatus()
	}, [])

	const checkAuthStatus = async () => {
		try {
			const response = await fetch('/api/admin/check-auth')
			if (response.ok) {
				const data = await response.json()
				if (data.isLoggedIn) {
					setIsLoggedIn(true)
					setUser(data.user)
				}
			}
		} catch (error) {
			console.error('Error checking auth status:', error)
		}
	}

	const handleLogout = async () => {
		try {
			await fetch('/api/admin/logout', { method: 'POST' })
			setIsLoggedIn(false)
			setUser(null)
			router.push('/admin')
		} catch (error) {
			console.error('Error logging out:', error)
		}
	}

	const handleFileUpload = (data: ProcessedReservationData[]) => {
    console.log('data', data)
		setReservationData(data)
		setCurrentStep('review')
	}

	const handleSaveReservations = async (editedData: ProcessedReservationData[]) => {
		setIsLoading(true)
		setMessage('')

		try {
			const response = await fetch('/api/admin/save-reservations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ reservations: editedData })
			})

			const data = await response.json()

			if (response.ok) {
				setMessage('Reserveringen succesvol opgeslagen!')
				setCurrentStep('upload')
				setReservationData([])
			} else {
				setMessage(data.error || 'Fout bij opslaan van reserveringen')
			}
		} catch (error) {
			setMessage('Er is een fout opgetreden. Probeer het opnieuw.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleBackToUpload = () => {
		setCurrentStep('upload')
		setReservationData([])
		setMessage('')
	}

	if (!isLoggedIn || !user) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 dark:from-[#ea5c33]/10 dark:via-gray-900 dark:to-[#ea5c33]/10 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea5c33] mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-300">Laden...</p>
				</div>
			</div>
		)
	}

	const sidebarItems = [
		{ href: '/admin', label: 'Dashboard', isActive: false },
		{ href: '/admin/maandincasso', label: 'Maandincasso', isActive: true }
	]

	return (
		<AdminLayout
			title="Deelauto Nijverhoek admin"
			sidebarItems={sidebarItems}
			onLogout={handleLogout}
		>
			<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
				Stuur maandelijkse betaallinks
			</h2>

			{message && (
				<div className={`mb-6 p-4 rounded-lg border ${
					message.includes('succesvol') || message.includes('success')
						? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
						: 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
				}`}>
					<div className="flex items-start space-x-2">
						<svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
							message.includes('succesvol') || message.includes('success')
								? 'text-green-600 dark:text-green-400'
								: 'text-red-600 dark:text-red-400'
						}`} fill="currentColor" viewBox="0 0 20 20">
							{message.includes('succesvol') || message.includes('success') ? (
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							) : (
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
							)}
						</svg>
						<div>{message}</div>
					</div>
				</div>
			)}

			{currentStep === 'upload' && (
				<XLSXUploadComponent onFileUpload={handleFileUpload} />
			)}

			{currentStep === 'review' && (
				<ReservationTableComponent
					data={reservationData}
					onSave={handleSaveReservations}
					onBack={handleBackToUpload}
					isLoading={isLoading}
				/>
			)}
		</AdminLayout>
	)
}
