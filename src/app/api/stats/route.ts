import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { cookies } from 'next/headers'
import { computeOverview } from '@/lib/overview-stats'
import { hasValidAdminOrUserSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		const { searchParams } = new URL(request.url)
		const yearParam = searchParams.get('year') || 'all'

		const { db } = await connectToDatabase()
		const cookieStore = await cookies()

		const isAuthenticated = await hasValidAdminOrUserSession(db, cookieStore)
		if (!isAuthenticated) {
			return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
		}

		const overview = await computeOverview(db, yearParam)
		return NextResponse.json(overview)
	} catch (error) {
		console.error('Error building stats:', error)
		return NextResponse.json(
			{ error: 'Fout bij het opbouwen van de statistieken' },
			{ status: 500 }
		)
	}
}
