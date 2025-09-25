import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-utils'

export async function POST(request: NextRequest) {
	try {
		// Parse the request body
		const body = await request.json()
		const { to, subject, html } = body

		// Validate required fields
		if (!to || !subject || !html) {
			return NextResponse.json(
				{ error: 'Missing required fields: to, subject, html' },
				{ status: 400 }
			)
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(to)) {
			return NextResponse.json(
				{ error: 'Invalid email address format' },
				{ status: 400 }
			)
		}

		// Send the email
		const success = await sendEmail({
			to,
			subject,
			html,
			text: `Er staat een nieuw betaalverzoek voor je klaar. Ga naar https://auto.nijverhoek.nl/mijn/betalingen om in te loggen.`
		})

		if (success) {
			return NextResponse.json({ 
				success: true,
				message: 'Email sent successfully'
			})
		} else {
			return NextResponse.json(
				{ error: 'Failed to send email' },
				{ status: 500 }
			)
		}

	} catch (error) {
		console.error('Error sending monthly email:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
