'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { BarChart, StackedBarChart, HBarList } from '@/components/charts/ReportCharts'

interface AdminUser {
	email: string
	expiresAt: number
}

interface MonthlyRow {
	month: string
	label: string
	reservations: number
	km: number
	effectiveHours: number
	reservedHours: number
	incomeBusiness: number
	incomePrivate: number
	incomeTotal: number
	avgAvailableHoursPerDay: number
	occupancyPct: number
}

interface DailyRow {
	date: string
	reservations: number
	km: number
	effectiveHours: number
	availableHours: number
}

interface WeekdayRow {
	weekday: number
	label: string
	reservations: number
	effectiveHours: number
}

interface HourRow {
	hour: number
	occupiedHours: number
}

interface UserRow {
	name: string
	reservations: number
	km: number
	effectiveHours: number
	income: number
	reservationsPrivate: number
	kmPrivate: number
	effectiveHoursPrivate: number
	incomePrivate: number
}

interface OverviewData {
	success: boolean
	empty: boolean
	message?: string
	availableYears: number[]
	selectedYear: string
	period: { start: string; end: string; days: number }
	window: { startHour: number; endHour: number; hours: number; timezone: string }
	kpis: {
		totalReservations: number
		totalKm: number
		totalEffectiveHours: number
		totalReservedHours: number
		avgReservationsPerDay: number
		avgKmPerReservation: number
		avgEffectiveHoursPerReservation: number
		avgAvailableHoursPerDay: number
		avgOccupiedHoursPerDay: number
		occupancyPct: number
		incomeTotal: number
		incomeBusiness: number
		incomePrivate: number
		paidTotal: number
		outstandingTotal: number
		activeUsers: number
	}
	monthly: MonthlyRow[]
	daily: DailyRow[]
	byWeekday: WeekdayRow[]
	byHour: HourRow[]
	byUser: UserRow[]
}

interface Insight {
	emoji: string
	title: string
	text: string
	type: 'useful' | 'fun'
}

interface InsightsResponse {
	success: boolean
	configured: boolean
	cached?: boolean
	generatedAt?: string
	model?: string
	insights: Insight[]
	error?: string
	message?: string
}

const BRAND = '#ea5c33'
const BLUE = '#3b82f6'
const GREEN = '#10b981'

// Members that share a single car-sharing household; their values are summed
// when the "groepeer per huishouden" toggle is enabled.
const HOUSEHOLDS: string[][] = [
	['Bart Roorda', 'Janine Terlouw'],
	['Deborah Cheng', 'Shen Cheng'],
	['Jeroen van Veen', 'Wout Adriana Vervaart']
]

const normalizeName = (name: string) =>
	name.replace(/\s+/g, ' ').trim().toLowerCase()

const householdLabelByName = new Map<string, string>()
for (const members of HOUSEHOLDS) {
	const label = members.join(' & ')
	for (const member of members) {
		householdLabelByName.set(normalizeName(member), label)
	}
}

function groupUsersByHousehold(users: UserRow[]): UserRow[] {
	const grouped = new Map<string, UserRow>()
	for (const u of users) {
		const key = householdLabelByName.get(normalizeName(u.name)) || u.name
		const existing = grouped.get(key)
		if (existing) {
			existing.reservations += u.reservations
			existing.km = Math.round((existing.km + u.km) * 10) / 10
			existing.effectiveHours =
				Math.round((existing.effectiveHours + u.effectiveHours) * 10) / 10
			existing.income = Math.round((existing.income + u.income) * 100) / 100
			existing.reservationsPrivate += u.reservationsPrivate
			existing.kmPrivate = Math.round((existing.kmPrivate + u.kmPrivate) * 10) / 10
			existing.effectiveHoursPrivate =
				Math.round((existing.effectiveHoursPrivate + u.effectiveHoursPrivate) * 10) /
				10
			existing.incomePrivate =
				Math.round((existing.incomePrivate + u.incomePrivate) * 100) / 100
		} else {
			grouped.set(key, {
				name: key,
				reservations: u.reservations,
				km: u.km,
				effectiveHours: u.effectiveHours,
				income: u.income,
				reservationsPrivate: u.reservationsPrivate,
				kmPrivate: u.kmPrivate,
				effectiveHoursPrivate: u.effectiveHoursPrivate,
				incomePrivate: u.incomePrivate
			})
		}
	}
	return Array.from(grouped.values())
}

const euro = (v: number) =>
	new Intl.NumberFormat('nl-NL', {
		style: 'currency',
		currency: 'EUR',
		maximumFractionDigits: 0
	}).format(v)

