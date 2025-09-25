import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/email-utils'
import { User } from '@/types/models'

export async function POST(request: NextRequest) {
	try {
		// Check authentication first
		const cookieStore = await cookies()
		const sessionToken = cookieStore.get('admin_session')

		if (!sessionToken) {
			return NextResponse.json(
				{ error: 'Niet geautoriseerd' },
				{ status: 401 }
			)
		}

		const { db } = await connectToDatabase()

		// Validate session
		const session = await db.collection('AdminSessions').findOne({
			sessionToken: sessionToken.value,
			expiresAt: { $gt: new Date() }
		})

		if (!session) {
			return NextResponse.json(
				{ error: 'Sessie verlopen' },
				{ status: 401 }
			)
		}

		// Parse the request body
		const body = await request.json()
		const { userIds, subject, html } = body

		// Validate required fields
		if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
			return NextResponse.json(
				{ error: 'userIds array is required and must not be empty' },
				{ status: 400 }
			)
		}

		if (!subject || !html) {
			return NextResponse.json(
				{ error: 'Missing required fields: subject, html' },
				{ status: 400 }
			)
		}

		// Convert string IDs to ObjectIds
		const objectIds = userIds.map((id: string) => new ObjectId(id))

		// Get users by their IDs
		const users = await db.collection<User>('Users')
			.find({ _id: { $in: objectIds } })
			.toArray()

		if (users.length === 0) {
			return NextResponse.json(
				{ error: 'No users found with provided IDs' },
				{ status: 404 }
			)
		}

		// Filter users that have email addresses
		const usersWithEmail = users.filter(user => user.email_address && user.email_address.trim() !== '')

		if (usersWithEmail.length === 0) {
			return NextResponse.json(
				{ error: 'None of the users have email addresses set' },
				{ status: 400 }
			)
		}

		// Send emails to all users
		const emailPromises = usersWithEmail.map(user => {
			// Replace ${loginUrl} placeholder with actual URL
			const processedEmailBody = html.replace(/\$\{loginUrl\}/g, 'https://auto.nijverhoek.nl/mijn/betalingen')

			return sendEmail({
				to: user.email_address,
				subject,
				html: processedEmailBody,
				text: `Er staat een nieuw betaalverzoek voor je klaar. Ga naar https://auto.nijverhoek.nl/mijn/betalingen om in te loggen.`
			})
		})

		const results = await Promise.allSettled(emailPromises)
		
		const successCount = results.filter(result => result.status === 'fulfilled' && result.value === true).length
		const failureCount = results.length - successCount

		const usersWithoutEmail = users.length - usersWithEmail.length

		let message = `Emails verzonden naar ${successCount} gebruikers`
		if (failureCount > 0) {
			message += `, ${failureCount} emails faalden`
		}
		if (usersWithoutEmail > 0) {
			message += `, ${usersWithoutEmail} gebruikers hebben geen email adres`
		}

		return NextResponse.json({ 
			success: true,
			message,
			emailsSent: successCount,
			emailsFailed: failureCount,
			usersWithoutEmail,
			totalUsers: users.length
		})

	} catch (error) {
		console.error('Error sending monthly emails to users:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
