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
			<title>Login bij Deelauto Nijverhoek</title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<h1 style="color: #f97316;">Deelauto Nijverhoek</h1>
				<p>Klik op de volgende link om in te loggen:</p>
				<div style="margin: 30px 0;">
					<a href="${loginUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Log in</a>
				</div>
				<p>De link is 15 minuten geldig.</p>
			</div>
		</body>
		</html>
	`

	const text = `
Deelauto Nijverhoek

Klik op de volgende link om in te loggen:
${loginUrl}

De link is 15 minuten geldig.`

	return { html, text }
}
