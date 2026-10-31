import React from 'react';

import { ChartSwatch } from './_ChartSwatch.js';
import type { SwatchShape } from './_ChartSwatch.js';
import type { LegendItemSettings, RangeAreaSettings, SeriesSettings } from './timeSeriesProps.js';

export interface TimeSeriesLegendProps {
	/** The series worth explaining (already filtered: listed, and with at least one value). */
	series: SeriesSettings[];
	rangeAreas: RangeAreaSettings[];
	legendItems: LegendItemSettings[];
	/** The gap threshold in days when a dashed segment is drawn, else null (no explanation needed). */
	dashedAfterDays: number | null;
}

function swatchShape(series: SeriesSettings): SwatchShape {
	if (series.kind === 'bar') {
		return 'bar';
	}
	if (series.kind === 'area') {
		return 'area';
	}
	return series.width === 0 && series.dots > 0 ? 'dot' : 'line';
}

const ITEM = 'inline-flex items-center gap-1.5';

/** Legend of a TimeSeriesChart: series, listed range areas, free items, and what a dashed segment means. */
export function TimeSeriesLegend({ series, rangeAreas, legendItems, dashedAfterDays }: TimeSeriesLegendProps): React.ReactElement | null {
	const areas = rangeAreas.filter(area => area.legend);
	if (series.length === 0 && areas.length === 0 && legendItems.length === 0 && dashedAfterDays === null) {
		return null;
	}
	return (
		<div className="flex flex-wrap gap-x-3.5 gap-y-1 px-1 pb-1 text-xs text-muted" data-chart-legend="">
			{series.map((s, i) => (
				<span key={`${s.key}-${i}`} className={ITEM}>
					<ChartSwatch shape={swatchShape(s)} color={s.color} amount={s.width} />
					{s.name}
				</span>
			))}
			{areas.map((a, i) => (
				<span key={`${a.name}-${i}`} className={ITEM}>
					<ChartSwatch shape="range" color={a.color} amount={Math.max(0.35, a.opacity * 2)} />
					{a.name}
				</span>
			))}
			{legendItems.map((item, i) => (
				<span key={`${item.label}-${i}`} className={ITEM}>
					<ChartSwatch shape="dot" color={item.color} />
					{item.label}
				</span>
			))}
			{dashedAfterDays !== null && (
				<span className={ITEM} title={`Dashed: no value for more than ${dashedAfterDays} days`}>
					<span aria-hidden="true" className="inline-block w-4 border-t-2 border-dashed border-muted" />
					gap &gt; {dashedAfterDays} days
				</span>
			)}
		</div>
	);
}
