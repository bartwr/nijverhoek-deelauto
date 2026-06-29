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

const BRAND = '#ea5c33'
const BLUE = '#3b82f6'
const GREEN = '#10b981'

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
	const router = useRouter()

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
			} else {
				setError(json.error || 'Kon het jaaroverzicht niet laden')
			}
		} catch {
			setError('Er is een fout opgetreden bij het laden van de gegevens')
		} finally {
			setIsLoading(false)
		}
	}, [])

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
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Panel title="Inkomsten per gebruiker">
							<HBarList
								data={data.byUser.map((u) => ({
									label: u.name,
									value: u.income,
									caption: `${u.reservations} ritten`
								}))}
								color={BRAND}
								formatValue={(v) => euro2(v)}
							/>
						</Panel>

						<Panel title="Kilometers per gebruiker">
							<HBarList
								data={[...data.byUser]
									.sort((a, b) => b.km - a.km)
									.map((u) => ({
										label: u.name,
										value: u.km,
										caption: `${u.effectiveHours} u`
									}))}
								color={BLUE}
								formatValue={(v) => `${num(v)} km`}
							/>
						</Panel>
					</div>

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
