import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { CreatePaymentRequest, PaymentResponse, Payment } from '@/types/payment'
import { createBunqPaymentRequest } from '@/lib/bunq-api'
import { syncAllBunqStatuses } from '@/lib/payment-utils'

export async function POST(request: NextRequest): Promise<NextResponse<PaymentResponse>> {
	try {
		const body: CreatePaymentRequest = await request.json()

		// Validate required fields
		if (!body.title || !body.description || body.amount_in_euros === undefined || body.is_business_transaction === undefined || !body.send_at) {
			return NextResponse.json(
				{
					success: false,
					error: 'Missing required fields: title, description, amount_in_euros, is_business_transaction, send_at'
				},
				{ status: 400 }
			)
		}

		// Validate bunq request fields if creating bunq request
		if (body.create_bunq_request && !body.user_email) {
			return NextResponse.json(
				{
					success: false,
					error: 'user_email is required when create_bunq_request is true'
				},
				{ status: 400 }
			)
		}

		// Validate amount is a positive number with max 2 decimal places
		if (body.amount_in_euros <= 0 || !Number.isFinite(body.amount_in_euros)) {
			return NextResponse.json(
				{
					success: false,
					error: 'amount_in_euros must be a positive number'
				},
				{ status: 400 }
			)
		}

		// Round to 2 decimal places
		const roundedAmount = Math.round(body.amount_in_euros * 100) / 100

		const { db } = await connectToDatabase()

		// Check if there's already a valid payment for the same reservations
		if (body.reservations_paid && body.reservations_paid.length > 0) {
			// Only reuse payments created within the last 7 days to avoid expired URLs
			const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
			
			const existingPayment = await db.collection('Payments').findOne({
				reservations_paid: { $all: body.reservations_paid },
				is_business_transaction: body.is_business_transaction,
				amount_in_euros: roundedAmount,
				paid_at: null, // Not paid yet
				bunq_payment_url: { $exists: true, $ne: null }, // Has valid payment URL
				bunq_status: { $nin: ['REJECTED', 'CANCELLED'] }, // Not rejected or cancelled
				datetime_created: { $gte: sevenDaysAgo } // Created within last 7 days
			})

			if (existingPayment) {
				console.log('Found existing valid payment, reusing:', existingPayment._id)
				
				// Return the existing payment instead of creating a new one
				const existingPaymentWithId: Payment = {
					...(existingPayment as unknown as Omit<Payment, '_id'>),
					_id: existingPayment._id.toString()
				}

				return NextResponse.json(
					{
						success: true,
						data: existingPaymentWithId,
						message: 'Existing payment found and reused'
					},
					{ status: 200 }
				)
			}
		}

		// Create bunq payment request if requested
		let bunqRequestId: number | undefined
		let bunqPaymentUrl: string | undefined
		let bunqStatus: string | undefined
		let isBunqUserRequest = false

		if (body.create_bunq_request && body.user_email) {
			try {
				const bunqResponse = await createBunqPaymentRequest(
					roundedAmount,
					body.description,
					body.user_email,
					`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/mijn/betalingen`
				)
				
				bunqRequestId = bunqResponse.requestId
				bunqPaymentUrl = bunqResponse.paymentUrl || undefined
				bunqStatus = 'PENDING'
				isBunqUserRequest = bunqResponse.isBunqUserRequest
				
				// Log the type of request created
				if (isBunqUserRequest) {
					console.log(`Created direct bunq user request for ${body.user_email} (no payment URL needed)`)
				} else {
					console.log(`Created universal payment URL for ${body.user_email}: ${bunqPaymentUrl}`)
				}
			} catch (error) {
				console.error('Error creating bunq payment request:', error)
				// Continue with payment creation even if bunq request fails
				// The payment will be created without bunq integration
			}
		}

		// Create payment document
		const payment = {
			datetime_created: new Date(),
			title: body.title,
			description: body.description,
			amount_in_euros: roundedAmount,
			is_business_transaction: body.is_business_transaction,
			send_at: new Date(body.send_at),
			paid_at: undefined,
			reservations_paid: body.reservations_paid || [],
			bunq_request_id: bunqRequestId,
			bunq_payment_url: bunqPaymentUrl,
			bunq_status: bunqStatus
		}

		const result = await db.collection('Payments').insertOne(payment)

		if (result.acknowledged) {
			const createdPayment: Payment = {
				...payment,
				_id: result.insertedId.toString()
			}

			return NextResponse.json(
				{
					success: true,
					data: createdPayment,
					message: 'Payment created successfully'
				},
				{ status: 201 }
			)
		} else {
			return NextResponse.json(
				{
					success: false,
					error: 'Failed to create payment'
				},
				{ status: 500 }
			)
		}
	} catch (error) {
		console.error('Error creating payment:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}

export async function GET(): Promise<NextResponse<PaymentResponse>> {
	try {
		// Sync bunq statuses before fetching payments (don't wait for completion)
		syncAllBunqStatuses().catch(error => {
			console.warn('Background bunq status sync failed:', error)
		})

		const { db } = await connectToDatabase()
		const payments = await db.collection('Payments').find({}).sort({ datetime_created: -1 }).toArray()

		return NextResponse.json(
			{
				success: true,
				data: payments as unknown as Payment[],
				message: 'Payments retrieved successfully'
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error retrieving payments:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}
