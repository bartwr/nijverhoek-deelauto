import { cookies } from 'next/headers'
import { Db } from 'mongodb'
import { User } from '@/types/models'

type CookieStore = Awaited<ReturnType<typeof cookies>>

const isNonEmpty = (value: unknown): boolean =>
	typeof value === 'string' && value.trim() !== ''

/**
 * A Users record is complete when both email_address and name are filled in.
 */
export function hasCompleteUserProfile(user: User | null): boolean {
	return (
		user !== null &&
		isNonEmpty(user.email_address) &&
		isNonEmpty(user.name)
	)
}

/**
 * Returns true when the request carries a valid admin OR regular user session.
 * Used for endpoints that any logged-in user may read.
 */
export async function hasValidAdminOrUserSession(
	db: Db,
	cookieStore: CookieStore
): Promise<boolean> {
	const adminToken = cookieStore.get('admin_session')
	if (adminToken) {
		const adminSession = await db.collection('AdminSessions').findOne({
			sessionToken: adminToken.value,
			expiresAt: { $gt: new Date() }
		})
		if (adminSession) return true
	}

	const userToken = cookieStore.get('user_session')
	if (userToken) {
		const userSession = await db.collection('UserSessions').findOne({
			sessionToken: userToken.value,
			expiresAt: { $gt: new Date() }
		})
		if (userSession) return true
	}

	return false
}

/**
 * Returns true when the request may view detailed stats (income, per-user
 * breakdown). Admins always qualify; regular users need a complete Users record.
 */
export async function canViewDetailedStats(
	db: Db,
	cookieStore: CookieStore
): Promise<boolean> {
	const adminToken = cookieStore.get('admin_session')
	if (adminToken) {
		const adminSession = await db.collection('AdminSessions').findOne({
			sessionToken: adminToken.value,
			expiresAt: { $gt: new Date() }
		})
		if (adminSession) return true
	}

	const userToken = cookieStore.get('user_session')
	if (userToken) {
		const userSession = await db.collection('UserSessions').findOne({
			sessionToken: userToken.value,
			expiresAt: { $gt: new Date() }
		})
		if (userSession) {
			const user = await db.collection<User>('Users').findOne({
				email_address: userSession.email
			})
			return hasCompleteUserProfile(user)
		}
	}

	return false
}
