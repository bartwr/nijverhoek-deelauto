import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/mongodb'

/**
 * Returns true when the request carries a valid, non-expired admin session
 * cookie (`admin_session`) that is present in the `AdminSessions` collection.
 */
export async function hasValidAdminSession (): Promise<boolean> {
	const cookieStore = await cookies()
	const sessionToken = cookieStore.get('admin_session')

	if (!sessionToken) return false

	const { db } = await connectToDatabase()
	const session = await db.collection('AdminSessions').findOne({
		sessionToken: sessionToken.value,
		expiresAt: { $gt: new Date() },
	})

	return session !== null
}

/**
 * Returns true when the request carries a valid, non-expired member session
 * cookie (`user_session`) that is present in the `UserSessions` collection.
 */
export async function hasValidUserSession (): Promise<boolean> {
	const cookieStore = await cookies()
	const sessionToken = cookieStore.get('user_session')

	if (!sessionToken) return false

	const { db } = await connectToDatabase()
	const session = await db.collection('UserSessions').findOne({
		sessionToken: sessionToken.value,
		expiresAt: { $gt: new Date() },
	})

	return session !== null
}

/**
 * Returns true when the request is authenticated as either an admin or a
 * logged-in member.
 */
export async function hasValidAdminOrUserSession (): Promise<boolean> {
	if (await hasValidAdminSession()) return true
	return hasValidUserSession()
}
