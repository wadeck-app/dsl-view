import React, { useId } from 'react';

import { barBox, numberAt } from './timeSeriesMath.js';
import type { TimeWindow } from './timeSeriesMath.js';
import type { SeriesSettings } from './timeSeriesProps.js';

export interface TimeSeriesBarsProps {
	barRows: Record<string, unknown>[];
	barSeries: SeriesSettings[];
	/** Y domain of each bar series, in the order of `barSeries` (the scale of the axis the series is on). */
	barDomains: ReadonlyArray<readonly [number, number]>;
	barXKey: string;
	barWindow: TimeWindow;
	/**
	 * Given by recharts when this element is a child of the chart (`<Customized component={...} />`): the plot area inside
	 * the axes. Without it (not inside a chart) nothing is drawn.
	 */
	offset?: { left?: number; top?: number; width?: number; height?: number };
}

/** Bars of the `kind: bar` series, drawn inside the chart's own svg, under the lines and dots that follow it in the chart. */
export function TimeSeriesBars({ barRows, barSeries, barDomains, barXKey, barWindow, offset }: TimeSeriesBarsProps): React.ReactElement | null {
	const clipId = `bars-${useId().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
	if (offset?.left === undefined || offset.top === undefined || offset.width === undefined || offset.height === undefined) {
		return null;
	}
	const { left, top, width, height } = offset;
	return (
		<g transform={`translate(${left}, ${top})`} data-bars="">
			<clipPath id={clipId}>
				<rect x={0} y={0} width={Math.max(0, width)} height={Math.max(0, height)} />
			</clipPath>
			<g clipPath={`url(#${clipId})`}>
				{barSeries.flatMap((s, si) =>
					barRows.flatMap((row, i) => {
						const t = numberAt(row, barXKey);
						const to = numberAt(row, s.key);
						const domain = barDomains[si] ?? [0, 1];
						const from = s.fromKey ? numberAt(row, s.fromKey) : Math.min(Math.max(0, domain[0]), domain[1]);
						if (t === null || to === null || from === null) {
							return [];
						}
						const box = barBox(t, from, to, barWindow, domain, width, height);
						if (box === null) {
							return [];
						}
						return [<rect key={`${si}-${i}`} x={box.x} y={box.y} width={box.width} height={box.height} rx={1.5} fill={s.color} fillOpacity={0.75} stroke={s.color} strokeWidth={1} data-bar={s.key} />];
					}),
				)}
			</g>
		</g>
	);
}
