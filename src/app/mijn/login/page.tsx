'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function UserLoginContent() {
	const [email, setEmail] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [token, setToken] = useState('')
	const router = useRouter()
	const searchParams = useSearchParams()

	useEffect(() => {
		const tokenParam = searchParams.get('token')
		if (tokenParam) {
			setToken(tokenParam)
			handleTokenLogin(tokenParam)
		}
	}, [searchParams])

	const handleEmailLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!email) return

		setIsLoading(true)
		setMessage('')

		try {
			const redirectUrl = searchParams.get('redirect')
			const response = await fetch('/api/user/send-login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, redirect: redirectUrl })
			})

			const data = await response.json()

			if (response.ok) {
				setMessage('Controleer je mailbox voor een login-link')
				setEmail('')
			} else {
				setMessage(data.error || 'Failed to send login email')
			}
		} catch (error) {
			setMessage('An error occurred. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleTokenLogin = async (token: string) => {
		setIsLoading(true)
		setMessage('')

		try {
			const response = await fetch('/api/user/validate-login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token })
			})

			const data = await response.json()

			if (response.ok) {
				setMessage('Succesvol ingelogd! Dashboard wordt geladen...')
				const redirectUrl = searchParams.get('redirect') || `/mijn/betalingen`
				router.push(redirectUrl)
			} else {
				setMessage(data.error || 'Invalid login token')
			}
		} catch (error) {
			setMessage('An error occurred. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 dark:from-[#ea5c33]/10 dark:via-gray-900 dark:to-[#ea5c33]/10 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-[#ea5c33] to-[#ea5c33] bg-clip-text text-transparent">
						Deelauto Nijverhoek
					</h1>
					<p className="text-gray-600 dark:text-gray-300 mt-2">
						Log in om je reserveringen te bekijken
					</p>
				</div>
				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
					<form className="space-y-6" onSubmit={handleEmailLogin}>
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Email adres
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ea5c33] focus:border-[#ea5c33] transition-colors"
								placeholder="je@email.nl"
							/>
						</div>

						<div>
							<button
								type="submit"
								disabled={isLoading}
								className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#ea5c33] hover:bg-[#ea5c33]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ea5c33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
							>
								{isLoading ? 'Mail wordt verstuurd...' : 'Log in'}
							</button>
						</div>

						{message && (
							<div className={`text-sm text-center p-3 rounded-lg ${
								message.includes('error') || message.includes('Invalid') 
									? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
									: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
							}`}>
								{message}
							</div>
						)}
					</form>
				</div>
			</div>
		</div>
	)
}

export default function UserLoginPage() {
	return (
		<Suspense fallback={<div>Laden...</div>}>
			<UserLoginContent />
		</Suspense>
	)
}
