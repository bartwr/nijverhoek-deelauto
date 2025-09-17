import { NextRequest, NextResponse } from 'next/server'
import { syncAllBunqStatuses, updatePaymentBunqStatus } from '@/lib/payment-utils'

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		const body = await request.json()
		
		// Check if we're syncing a specific payment or all payments
		if (body.payment_id) {
			// Sync specific payment
			const result = await updatePaymentBunqStatus(body.payment_id)
			
			if (result.success) {
				return NextResponse.json(
					{
						success: true,
						message: 'Payment bunq status updated successfully',
						status: result.status
					},
					{ status: 200 }
				)
			} else {
				return NextResponse.json(
					{
						success: false,
						error: result.error
					},
					{ status: 400 }
				)
			}
		} else {
			// Sync all payments
			const result = await syncAllBunqStatuses()
			
			return NextResponse.json(
				{
					success: result.success,
					message: `Synced bunq statuses: ${result.updated} payments updated`,
					updated_count: result.updated,
					errors: result.errors
				},
				{ status: 200 }
			)
		}
	} catch (error) {
		console.error('Error syncing bunq statuses:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}

export async function GET(): Promise<NextResponse> {
	try {
		// GET request to sync all payments
		const result = await syncAllBunqStatuses()
		
		return NextResponse.json(
			{
				success: result.success,
				message: `Synced bunq statuses: ${result.updated} payments updated`,
				updated_count: result.updated,
				errors: result.errors
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error syncing bunq statuses:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		)
	}
}
