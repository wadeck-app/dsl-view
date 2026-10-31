import React from 'react';

import { ChartSwatch } from './_ChartSwatch.js';
import { numberAt } from './timeSeriesMath.js';
import type { SeriesSettings } from './timeSeriesProps.js';

// @formatter:off
const TOOLTIP_CLASS = 'pointer-events-none absolute z-10 min-w-[180px] max-w-[260px] rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-content shadow-md';
// @formatter:on

export interface TimeSeriesTooltipProps {
	/** Date (and time of day) of the hovered x. */
	heading: string;
	/** Every row sharing the hovered x (several bars can sit on one day). */
	rows: Record<string, unknown>[];
	series: SeriesSettings[];
	formatValue: (value: number, series: SeriesSettings) => string;
	/** Position inside the chart box, in px. */
	left: number;
	top: number;
}

/** Hover card of a TimeSeriesChart: one line per series that has a value on the hovered day, in series order. */
export function TimeSeriesTooltip({ heading, rows, series, formatValue, left, top }: TimeSeriesTooltipProps): React.ReactElement {
	const anyValue = rows.some(row => series.some(s => numberAt(row, s.key) !== null));
	return (
		<div
			role="tooltip"
			className={TOOLTIP_CLASS}
			style={{ left, top }}
		>
			<div className="mb-0.5 font-semibold">{heading}</div>
			{rows.flatMap((row, rowIndex) =>
				series.map((s, i) => {
					const value = numberAt(row, s.key);
					if (value === null) {
						return null;
					}
					const from = s.fromKey ? numberAt(row, s.fromKey) : null;
					if (s.fromKey && from === null) {
						return null;
					}
					const colorField = s.pointColorKey ? row[s.pointColorKey] : undefined;
					const swatch = typeof colorField === 'string' && colorField !== '' ? colorField : s.color;
					const detail = s.detailKey ? row[s.detailKey] : undefined;
					return (
						<div key={`${rowIndex}-${i}`} className="mt-0.5">
							<span className="mr-1.5 inline-block align-middle">
								<ChartSwatch shape="dot" color={swatch} />
							</span>
							{s.name}
							{s.showValue && (
								<>
									: <strong>{from === null ? formatValue(value, s) : `${formatValue(from, s)} - ${formatValue(value, s)}`}</strong>
								</>
							)}
							{typeof detail === 'string' && detail !== '' && <div className="ml-3.5 text-muted">{detail}</div>}
						</div>
					);
				}),
			)}
			{/* A day without any value is said so, instead of an empty box. */}
			{!anyValue && <div className="mt-0.5 text-muted">No value this day</div>}
		</div>
	);
}
