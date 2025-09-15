'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function UserLoginPage() {
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
			const response = await fetch('/api/user/send-login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			})

			const data = await response.json()

			if (response.ok) {
				setMessage('Check your email for a login link!')
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
				setMessage('Login successful! Redirecting...')
				router.push('/mijn')
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
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h1 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
						Deelauto Nijverhoek
					</h1>
					<p className="text-center text-gray-600 dark:text-gray-300 mt-2">
						Log in om je reserveringen te bekijken
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleEmailLogin}>
					<div>
						<label htmlFor="email" className="sr-only">
							Email address
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
							placeholder="Email address"
						/>
					</div>

					<div>
						<button
							type="submit"
							disabled={isLoading}
							className="
								group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
								cursor-pointer
							"
						>
							{isLoading ? 'Mail wordt verstuurd...' : 'Log in'}
						</button>
					</div>

					{message && (
						<div className={`text-sm text-center ${message.includes('error') || message.includes('Invalid') ? 'text-red-600' : 'text-green-600'}`}>
							{message}
						</div>
					)}
				</form>
			</div>
		</div>
	)
}
