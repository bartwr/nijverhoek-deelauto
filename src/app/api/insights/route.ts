import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { cookies } from 'next/headers'
import { computeOverview, OverviewResult } from '@/lib/overview-stats'
import { hasValidAdminOrUserSession } from '@/lib/auth-utils'

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest'
const CACHE_COLLECTION = 'InsightsCache'
// Regenerate at most once every ~30 days (the dataset grows slowly).
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

interface Insight {
	emoji: string
	title: string
	text: string
	type: 'useful' | 'fun'
}

interface CachedInsights {
	scope: string
	insights: Insight[]
	generatedAt: Date
	model: string
	dataSignature: string
}

function dataSignature(overview: OverviewResult): string {
	const k = overview.kpis
	return [
		overview.selectedYear,
		k?.totalReservations ?? 0,
		k?.totalKm ?? 0,
		overview.period?.end ?? ''
	].join('|')
}

function buildPrompt(overview: OverviewResult): string {
	const compact = {
		periode: overview.period,
		venster_beschikbaarheid: overview.window,
		kpis: overview.kpis,
		per_maand: overview.monthly,
		per_weekdag: overview.byWeekday,
		per_uur: overview.byHour,
		per_gebruiker: overview.byUser
	}

	return `Hier zijn de gebruiksgegevens van één elektrische deelauto die door buurtbewoners gedeeld wordt (bedragen in euro, afstanden in km, tijden in uren, tijdzone Europe/Amsterdam). Het beschikbaarheidsvenster is 06:00-24:00.\n\nDATA (JSON):\n${JSON.stringify(
		compact
	)}\n\nGeef 3 tot 5 korte, pakkende inzichten over hoe de auto gebruikt wordt. Mix nuttige/zakelijke observaties met een paar luchtige, grappige observaties. Baseer alles strikt op de data; verzin geen cijfers. Schrijf in het Nederlands, informeel en bondig (max ~25 woorden per inzicht).`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
		const scope = overview.selectedYear

		if (overview.empty) {
			return NextResponse.json({
				success: true,
				configured: true,
				insights: [],
				message: 'Geen data om te analyseren voor deze periode'
			})
		}

		// Return a fresh-enough cached result without hitting the LLM.
		const cache = db.collection<CachedInsights>(CACHE_COLLECTION)
		const cached = await cache.findOne({ scope })
		if (
			cached &&
			cached.generatedAt &&
			Date.now() - new Date(cached.generatedAt).getTime() < CACHE_MAX_AGE_MS
		) {
			return NextResponse.json({
				success: true,
				configured: true,
				cached: true,
				generatedAt: cached.generatedAt,
				model: cached.model,
				insights: cached.insights
			})
		}

		const apiKey = process.env.MISTRAL_API_KEY
		if (!apiKey) {
			return NextResponse.json({
				success: false,
				configured: false,
				error:
					'Geen Mistral API key geconfigureerd. Zet MISTRAL_API_KEY in .env.local.',
				// Serve a stale cached version if we have one, so the section is not empty.
				insights: cached?.insights || [],
				generatedAt: cached?.generatedAt
			})
		}

		const prompt = buildPrompt(overview)

		const llmResponse = await fetch(MISTRAL_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: MISTRAL_MODEL,
				temperature: 0.7,
				response_format: { type: 'json_object' },
				messages: [
					{
						role: 'system',
						content:
							'Je bent een data-analist die heldere, eerlijke en soms grappige inzichten geeft over deelauto-gebruik. Antwoord uitsluitend met geldige JSON in de vorm {"insights":[{"emoji":"","title":"","text":"","type":"useful|fun"}]}. Gebruik 3 tot 5 inzichten.'
					},
					{ role: 'user', content: prompt }
				]
			})
		})

		if (!llmResponse.ok) {
			const errText = await llmResponse.text()
			console.error('Mistral API error:', llmResponse.status, errText)
			return NextResponse.json({
				success: false,
				configured: true,
				error: `Mistral API gaf een fout (${llmResponse.status}).`,
				insights: cached?.insights || [],
				generatedAt: cached?.generatedAt
			})
		}

		const completion = await llmResponse.json()
		const content: string =
			completion?.choices?.[0]?.message?.content || '{"insights":[]}'

		let insights: Insight[] = []
		try {
			const parsed = JSON.parse(content)
			if (Array.isArray(parsed)) {
				insights = parsed
			} else if (Array.isArray(parsed.insights)) {
				insights = parsed.insights
			}
		} catch (err) {
			console.error('Failed to parse Mistral insights JSON:', err, content)
			return NextResponse.json({
				success: false,
				configured: true,
				error: 'Kon het AI-antwoord niet verwerken.',
				insights: cached?.insights || []
			})
		}

		insights = insights
			.filter((i) => i && i.title && i.text)
			.slice(0, 5)
			.map((i) => ({
				emoji: typeof i.emoji === 'string' ? i.emoji : '•',
				title: String(i.title),
				text: String(i.text),
				type: i.type === 'fun' ? 'fun' : 'useful'
			}))

		const generatedAt = new Date()
		await cache.updateOne(
			{ scope },
			{
				$set: {
					scope,
					insights,
					generatedAt,
					model: MISTRAL_MODEL,
					dataSignature: dataSignature(overview)
				}
			},
			{ upsert: true }
		)

		return NextResponse.json({
			success: true,
			configured: true,
			cached: false,
			generatedAt,
			model: MISTRAL_MODEL,
			insights
		})
	} catch (error) {
		console.error('Error generating insights:', error)
		return NextResponse.json(
			{ error: 'Fout bij het genereren van insights' },
			{ status: 500 }
		)
	}
}
