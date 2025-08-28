import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { CreatePaymentRequest, PaymentResponse } from '@/types/payment'

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

		// Create payment document
		const payment = {
			datetime_created: new Date(),
			title: body.title,
			description: body.description,
			amount_in_euros: roundedAmount,
			is_business_transaction: body.is_business_transaction,
			send_at: new Date(body.send_at),
			paid_at: null
		}

		const result = await db.collection('Payments').insertOne(payment)

		if (result.acknowledged) {
			const createdPayment = {
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
		const { db } = await connectToDatabase()
		const payments = await db.collection('Payments').find({}).sort({ datetime_created: -1 }).toArray()

		return NextResponse.json(
			{
				success: true,
				data: payments,
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