const euro2 = (v: number) =>
	new Intl.NumberFormat('nl-NL', {
		style: 'currency',
		currency: 'EUR'
	}).format(v)

const num = (v: number) => new Intl.NumberFormat('nl-NL').format(v)

const formatDateNL = (iso: string) => {
	const [y, m, d] = iso.split('-')
	return `${d}-${m}-${y}`
}

export default function JaaroverzichtPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [user, setUser] = useState<AdminUser | null>(null)
	const [data, setData] = useState<OverviewData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [selectedYear, setSelectedYear] = useState('all')
	const [availableYears, setAvailableYears] = useState<number[]>([])
	const [insights, setInsights] = useState<InsightsResponse | null>(null)
	const [insightsLoading, setInsightsLoading] = useState(false)
	const [groupByHousehold, setGroupByHousehold] = useState(false)
	const [includeBusiness, setIncludeBusiness] = useState(true)
	const router = useRouter()

	const loadInsights = useCallback(async (year: string) => {
		setInsightsLoading(true)
		setInsights(null)
		try {
			const response = await fetch(`/api/admin/insights?year=${year}`, {
				method: 'POST'
			})
			const json = await response.json()
			setInsights(json)
		} catch {
			setInsights({
				success: false,
				configured: true,
				insights: [],
				error: 'Kon de insights niet laden'
			})
		} finally {
			setInsightsLoading(false)
		}
	}, [])

	const loadOverview = useCallback(async (year: string = 'all') => {
		setIsLoading(true)
		setError('')
		setSelectedYear(year)
		try {
			const response = await fetch(`/api/admin/jaaroverzicht?year=${year}`)
			if (response.status === 401) {
				setIsLoggedIn(false)
				return
			}
			const json = await response.json()
			if (response.ok && json.success) {
				setData(json)
				if (Array.isArray(json.availableYears)) {
					setAvailableYears(json.availableYears)
				}
				if (!json.empty) {
					loadInsights(year)
				}
			} else {
				setError(json.error || 'Kon het jaaroverzicht niet laden')
			}
		} catch {
			setError('Er is een fout opgetreden bij het laden van de gegevens')
		} finally {
			setIsLoading(false)
		}
	}, [loadInsights])

	const checkAuthStatus = useCallback(async () => {
		try {
			const response = await fetch('/api/admin/check-auth')
			if (response.ok) {
				const result = await response.json()
				if (result.isLoggedIn) {
					setIsLoggedIn(true)
					setUser(result.user)
					await loadOverview()
					return
				}
			}
			setIsLoggedIn(false)
			setIsLoading(false)
		} catch (err) {
			console.error('Error checking auth status:', err)
			setIsLoggedIn(false)
			setIsLoading(false)
		}
	}, [loadOverview])

	useEffect(() => {
		checkAuthStatus()
	}, [checkAuthStatus])

	const handleLogout = async () => {
		try {
			await fetch('/api/admin/logout', { method: 'POST' })
			setIsLoggedIn(false)
			setUser(null)
			router.push('/admin')
		} catch (err) {
			console.error('Error logging out:', err)
		}
	}

	const sidebarItems = [
		{ href: '/admin', label: 'Dashboard', isActive: false },
		{ href: '/admin/jaaroverzicht', label: 'Jaaroverzicht', isActive: true },
		{ href: '/admin/maandincasso', label: 'Maandincasso', isActive: false }
	]

	if (!isLoggedIn && !isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 dark:from-[#ea5c33]/10 dark:via-gray-900 dark:to-[#ea5c33]/10 flex items-center justify-center px-4">
				<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 text-center max-w-md">
					<p className="text-gray-700 dark:text-gray-200 mb-4">
						Je moet ingelogd zijn om het jaaroverzicht te bekijken.
					</p>
					<a
						href="/admin"
						className="inline-block px-6 py-3 bg-[#ea5c33] hover:bg-[#ea5c33]/90 text-white font-medium rounded-lg transition-colors cursor-pointer"
					>
						Naar admin login
					</a>
				</div>
			</div>
		)
	}

	return (
		<AdminLayout
			title="Deelauto Nijverhoek admin"
			sidebarItems={sidebarItems}
			onLogout={handleLogout}
		>
			<div className="flex flex-wrap items-end justify-between gap-3 mb-6">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						{selectedYear === 'all' ? 'Overzicht (alle tijd)' : `Jaaroverzicht ${selectedYear}`}
					</h2>
					{data && !data.empty && (
						<p className="text-gray-600 dark:text-gray-300 mt-1">
							Periode {formatDateNL(data.period.start)} t/m{' '}
							{formatDateNL(data.period.end)} ({data.period.days} dagen) ·{' '}
							{user?.email}
						</p>
					)}
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						<PeriodButton
							label="Totaal"
							active={selectedYear === 'all'}
							onClick={() => loadOverview('all')}
						/>
						{availableYears.map((year) => (
							<PeriodButton
								key={year}
								label={`${year}`}
								active={selectedYear === `${year}`}
								onClick={() => loadOverview(`${year}`)}
							/>
						))}
					</div>
					<button
						onClick={() => loadOverview(selectedYear)}
						className="px-4 py-2 text-sm font-medium text-[#ea5c33] border border-[#ea5c33] rounded-lg hover:bg-[#ea5c33]/10 transition-colors cursor-pointer"
					>
						Ververs
					</button>
				</div>
			</div>

			{isLoading && (
				<div className="flex items-center justify-center py-20">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea5c33] mx-auto mb-4" />
						<p className="text-gray-600 dark:text-gray-300">Gegevens laden...</p>
					</div>
				</div>
			)}

			{!isLoading && error && (
				<div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg">
					{error}
				</div>
			)}

			{!isLoading && data?.empty && (
				<div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 p-4 rounded-lg">
					Er zijn nog geen reserveringen om te tonen.
				</div>
			)}

			{!isLoading && data && !data.empty && (
				<div className="space-y-6">
					{/* KPI cards */}
					<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
						<KpiCard
							label="Totaal gereden"
							value={`${num(data.kpis.totalKm)} km`}
							sub={`${num(data.kpis.avgKmPerReservation)} km per rit`}
						/>
						<KpiCard
							label="Effectief gebruikt"
							value={`${num(data.kpis.totalEffectiveHours)} uur`}
							sub={`${num(data.kpis.avgEffectiveHoursPerReservation)} uur per rit`}
						/>
						<KpiCard
							label="Verhuringen"
							value={num(data.kpis.totalReservations)}
							sub={`${data.kpis.avgReservationsPerDay} per dag · ${data.kpis.activeUsers} gebruikers`}
						/>
						<KpiCard
							label={`Beschikbaar (${data.window.startHour}:00–24:00)`}
							value={`${data.kpis.avgAvailableHoursPerDay} uur/dag`}
							sub={`binnen deze ${data.window.hours} uur`}
						/>
						<KpiCard
							label="Inkomsten totaal"
							value={euro(data.kpis.incomeTotal)}
							sub={`zakelijk ${euro(data.kpis.incomeBusiness)} · privé ${euro(data.kpis.incomePrivate)}`}
						/>
						<KpiCard
							label="Betaald"
							value={euro(data.kpis.paidTotal)}
							sub={`open: ${euro2(data.kpis.outstandingTotal)}`}
						/>
					</div>

					{/* AI Insights */}
					<InsightsSection
						loading={insightsLoading}
						insights={insights}
					/>

					{/* Income split per month */}
					<Panel title="Inkomsten per maand (zakelijk vs privé)">
						<StackedBarChart
							data={data.monthly.map((m) => ({
								label: m.label,
								values: [m.incomePrivate, m.incomeBusiness]
							}))}
							colors={[BRAND, BLUE]}
							seriesLabels={['Privé', 'Zakelijk']}
							formatValue={(v) => euro(v)}
						/>
					</Panel>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Panel title="Verhuringen per maand">
							<BarChart
								data={data.monthly.map((m) => ({
									label: m.label,
									value: m.reservations
								}))}
								color={BRAND}
								formatValue={(v) => `${v}`}
							/>
						</Panel>

						<Panel title="Gereden kilometers per maand">
							<BarChart
								data={data.monthly.map((m) => ({
									label: m.label,
									value: m.km
								}))}
								color={BLUE}
								formatValue={(v) => `${num(v)} km`}
							/>
						</Panel>

						<Panel title="Effectief gebruikte uren per maand">
							<BarChart
								data={data.monthly.map((m) => ({
									label: m.label,
									value: m.effectiveHours
								}))}
								color={GREEN}
								formatValue={(v) => `${num(v)} u`}
							/>
						</Panel>

						<Panel
							title={`Gem. beschikbare uren per dag (${data.window.startHour}:00–24:00)`}
						>
							<BarChart
								data={data.monthly.map((m) => ({
									label: m.label,
									value: m.avgAvailableHoursPerDay
								}))}
								color="#8b5cf6"
								formatValue={(v) => `${v} u`}
							/>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
								Het beschikbaarheidsvenster is {data.window.hours} uur per dag.
								Hoe hoger de balk, hoe meer de auto vrij was om te boeken.
							</p>
						</Panel>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Panel title="Verhuringen per weekdag">
							<BarChart
								data={data.byWeekday.map((w) => ({
									label: w.label,
									value: w.reservations
								}))}
								color={BRAND}
								formatValue={(v) => `${v}`}
							/>
						</Panel>

						<Panel title="Gebruik per uur van de dag (effectieve uren)">
							<BarChart
								data={data.byHour.map((h) => ({
									label: h.hour % 3 === 0 ? `${h.hour}` : '',
									value: h.occupiedHours
								}))}
								color={GREEN}
								formatValue={(v) => `${v} u`}
							/>
						</Panel>
					</div>

					{/* Per user */}
					{(() => {
						const userRows = groupByHousehold
							? groupUsersByHousehold(data.byUser)
							: data.byUser
						const pickIncome = (u: UserRow) =>
							includeBusiness ? u.income : u.incomePrivate
						const pickKm = (u: UserRow) =>
							includeBusiness ? u.km : u.kmPrivate
						const pickReservations = (u: UserRow) =>
							includeBusiness ? u.reservations : u.reservationsPrivate
						const pickHours = (u: UserRow) =>
							includeBusiness ? u.effectiveHours : u.effectiveHoursPrivate
						const byIncome = [...userRows].sort(
							(a, b) => pickIncome(b) - pickIncome(a)
						)
						const byKm = [...userRows].sort((a, b) => pickKm(b) - pickKm(a))
						const entityLabel = groupByHousehold ? 'huishouden' : 'gebruiker'
						return (
							<div className="space-y-4">
								<div className="flex flex-wrap justify-end gap-x-6 gap-y-2">
									<LabeledToggle
										label="Groepeer per huishouden"
										checked={groupByHousehold}
										onChange={setGroupByHousehold}
									/>
									<LabeledToggle
										label="Zakelijke ritten inclusief"
										checked={includeBusiness}
										onChange={setIncludeBusiness}
									/>
								</div>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
									<Panel title={`Inkomsten per ${entityLabel}`}>
										<HBarList
											data={byIncome.map((u) => ({
												label: u.name,
												value: pickIncome(u),
												caption: `${pickReservations(u)} ritten`
											}))}
											color={BRAND}
											formatValue={(v) => euro2(v)}
										/>
									</Panel>

									<Panel title={`Kilometers per ${entityLabel}`}>
										<HBarList
											data={byKm.map((u) => ({
												label: u.name,
												value: pickKm(u),
												caption: `${pickHours(u)} u`
											}))}
											color={BLUE}
											formatValue={(v) => `${num(v)} km`}
										/>
									</Panel>
								</div>
							</div>
						)
					})()}

					{/* Monthly detail table */}
					<Panel title="Maanddetails">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
										<th className="py-2 pr-4 font-medium">Maand</th>
										<th className="py-2 pr-4 font-medium text-right">Ritten</th>
										<th className="py-2 pr-4 font-medium text-right">Km</th>
										<th className="py-2 pr-4 font-medium text-right">Effectieve uren</th>
										<th className="py-2 pr-4 font-medium text-right">Beschikbaar/dag</th>
										<th className="py-2 pr-4 font-medium text-right">Bezetting</th>
										<th className="py-2 pr-4 font-medium text-right">Privé</th>
										<th className="py-2 pr-4 font-medium text-right">Zakelijk</th>
										<th className="py-2 font-medium text-right">Totaal</th>
									</tr>
								</thead>
								<tbody>
									{data.monthly.map((m) => (
										<tr
											key={m.month}
											className="border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200"
										>
											<td className="py-2 pr-4">{m.label}</td>
											<td className="py-2 pr-4 text-right">{m.reservations}</td>
											<td className="py-2 pr-4 text-right">{num(m.km)}</td>
											<td className="py-2 pr-4 text-right">{num(m.effectiveHours)}</td>
											<td className="py-2 pr-4 text-right">{m.avgAvailableHoursPerDay} u</td>
											<td className="py-2 pr-4 text-right">{m.occupancyPct}%</td>
											<td className="py-2 pr-4 text-right">{euro2(m.incomePrivate)}</td>
											<td className="py-2 pr-4 text-right">{euro2(m.incomeBusiness)}</td>
											<td className="py-2 text-right font-medium">{euro2(m.incomeTotal)}</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className="text-gray-900 dark:text-gray-100 font-semibold">
										<td className="py-2 pr-4">Totaal</td>
										<td className="py-2 pr-4 text-right">{data.kpis.totalReservations}</td>
										<td className="py-2 pr-4 text-right">{num(data.kpis.totalKm)}</td>
										<td className="py-2 pr-4 text-right">{num(data.kpis.totalEffectiveHours)}</td>
										<td className="py-2 pr-4 text-right">{data.kpis.avgAvailableHoursPerDay} u</td>
										<td className="py-2 pr-4 text-right">{data.kpis.occupancyPct}%</td>
										<td className="py-2 pr-4 text-right">{euro2(data.kpis.incomePrivate)}</td>
										<td className="py-2 pr-4 text-right">{euro2(data.kpis.incomeBusiness)}</td>
										<td className="py-2 text-right">{euro2(data.kpis.incomeTotal)}</td>
									</tr>
								</tfoot>
							</table>
						</div>
					</Panel>
				</div>
			)}
		</AdminLayout>
	)
}

function InsightsSection({
	loading,
	insights
}: {
	loading: boolean
	insights: InsightsResponse | null
}) {
	const generatedLabel = insights?.generatedAt
		? new Date(insights.generatedAt).toLocaleDateString('nl-NL', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})
		: null

	return (
		<div className="bg-gradient-to-br from-[#ea5c33]/10 to-purple-500/5 dark:from-[#ea5c33]/15 dark:to-purple-500/10 rounded-2xl shadow-sm p-5 border border-[#ea5c33]/20">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-4">
				<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
					<span aria-hidden>✨</span> Insights
					<span className="text-xs font-normal text-gray-400 dark:text-gray-500">
						AI-analyse
					</span>
				</h3>
				{generatedLabel && (
					<span className="text-xs text-gray-400 dark:text-gray-500">
						Gegenereerd op {generatedLabel} · ververst ~1× per maand
					</span>
				)}
			</div>

			{loading && (
				<div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 py-4">
					<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#ea5c33]" />
					<span>De auto-data wordt geanalyseerd...</span>
				</div>
			)}

			{!loading && insights && !insights.configured && (
				<div className="text-sm text-gray-700 dark:text-gray-200 bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
					<p className="font-medium mb-1">AI is nog niet geconfigureerd</p>
					<p className="text-gray-600 dark:text-gray-300">
						Zet je Mistral API key in{' '}
						<code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
							.env.local
						</code>{' '}
						als{' '}
						<code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
							MISTRAL_API_KEY
						</code>{' '}
						en herstart de server. Daarna verschijnen hier automatisch inzichten.
					</p>
				</div>
			)}

			{!loading &&
				insights &&
				insights.configured &&
				insights.error &&
				insights.insights.length === 0 && (
					<div className="text-sm text-red-600 dark:text-red-400 bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
						{insights.error}
					</div>
				)}

			{!loading && insights && insights.insights.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{insights.insights.map((insight, i) => (
						<div
							key={i}
							className="flex gap-3 bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-gray-100 dark:border-gray-700"
						>
							<div className="text-2xl leading-none shrink-0" aria-hidden>
								{insight.emoji}
							</div>
							<div>
								<p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
									{insight.title}
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
									{insight.text}
								</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

function LabeledToggle({
	label,
	checked,
	onChange
}: {
	label: string
	checked: boolean
	onChange: (value: boolean) => void
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onChange(!checked)}
			className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
		>
			<span
				className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
					checked ? 'bg-[#ea5c33]' : 'bg-gray-300 dark:bg-gray-600'
				}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
						checked ? 'translate-x-4' : 'translate-x-1'
					}`}
				/>
			</span>
			{label}
		</button>
	)
}

function PeriodButton({
	label,
	active,
	onClick
}: {
	label: string
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			onClick={onClick}
			className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-r last:border-r-0 border-gray-200 dark:border-gray-700 ${
				active
					? 'bg-[#ea5c33] text-white'
					: 'bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 hover:bg-[#ea5c33]/10'
			}`}
		>
			{label}
		</button>
	)
}

function KpiCard({
	label,
	value,
	sub
}: {
	label: string
	value: string
	sub?: string
}) {
	return (
		<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
			<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
			<p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
				{value}
			</p>
			{sub && (
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
			)}
		</div>
	)
}

function Panel({
	title,
	children
}: {
	title: string
	children: ReactNode
}) {
	return (
		<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
			<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
				{title}
			</h3>
			{children}
		</div>
	)
}
