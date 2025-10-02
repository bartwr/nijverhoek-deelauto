import { CreatePaymentRequest } from '@/types/payment'
import { connectToDatabase } from '@/lib/mongodb'
import { checkBunqPaymentStatus } from '@/lib/bunq-api'
import { ObjectId } from 'mongodb'

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

/**
 * Update bunq status for a specific payment
 */
export async function updatePaymentBunqStatus(paymentId: string): Promise<{ success: boolean; status?: string; error?: string }> {
	try {
		const { db } = await connectToDatabase()
		
		// Get the payment
		const payment = await db.collection('Payments').findOne({ _id: new ObjectId(paymentId) })
		
		if (!payment) {
			return { success: false, error: 'Payment not found' }
		}
		
		if (!payment.bunq_request_id) {
			return { success: false, error: 'Payment has no bunq request ID' }
		}
		
		// Check bunq status using the appropriate method based on payment type
		const newStatus = await checkBunqPaymentStatus(payment.bunq_request_id, payment.is_bunq_user_request)
		
		// Update the payment if status changed
		if (payment.bunq_status !== newStatus) {
			const updateData: { bunq_status: string; paid_at?: Date } = {
				bunq_status: newStatus
			}
			
			// If payment is accepted and not already marked as paid, mark it as paid
			if (newStatus === 'ACCEPTED' && !payment.paid_at) {
				updateData.paid_at = new Date()
				console.log(`Payment ${paymentId}: Setting paid_at to ${updateData.paid_at.toISOString()} because bunq status changed to ACCEPTED`)
			}
			
			await db.collection('Payments').updateOne(
				{ _id: new ObjectId(paymentId) },
				{ $set: updateData }
			)
			
			console.log(`Updated payment ${paymentId} bunq status from ${payment.bunq_status} to ${newStatus}`)
			if (updateData.paid_at) {
				console.log(`Payment ${paymentId}: paid_at set to ${updateData.paid_at.toISOString()}`)
			}
		} else {
			console.log(`Payment ${paymentId}: No status change needed (current: ${payment.bunq_status}, new: ${newStatus})`)
		}
		
		return { success: true, status: newStatus }
	} catch (error) {
		console.error('Error updating payment bunq status:', error)
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
	}
}

/**
 * Update bunq statuses for all payments with bunq request IDs that are not yet paid
 */
export async function syncAllBunqStatuses(): Promise<{ success: boolean; updated: number; errors: string[] }> {
	try {
		const { db } = await connectToDatabase()
		
		// Get all payments with bunq request IDs that are not marked as paid or have PENDING status
		const paymentsToCheck = await db.collection('Payments').find({
			bunq_request_id: { $exists: true, $ne: null },
			$or: [
				{ paid_at: { $exists: false } },
				{ paid_at: null },
				{ bunq_status: 'PENDING' }
			]
		}).toArray()
		
		console.log(`Found ${paymentsToCheck.length} payments to check for bunq status updates`)
		
		let updatedCount = 0
		const errors: string[] = []
		
		for (const payment of paymentsToCheck) {
			try {
				const result = await updatePaymentBunqStatus(payment._id.toString())
				if (result.success) {
					updatedCount++
				} else if (result.error) {
					errors.push(`Payment ${payment._id}: ${result.error}`)
				}
				
				// Add a small delay to avoid overwhelming the bunq API
				await new Promise(resolve => setTimeout(resolve, 100))
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				errors.push(`Payment ${payment._id}: ${errorMessage}`)
			}
		}
		
		console.log(`Bunq status sync completed: ${updatedCount} payments updated, ${errors.length} errors`)
		
		return { success: true, updated: updatedCount, errors }
	} catch (error) {
		console.error('Error syncing bunq statuses:', error)
		return { success: false, updated: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] }
	}
}
