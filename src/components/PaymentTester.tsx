'use client'

import { useState } from 'react'

interface Payment {
	_id?: string
	datetime_created: Date
	user_id: string
	title: string
	description: string
	amount_in_euros: number
	is_business_transaction: boolean
	send_at: Date
	paid_at?: Date
}

interface PaymentResponse {
	success: boolean
	data?: Payment | Payment[]
	message?: string
	error?: string
}

export default function PaymentTester() {
	const [payments, setPayments] = useState<Payment[]>([])
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		amount_in_euros: '',
		is_business_transaction: false,
		send_at: new Date().toISOString().slice(0, 16)
	})

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value, type } = e.target
		setFormData(prev => ({
			...prev,
			[name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
		}))
	}

	const createPayment = async () => {
		setLoading(true)
		setMessage('')

		try {
			const response = await fetch('/api/payments', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...formData,
					amount_in_euros: parseFloat(formData.amount_in_euros),
					send_at: new Date(formData.send_at).toISOString()
				})
			})

			const result: PaymentResponse = await response.json()

			if (result.success) {
				setMessage('Payment created successfully!')
				setFormData({
					title: '',
					description: '',
					amount_in_euros: '',
					is_business_transaction: false,
					send_at: new Date().toISOString().slice(0, 16)
				})
				fetchPayments() // Refresh the list
			} else {
				setMessage(`Error: ${result.error}`)
			}
		} catch (error) {
			setMessage(`Error: ${error}`)
		} finally {
			setLoading(false)
		}
	}

	const fetchPayments = async () => {
		setLoading(true)
		try {
			const response = await fetch('/api/payments')
			const result: PaymentResponse = await response.json()

			if (result.success && Array.isArray(result.data)) {
				setPayments(result.data as Payment[])
			} else {
				setMessage(`Error fetching payments: ${result.error}`)
			}
		} catch (error) {
			setMessage(`Error: ${error}`)
		} finally {
			setLoading(false)
		}
	}

	const markAsPaid = async (paymentId: string) => {
		setLoading(true)
		try {
			const response = await fetch(`/api/payments/${paymentId}/paid`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					paid_at: new Date().toISOString()
				})
			})

			const result: PaymentResponse = await response.json()

			if (result.success) {
				setMessage('Payment marked as paid!')
				fetchPayments() // Refresh the list
			} else {
				setMessage(`Error: ${result.error}`)
			}
		} catch (error) {
			setMessage(`Error: ${error}`)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payment API Tester</h2>
			
			{/* Create Payment Form */}
			<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
				<h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Create New Payment</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Title *
						</label>
						<input
							type="text"
							name="title"
							value={formData.title}
							onChange={handleInputChange}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
							placeholder="Payment title"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Amount (€) *
						</label>
						<input
							type="number"
							name="amount_in_euros"
							step="0.01"
							min="0"
							value={formData.amount_in_euros}
							onChange={handleInputChange}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
							placeholder="0.00"
						/>
					</div>
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Description *
						</label>
						<textarea
							name="description"
							value={formData.description}
							onChange={handleInputChange}
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
							placeholder="Payment description"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Send Date *
						</label>
						<input
							type="datetime-local"
							name="send_at"
							value={formData.send_at}
							onChange={handleInputChange}
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
						/>
					</div>
					<div className="flex items-center">
						<input
							type="checkbox"
							name="is_business_transaction"
							checked={formData.is_business_transaction}
							onChange={handleInputChange}
							className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
						/>
						<label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
							Business Transaction
						</label>
					</div>
				</div>
				<button
					onClick={createPayment}
					disabled={loading}
					className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
				>
					{loading ? 'Creating...' : 'Create Payment'}
				</button>
			</div>

			{/* Message Display */}
			{message && (
				<div className={`p-4 rounded-md ${
					message.includes('Error') 
						? 'bg-red-100 text-red-700 border border-red-200' 
						: 'bg-green-100 text-green-700 border border-green-200'
				}`}>
					{message}
				</div>
			)}

			{/* Payments List */}
			<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payments List</h3>
					<button
						onClick={fetchPayments}
						disabled={loading}
						className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
					>
						{loading ? 'Laden...' : 'Refresh'}
					</button>
				</div>
				
				{payments.length === 0 ? (
					<p className="text-gray-500 dark:text-gray-400 text-center py-8">No payments found. Create one above or click Refresh.</p>
				) : (
					<div className="space-y-3">
						{payments.map((payment) => (
							<div key={payment._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
								<div className="flex justify-between items-start">
									<div className="flex-1">
										<h4 className="font-medium text-gray-900 dark:text-gray-100">{payment.title}</h4>
										<p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{payment.description}</p>
										<div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
											<span>€{payment.amount_in_euros.toFixed(2)}</span>
											<span>{payment.is_business_transaction ? 'Business' : 'Personal'}</span>
											<span>Sent: {new Date(payment.send_at).toLocaleDateString()}</span>
											{payment.paid_at && (
												<span className="text-green-600">
													Paid: {new Date(payment.paid_at).toLocaleDateString()}
												</span>
											)}
										</div>
									</div>
									{!payment.paid_at && (
										<button
											onClick={() => payment._id && markAsPaid(payment._id)}
											disabled={loading}
											className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 cursor-pointer"
										>
											Mark as Paid
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
