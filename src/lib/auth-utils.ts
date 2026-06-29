import { cookies } from 'next/headers'
import { Db } from 'mongodb'

type CookieStore = Awaited<ReturnType<typeof cookies>>

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
