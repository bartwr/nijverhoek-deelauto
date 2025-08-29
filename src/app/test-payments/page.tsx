import PaymentTester from '@/components/PaymentTester'

export default function TestPaymentsPage() {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payment API Testing</h1>
					<p className="text-gray-600 dark:text-gray-300 mt-2">
						Test the payment API endpoints for creating and updating payments
					</p>
				</div>
				<PaymentTester />
			</div>
		</div>
	)
}
