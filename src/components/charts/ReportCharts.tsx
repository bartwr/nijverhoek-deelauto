'use client'

import { useEffect, useState } from 'react'

const BRAND = '#ea5c33'

interface BarDatum {
	label: string
	value: number
	sublabel?: string
}

interface BarChartProps {
	data: BarDatum[]
	color?: string
	unit?: string
	formatValue?: (value: number) => string
	height?: number
}

/**
 * Computes "nice" rounded axis ticks so gridlines land on readable values.
 * Bars are scaled against niceMax (>= data max) so gridlines align with bars.
 */
function computeTicks(max: number): { ticks: number[]; niceMax: number } {
	if (max <= 0) {
		return { ticks: [1], niceMax: 1 }
	}
	const rough = max / 4
	const pow = Math.pow(10, Math.floor(Math.log10(rough)))
	let step = pow * 10
	for (const c of [1, 2, 2.5, 5, 10]) {
		if (c * pow >= rough) {
			step = c * pow
			break
		}
	}
	const niceMax = Math.ceil(max / step - 1e-9) * step
	const ticks: number[] = []
	for (let t = step; t <= niceMax + step / 2; t += step) {
		ticks.push(Math.round(t * 100) / 100)
	}
	return { ticks, niceMax }
}

/**
 * Vertical bar chart built with plain divs (no external dependency).
 *
 * A y-axis with gridlines appears when hovering the chart (desktop) or after
 * tapping a bar (mobile). Tapping a bar also toggles its value label.
 */
