'use client'

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
 * Vertical bar chart built with plain divs (no external dependency).
 */
export function BarChart({
	data,
	color = BRAND,
	unit = '',
	formatValue,
	height = 200
}: BarChartProps) {
	const max = Math.max(1, ...data.map((d) => d.value))
	const fmt = formatValue || ((v: number) => `${v}${unit ? ` ${unit}` : ''}`)

	return (
		<div className="w-full overflow-x-auto">
			<div
				className="flex items-end gap-2 min-w-full"
				style={{ height }}
			>
				{data.map((d, i) => {
					const pct = (d.value / max) * 100
					return (
						<div
							key={`${d.label}-${i}`}
							className="flex-1 min-w-[28px] flex flex-col items-center justify-end h-full group"
						>
							<div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
								{fmt(d.value)}
							</div>
							<div
								className="w-full rounded-t-md transition-all"
								style={{
									height: `${pct}%`,
									minHeight: d.value > 0 ? 2 : 0,
									backgroundColor: color
								}}
								title={`${d.label}: ${fmt(d.value)}`}
							/>
						</div>
					)
				})}
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
 */
export function StackedBarChart({
	data,
	colors,
	seriesLabels,
	formatValue,
	height = 220
}: StackedBarChartProps) {
	const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0))
	const max = Math.max(1, ...totals)
	const fmt = formatValue || ((v: number) => `${v}`)

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
				<div className="flex items-end gap-2 min-w-full" style={{ height }}>
					{data.map((d, i) => {
						const total = totals[i]
						const totalPct = (total / max) * 100
						return (
							<div
								key={`${d.label}-${i}`}
								className="flex-1 min-w-[28px] flex flex-col items-center justify-end h-full group"
							>
								<div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
									{fmt(total)}
								</div>
								<div
									className="w-full flex flex-col justify-end rounded-t-md overflow-hidden"
									style={{ height: `${totalPct}%`, minHeight: total > 0 ? 2 : 0 }}
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
