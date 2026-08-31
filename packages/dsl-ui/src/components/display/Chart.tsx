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

// @formatter:off
const emptyStateClass = 'flex items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted';
const containerClass = 'rounded-lg border border-border bg-surface p-4';
// @formatter:on

export interface ChartSeriesConfig {
	key: string;
	name: string;
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
	/** @default 300 */
	height?: number;
	series: ChartSeriesConfig[];
}

/**
 * @registryCategory composite
 * @registryTags chart
 */
export function Chart({ data, xAxisKey, xAxisType, height = 300, series }: ChartProps) {
	const hasRightAxis = series.some(s => s.yAxisId === 'right');

	// Loading skeleton
	if (data === undefined) {
		return (
			<div
				className="animate-pulse rounded-lg bg-bg-secondary"
				style={{ height }}
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

	const formatXTick = (value: unknown): string => {
		if (xAxisType === 'time') {
			const d = new Date(value as string | number);
			return isNaN(d.getTime())
				? String(value)
				: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
		}
		return String(value);
	};

	const formatYTick = (value: unknown): string => {
		const n = Number(value);
		if (!isFinite(n)) return String(value);
		if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
		if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
		if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
		return String(n);
	};

	return (
		<div className={containerClass}>
			<ResponsiveContainer width="100%" height={height}>
				<ComposedChart data={data as Record<string, unknown>[]}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
					<XAxis dataKey={xAxisKey} tickFormatter={formatXTick} tick={{ fontSize: 12 }} tickLine={false} />
					<YAxis
						yAxisId="left"
						width={90}
						tickFormatter={formatYTick}
						tick={{ fontSize: 12 }}
						tickLine={false}
						axisLine={false}
					/>
					{hasRightAxis && (
						<YAxis
							yAxisId="right"
							orientation="right"
							width={90}
							tickFormatter={formatYTick}
							tick={{ fontSize: 12 }}
							tickLine={false}
							axisLine={false}
						/>
					)}
					<Tooltip
						formatter={(value: unknown, name: string) => [String(value), name]}
						labelFormatter={formatXTick}
					/>
					<Legend />
					{series.map(s => {
						const { key, ...restProps } = {
							key: s.key,
							dataKey: s.key,
							name: s.name,
							stroke: s.color,
							fill: s.color,
							yAxisId: s.yAxisId ?? 'left',
						};
						if (s.type === 'bar') return <Bar key={key} {...restProps} />;
						if (s.type === 'area') return <Area key={key} {...restProps} fillOpacity={0.2} dot={false} />;
						// default: line
						return <Line key={key} {...restProps} dot={false} />;
					})}
				</ComposedChart>
			</ResponsiveContainer>
		</div>
	);
}
