'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AdminLoginContent() {
	const [isValidating, setIsValidating] = useState(true)
	const [error, setError] = useState('')
	const router = useRouter()
	const searchParams = useSearchParams()

  const validateToken = useCallback(async (token: string) => {
		try {
			const response = await fetch('/api/admin/validate-login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token })
			})

			if (response.ok) {
				// Token is valid, redirect to admin dashboard
				router.push('/admin')
			} else {
				const data = await response.json()
				setError(data.error || 'Invalid or expired login token')
			}
		} catch (error) {
			setError('An error occurred while validating the token')
		} finally {
			setIsValidating(false)
		}
	}, [router])

	useEffect(() => {
		const token = searchParams.get('token')
		
		if (!token) {
			setError('No login token provided')
			setIsValidating(false)
			return
		}

		validateToken(token)
	}, [searchParams, validateToken])

	if (isValidating) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-300">Validating login token...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="max-w-md w-full text-center">
					<div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
						<div className="text-red-600 mb-4">
							<svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
						</div>
						<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Login Failed</h2>
						<p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
						<a
							href="/admin"
							className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
						>
							Back to Login
						</a>
					</div>
				</div>
			</div>
		)
	}

  return null
}

export default function AdminLoginPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-300">Loading...</p>
				</div>
			</div>
		}>
			<AdminLoginContent />
		</Suspense>
	)
}
