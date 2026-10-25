import React from 'react';
import {
	Area,
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { formatXTick, formatYTick, seriesColor } from './chartFormat.js';
import type { ChartXFormat, ChartYFormat } from './chartFormat.js';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

// @formatter:off
const emptyStateClass = 'flex items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted';
const containerClass = 'rounded-lg border border-border bg-surface p-4';
const compactContainerClass = 'rounded-lg border border-border bg-surface p-2';
// @formatter:on

const TICK_STYLE = { fontSize: 12, fill: 'var(--color-muted)' };
const TOOLTIP_STYLE = {
	background: 'var(--color-surface)',
	border: '1px solid var(--color-border)',
	borderRadius: 6,
	color: 'var(--color-content)',
	fontSize: 12,
};
const LEGEND_STYLE = { fontSize: 12, color: 'var(--color-muted)' };

export interface ChartSeriesConfig {
	key: string;
	name: string;
	/** Any CSS colour. Without it the series takes the next colour of the theme palette. */
	color?: string;
	/** @default 'line' */
	type: 'line' | 'bar' | 'area';
	/** @default 'left' */
	yAxisId: 'left' | 'right';
}

export interface ChartProps {
	/** Raw rows from $sources */
	data: unknown[] | undefined;
	xAxisKey: string;
	xAxisType: 'time' | 'category';
	/**
	 * How `xAxisType: time` ticks render: date (Jan 5), time (HH:MM) or datetime. Always the viewer's local
	 * time zone. Has no effect on a category axis (a console warning says so).
	 * @default 'date'
	 */
	xFormat?: ChartXFormat;
	/**
	 * Y tick labels. `bytes` (default, historical) renders 1753 as "1.7 KB"; use `number` for counts
	 * (1753 -> "1.8K").
	 * @default 'bytes'
	 */
	yFormat?: ChartYFormat;
	/** Suffix appended to every Y tick label, e.g. "%" or " ms". */
	yUnit?: string;
	/**
	 * `sparkline` is the compact widget look: no grid, no axes, no legend, the tooltip is kept.
	 * @default 'default'
	 */
	variant?: 'default' | 'sparkline';
	/** Show the legend. Defaults to true, and to false for `variant: sparkline`. */
	showLegend?: boolean;
	/** @default 300 */
	height?: number;
	series: ChartSeriesConfig[];
}

/**
 * @registryCategory composite
 * @registryTags chart
 * @registryLazy
 */
export function Chart({
	data,
	xAxisKey,
	xAxisType,
	xFormat,
	yFormat = 'bytes',
	yUnit,
	variant = 'default',
	showLegend,
	height = 300,
	series,
}: ChartProps) {
	const hasRightAxis = series.some(s => s.yAxisId === 'right');
	const sparkline = variant === 'sparkline';
	const legend = showLegend ?? !sparkline;

	React.useEffect(() => {
		if (xFormat !== undefined && xAxisType !== 'time') {
			reportAuthoringMistake(`[Chart] xFormat "${xFormat}" has no effect with xAxisType "${xAxisType}": use xAxisType: time with real timestamps.`);
		}
	}, [xFormat, xAxisType]);

	// Loading skeleton
	if (data === undefined) {
		return (
			<div
				className="animate-pulse motion-reduce:animate-none rounded-lg bg-bg-secondary"
				style={{ height }}
				role="status"
				aria-busy="true"
				aria-label="Loading chart"
			/>
		);
	}

	// Empty state
	if (data.length === 0) {
		return (
			<div
				className={emptyStateClass}
				style={{ height }}
			>
				No data
			</div>
		);
	}

	const tickX = (value: unknown): string => formatXTick(value, xAxisType, xFormat);
	const tickY = (value: unknown): string => formatYTick(value, yFormat, yUnit);
	// The tooltip heading carries the full moment when the axis only shows the time of day.
	const tooltipX = (value: unknown): string => formatXTick(value, xAxisType, xFormat === 'time' ? 'datetime' : xFormat);

	return (
		<div className={sparkline ? compactContainerClass : containerClass}>
			<ResponsiveContainer width="100%" height={height}>
				<ComposedChart data={data as Record<string, unknown>[]} margin={sparkline ? { top: 4, right: 4, bottom: 4, left: 4 } : undefined}>
					{!sparkline && <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />}
					<XAxis dataKey={xAxisKey} hide={sparkline} tickFormatter={tickX} tick={TICK_STYLE} tickLine={false} />
					<YAxis
						yAxisId="left"
						hide={sparkline}
						width={sparkline ? 0 : 90}
						tickFormatter={tickY}
						tick={TICK_STYLE}
						tickLine={false}
						axisLine={false}
					/>
					{hasRightAxis && (
						<YAxis
							yAxisId="right"
							orientation="right"
							hide={sparkline}
							width={sparkline ? 0 : 90}
							tickFormatter={tickY}
							tick={TICK_STYLE}
							tickLine={false}
							axisLine={false}
						/>
					)}
					<Tooltip
						formatter={(value: unknown, name: string) => [`${String(value)}${yUnit ?? ''}`, name]}
						labelFormatter={tooltipX}
						contentStyle={TOOLTIP_STYLE}
					/>
					{legend && <Legend wrapperStyle={LEGEND_STYLE} />}
					{series.map((s, index) => {
						const color = seriesColor(index, s.color);
						const { key, ...restProps } = {
							key: s.key,
							dataKey: s.key,
							name: s.name,
							stroke: color,
							fill: color,
							yAxisId: s.yAxisId ?? 'left',
						};
						if (s.type === 'bar') {
							return <Bar key={key} {...restProps} />;
						}
						if (s.type === 'area') {
							return <Area key={key} {...restProps} fillOpacity={0.2} dot={false} />;
						}
						// default: line
						return <Line key={key} {...restProps} dot={false} />;
					})}
				</ComposedChart>
			</ResponsiveContainer>
		</div>
	);
}
