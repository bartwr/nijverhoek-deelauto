export interface Payment {
	_id?: string
	datetime_created: Date
	title: string
	description: string
	amount_in_euros: number
	is_business_transaction: boolean
	send_at: Date
	paid_at?: Date
	reservations_paid?: string[] // Array of reservation IDs that are included in this payment
}

export interface CreatePaymentRequest {
	title: string
	description: string
	amount_in_euros: number
	is_business_transaction: boolean
	send_at: Date
	reservations_paid?: string[]
}

export interface UpdatePaymentPaidRequest {
	payment_id: string
	paid_at: Date
}

export interface PaymentResponse {
	success: boolean
	data?: Payment | Payment[]
	message?: string
	error?: string
}
