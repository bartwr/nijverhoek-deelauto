import nodemailer from 'nodemailer'

interface EmailOptions {
	to: string
	subject: string
	html: string
	text?: string
}

/**
 * Send an email using TransIP SMTP server
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
	try {
		// Create transporter with TransIP SMTP settings
		const transporter = nodemailer.createTransport({
			host: 'smtp.transip.email',
			port: 465,
			secure: true, // true for 465, false for other ports
			auth: {
				user: process.env.EMAIL_USER || 'mail@nijverhoek.nl',
				pass: process.env.EMAIL_PASSWORD || 'PASSWD'
			}
		})

		// Send email
		const info = await transporter.sendMail({
			from: `"Deelauto Nijverhoek" <${process.env.EMAIL_USER || 'mail@nijverhoek.nl'}>`,
			to: options.to,
			subject: options.subject,
			text: options.text,
			html: options.html
		})

		console.log('Email sent successfully:', info.messageId)
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
