import { CreatePaymentRequest } from '@/types/payment'

export function validateCreatePaymentRequest(body: CreatePaymentRequest): { isValid: boolean; errors: string[] } {
	const errors: string[] = []

	if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
		errors.push('title is required and must be a non-empty string')
	}

	if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
		errors.push('description is required and must be a non-empty string')
	}

	if (body.amount_in_euros === undefined || body.amount_in_euros === null) {
		errors.push('amount_in_euros is required')
	} else if (typeof body.amount_in_euros !== 'number' || body.amount_in_euros <= 0) {
		errors.push('amount_in_euros must be a positive number')
	}

	if (body.is_business_transaction === undefined || body.is_business_transaction === null) {
		errors.push('is_business_transaction is required')
	} else if (typeof body.is_business_transaction !== 'boolean') {
		errors.push('is_business_transaction must be a boolean')
	}

	if (!body.send_at) {
		errors.push('send_at is required')
	} else {
		const sendAt = new Date(body.send_at)
		if (isNaN(sendAt.getTime())) {
			errors.push('send_at must be a valid date')
		}
	}

	return {
		isValid: errors.length === 0,
		errors
	}
}

export function validateUpdatePaymentPaidRequest(body: { paid_at: Date }): { isValid: boolean; errors: string[] } {
	const errors: string[] = []

	if (!body.paid_at) {
		errors.push('paid_at is required')
	} else {
		const paidAt = new Date(body.paid_at)
		if (isNaN(paidAt.getTime())) {
			errors.push('paid_at must be a valid date')
		}
	}

	return {
		isValid: errors.length === 0,
		errors
	}
}

export function formatAmount(amount: number): number {
	return Math.round(amount * 100) / 100
}

export function sanitizePaymentData(payment: CreatePaymentRequest) {
	return {
		title: payment.title.trim(),
		description: payment.description.trim(),
		amount_in_euros: formatAmount(payment.amount_in_euros),
		is_business_transaction: payment.is_business_transaction,
		send_at: new Date(payment.send_at)
	}
}
