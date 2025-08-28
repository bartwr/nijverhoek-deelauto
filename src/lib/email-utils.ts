interface EmailOptions {
	to: string
	subject: string
	html: string
	text?: string
}

/**
 * Send an email using the configured email service
 * Currently logs to console for development
 * In production, integrate with services like SendGrid, Mailgun, or AWS SES
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
	try {
		// For development, just log the email
		console.log('=== EMAIL SENT ===')
		console.log('To:', options.to)
		console.log('Subject:', options.subject)
		console.log('HTML:', options.html)
		console.log('Text:', options.text)
		console.log('==================')

		// TODO: Implement actual email sending
		// Example with SendGrid:
		// const sgMail = require('@sendgrid/mail')
		// sgMail.setApiKey(process.env.SENDGRID_API_KEY)
		// await sgMail.send(options)

		return true
	} catch (error) {
		console.error('Failed to send email:', error)
		return false
	}
}

/**
 * Generate a login email template
 */
export function generateLoginEmail(loginUrl: string): { html: string; text: string } {
	const html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<title>Admin Login - Deelauto Nijverhoek</title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<h1 style="color: #2563eb;">Deelauto Nijverhoek Admin</h1>
				<p>You requested access to the admin panel.</p>
				<p>Click the button below to log in:</p>
				<div style="text-align: center; margin: 30px 0;">
					<a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Log In to Admin Panel</a>
				</div>
				<p><strong>This link will expire in 15 minutes.</strong></p>
				<p>If you didn't request this email, you can safely ignore it.</p>
				<hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
				<p style="font-size: 12px; color: #6b7280;">
					This is an automated message from Deelauto Nijverhoek. Please do not reply to this email.
				</p>
			</div>
		</body>
		</html>
	`

	const text = `
Deelauto Nijverhoek Admin

You requested access to the admin panel.

Click the link below to log in:
${loginUrl}

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.

---
This is an automated message from Deelauto Nijverhoek. Please do not reply to this email.
	`

	return { html, text }
}
