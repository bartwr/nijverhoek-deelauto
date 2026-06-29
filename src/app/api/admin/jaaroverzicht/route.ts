import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { cookies } from 'next/headers'
import { computeOverview } from '@/lib/overview-stats'

export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		const { searchParams } = new URL(request.url)
		const yearParam = searchParams.get('year') || 'all'

		const cookieStore = await cookies()
		const sessionToken = cookieStore.get('admin_session')

		if (!sessionToken) {
			return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
		}

		const { db } = await connectToDatabase()

		const session = await db.collection('AdminSessions').findOne({
			sessionToken: sessionToken.value,
			expiresAt: { $gt: new Date() }
		})

		if (!session) {
			return NextResponse.json({ error: 'Sessie verlopen' }, { status: 401 })
		}

		const overview = await computeOverview(db, yearParam)
		return NextResponse.json(overview)
	} catch (error) {
		console.error('Error building jaaroverzicht:', error)
		return NextResponse.json(
			{ error: 'Fout bij het opbouwen van het jaaroverzicht' },
			{ status: 500 }
		)
	}
}
