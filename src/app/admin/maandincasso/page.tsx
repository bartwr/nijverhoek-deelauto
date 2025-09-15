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
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-300">Loading...</p>
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
				<div className={`mb-6 p-4 rounded-md ${
					message.includes('succesvol') || message.includes('success')
						? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200'
						: 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200'
				}`}>
					{message}
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