export function BarChart({
	data,
	color = BRAND,
	unit = '',
	formatValue,
	height = 200
}: BarChartProps) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null)
	const max = Math.max(1, ...data.map((d) => d.value))
	const { ticks, niceMax } = computeTicks(max)
	const fmt = formatValue || ((v: number) => `${v}${unit ? ` ${unit}` : ''}`)
	const axisVisible = activeIndex !== null

	useEffect(() => {
		setActiveIndex(null)
	}, [data])

	return (
		<div className="w-full overflow-x-auto">
			<div className="w-fit min-w-full">
				<div className="relative group/chart">
					<div
						className={`absolute inset-0 pointer-events-none transition-opacity ${
							axisVisible
								? 'opacity-100'
								: 'opacity-0 group-hover/chart:opacity-100'
						}`}
						aria-hidden="true"
					>
						{ticks.map((t, ti) => {
							const isTopTick = ti === ticks.length - 1
							return (
								<div
									key={t}
									className="absolute inset-x-0 border-t border-dashed border-gray-300 dark:border-gray-600"
									style={{ bottom: `${(t / niceMax) * 100}%` }}
								>
									<span
										className={`sticky left-0 inline-block text-[10px] text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 px-1 rounded whitespace-nowrap ${
											isTopTick ? '' : '-translate-y-1/2'
										}`}
									>
										{fmt(t)}
									</span>
								</div>
							)
						})}
					</div>
					<div
						className="flex items-end gap-2 min-w-full"
						style={{ height }}
					>
						{data.map((d, i) => {
							const pct = (d.value / niceMax) * 100
							const isActive = activeIndex === i
							return (
								<div
									key={`${d.label}-${i}`}
									className="flex-1 min-w-[28px] flex flex-col items-center justify-end h-full group cursor-pointer"
									role="button"
									tabIndex={0}
									aria-label={`${d.label}: ${fmt(d.value)}`}
									onClick={() =>
										setActiveIndex(isActive ? null : i)
									}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault()
											setActiveIndex(isActive ? null : i)
										}
									}}
								>
									<div
										className={`text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 transition-opacity whitespace-nowrap ${
											isActive
												? 'opacity-100'
												: 'opacity-0 group-hover:opacity-100'
										}`}
									>
										{fmt(d.value)}
									</div>
									<div
										className="w-full rounded-t-md transition-all"
										style={{
											height: `${pct}%`,
											minHeight: d.value > 0 ? 2 : 0,
											backgroundColor: color,
											opacity:
												activeIndex === null || isActive ? 1 : 0.45
										}}
										title={`${d.label}: ${fmt(d.value)}`}
									/>
								</div>
							)
						})}
					</div>
				</div>
				<div className="flex gap-2 min-w-full mt-2">
					{data.map((d, i) => (
						<div
							key={`label-${d.label}-${i}`}
							className="flex-1 min-w-[28px] text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
						>
							{d.label}
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

interface StackedDatum {
	label: string
	values: number[]
}

interface StackedBarChartProps {
	data: StackedDatum[]
	colors: string[]
	seriesLabels: string[]
	formatValue?: (value: number) => string
	height?: number
}

/**
 * Stacked vertical bar chart (e.g. zakelijk vs privé income).
 *
 * A y-axis with gridlines appears when hovering the chart (desktop) or after
 * tapping a bar (mobile). Tapping a bar also toggles its value label.
 */
export function StackedBarChart({
	data,
	colors,
	seriesLabels,
	formatValue,
	height = 220
}: StackedBarChartProps) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null)
	const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0))
	const max = Math.max(1, ...totals)
	const { ticks, niceMax } = computeTicks(max)
	const fmt = formatValue || ((v: number) => `${v}`)
	const axisVisible = activeIndex !== null

	useEffect(() => {
		setActiveIndex(null)
	}, [data])

	return (
		<div className="w-full">
			<div className="flex flex-wrap gap-4 mb-3">
				{seriesLabels.map((label, i) => (
					<div key={label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
						<span
							className="inline-block w-3 h-3 rounded-sm"
							style={{ backgroundColor: colors[i] }}
						/>
						{label}
					</div>
				))}
			</div>
			<div className="w-full overflow-x-auto">
				<div className="w-fit min-w-full">
					<div className="relative group/chart">
						<div
							className={`absolute inset-0 pointer-events-none transition-opacity ${
								axisVisible
									? 'opacity-100'
									: 'opacity-0 group-hover/chart:opacity-100'
							}`}
							aria-hidden="true"
						>
							{ticks.map((t, ti) => {
								const isTopTick = ti === ticks.length - 1
								return (
									<div
										key={t}
										className="absolute inset-x-0 border-t border-dashed border-gray-300 dark:border-gray-600"
										style={{ bottom: `${(t / niceMax) * 100}%` }}
									>
										<span
											className={`sticky left-0 inline-block text-[10px] text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 px-1 rounded whitespace-nowrap ${
												isTopTick ? '' : '-translate-y-1/2'
											}`}
										>
											{fmt(t)}
										</span>
									</div>
								)
							})}
						</div>
						<div className="flex items-end gap-2 min-w-full" style={{ height }}>
							{data.map((d, i) => {
								const total = totals[i]
								const totalPct = (total / niceMax) * 100
								const isActive = activeIndex === i
								return (
									<div
										key={`${d.label}-${i}`}
										className="flex-1 min-w-[28px] flex flex-col items-center justify-end h-full group cursor-pointer"
										role="button"
										tabIndex={0}
										aria-label={`${d.label}: ${fmt(total)}`}
										onClick={() =>
											setActiveIndex(isActive ? null : i)
										}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault()
												setActiveIndex(isActive ? null : i)
											}
										}}
									>
										<div
											className={`text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 transition-opacity whitespace-nowrap ${
												isActive
													? 'opacity-100'
													: 'opacity-0 group-hover:opacity-100'
											}`}
										>
											{fmt(total)}
										</div>
										<div
											className="w-full flex flex-col justify-end rounded-t-md overflow-hidden transition-opacity"
											style={{
												height: `${totalPct}%`,
												minHeight: total > 0 ? 2 : 0,
												opacity:
													activeIndex === null || isActive ? 1 : 0.45
											}}
											title={`${d.label}: ${fmt(total)}`}
										>
											{d.values.map((v, si) => {
												const segPct = total > 0 ? (v / total) * 100 : 0
												return (
													<div
														key={si}
														style={{
															height: `${segPct}%`,
															backgroundColor: colors[si]
														}}
													/>
												)
											})}
										</div>
									</div>
								)
							})}
						</div>
					</div>
					<div className="flex gap-2 min-w-full mt-2">
						{data.map((d, i) => (
							<div
								key={`label-${d.label}-${i}`}
								className="flex-1 min-w-[28px] text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
							>
								{d.label}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

interface HBarDatum {
	label: string
	value: number
	caption?: string
}

interface HBarListProps {
	data: HBarDatum[]
	color?: string
	formatValue?: (value: number) => string
}

/**
 * Horizontal bar list (e.g. per-user breakdown).
 */
export function HBarList({
	data,
	color = BRAND,
	formatValue
}: HBarListProps) {
	const max = Math.max(1, ...data.map((d) => d.value))
	const fmt = formatValue || ((v: number) => `${v}`)

	return (
		<div className="space-y-3">
			{data.map((d, i) => {
				const pct = (d.value / max) * 100
				return (
					<div key={`${d.label}-${i}`}>
						<div className="flex justify-between text-sm mb-1">
							<span className="font-medium text-gray-700 dark:text-gray-200 truncate pr-2">
								{d.label}
							</span>
							<span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
								{fmt(d.value)}
								{d.caption && (
									<span className="text-gray-400 dark:text-gray-500 ml-2">
										{d.caption}
									</span>
								)}
							</span>
						</div>
						<div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
							<div
								className="h-full rounded-full"
								style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color }}
							/>
						</div>
					</div>
				)
			})}
		</div>
	)
}
