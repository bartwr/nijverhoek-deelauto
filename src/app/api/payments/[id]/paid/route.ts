import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { UpdatePaymentPaidRequest, PaymentResponse } from '@/types/payment'
import { ObjectId } from 'mongodb'
import { Payment } from '@/types/payment'

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PaymentResponse>> {
	try {
		const body: UpdatePaymentPaidRequest = await request.json()
		const { id } = await params

		// Validate payment ID
		if (!id || !ObjectId.isValid(id)) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid payment ID'
				},
				{ status: 400 }
			)
		}

		// Validate paid_at field
		if (!body.paid_at) {
			return NextResponse.json(
				{
					success: false,
					error: 'paid_at field is required'
				},
				{ status: 400 }
			)
		}

		const { db } = await connectToDatabase()

		// Update the payment document
		const result = await db.collection('Payments').updateOne(
			{ _id: new ObjectId(id) },
			{
				$set: {
					paid_at: new Date(body.paid_at)
				}
			}
		)

		if (result.matchedCount === 0) {
			return NextResponse.json(
				{
					success: false,
					error: 'Payment not found'
				},
				{ status: 404 }
			)
		}

		if (result.modifiedCount === 0) {
			return NextResponse.json(
				{
					success: false,
					error: 'Payment was not modified'
				},
				{ status: 400 }
			)
		}

		// Fetch the updated payment to return
		const updatedPayment = await db.collection('Payments').findOne({ _id: new ObjectId(id) })

		return NextResponse.json(
			{
				success: true,
				data: updatedPayment as unknown as Payment,
				message: 'Payment paid_at updated successfully'
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error updating payment paid_at:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PaymentResponse>> {
	try {
		const { id } = await params

		// Validate payment ID
		if (!id || !ObjectId.isValid(id)) {
			return NextResponse.json(
				{
					success: false,
					error: 'Invalid payment ID'
				},
				{ status: 400 }
			)
		}

		const { db } = await connectToDatabase()

		// Fetch the payment by ID
		const payment = await db.collection('Payments').findOne({ _id: new ObjectId(id) })

		if (!payment) {
			return NextResponse.json(
				{
					success: false,
					error: 'Payment not found'
				},
				{ status: 404 }
			)
		}

		return NextResponse.json(
			{
				success: true,
				data: payment as unknown as Payment,
				message: 'Payment retrieved successfully'
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error retrieving payment:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}
