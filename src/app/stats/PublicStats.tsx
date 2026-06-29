'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import Link from 'next/link'
import { BarChart } from '@/components/charts/ReportCharts'

interface PublicMonthlyRow {
	month: string
	label: string
	reservations: number
	km: number
	effectiveHours: number
	reservedHours: number
	avgAvailableHoursPerDay: number
	occupancyPct: number
}

interface PublicWeekdayRow {
	weekday: number
	label: string
	reservations: number
	effectiveHours: number
}

interface PublicHourRow {
	hour: number
	occupiedHours: number
}

interface PublicOverviewData {
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
		activeUsers: number
	}
	monthly: PublicMonthlyRow[]
	byWeekday: PublicWeekdayRow[]
	byHour: PublicHourRow[]
}

const BRAND = '#ea5c33'
const BLUE = '#3b82f6'
const GREEN = '#10b981'

const num = (v: number) => new Intl.NumberFormat('nl-NL').format(v)

const formatDateNL = (iso: string) => {
	const [y, m, d] = iso.split('-')
	return `${d}-${m}-${y}`
}

export default function PublicStats() {
	const [data, setData] = useState<PublicOverviewData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [selectedYear, setSelectedYear] = useState('all')
	const [availableYears, setAvailableYears] = useState<number[]>([])

	const loadOverview = useCallback(async (year: string = 'all') => {
		setIsLoading(true)
		setError('')
		setSelectedYear(year)
		try {
			const response = await fetch(`/api/stats/public?year=${year}`)
			const json = await response.json()
			if (response.ok && json.success) {
				setData(json)
				if (Array.isArray(json.availableYears)) {
					setAvailableYears(json.availableYears)
				}
			} else {
				setError(json.error || 'Kon de statistieken niet laden')
			}
		} catch {
			setError('Er is een fout opgetreden bij het laden van de gegevens')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadOverview()
	}, [loadOverview])

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 dark:from-[#ea5c33]/10 dark:via-gray-900 dark:to-[#ea5c33]/10">
			<header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16 gap-3">
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 bg-gradient-to-r from-[#ea5c33] to-[#ea5c33] bg-clip-text text-transparent">
							Deelauto Nijverhoek stats
						</h1>
						<div className="flex items-center gap-2">
							<a
								href={`/mijn/login?redirect=${encodeURIComponent('/stats')}`}
								className="px-4 py-2 text-sm font-medium text-white bg-[#ea5c33] hover:bg-[#ea5c33]/90 rounded-md transition-colors cursor-pointer"
							>
								Login
							</a>
							<Link
								href="/"
								className="px-4 py-2 text-sm font-medium text-[#ea5c33] border border-[#ea5c33] hover:bg-[#ea5c33]/10 rounded-md transition-colors cursor-pointer"
							>
								Meer informatie
							</Link>
						</div>
					</div>
				</div>
			</header>

			<main className="flex-1 p-4 sm:p-6 lg:p-8">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-wrap items-end justify-between gap-3 mb-6">
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
								{selectedYear === 'all'
									? 'Overzicht (totaal)'
									: `Jaaroverzicht ${selectedYear}`}
							</h2>
							{data && !data.empty && (
								<p className="text-gray-600 dark:text-gray-300 mt-1">
									Periode {formatDateNL(data.period.start)} t/m{' '}
									{formatDateNL(data.period.end)} ({data.period.days} dagen)
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
							<div className="grid grid-cols-2 gap-4">
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
							</div>

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
						</div>
					)}
				</div>
			</main>
		</div>
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
