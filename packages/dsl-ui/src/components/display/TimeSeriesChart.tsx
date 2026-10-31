import React from 'react';

import { TimeSeriesChartView } from './_TimeSeriesChartView.js';
import { TimeSeriesInvalid } from './_TimeSeriesInvalid.js';
import { checkTimeSeriesChartProps } from './timeSeriesProps.js';

/** One drawn series of a `TimeSeriesChart`. */
export interface TimeSeriesSeries {
	/** Field of the row holding the value (a number; anything else is skipped). */
	key: string;
	/** Legend and tooltip name. */
	name: string;
	/** Any CSS colour or theme token (`var(--color-primary-solid)`). Without it the series takes the next colour of the theme palette, as `Chart` does. */
	color?: string;
	/** Stroke width of the line; 0 draws no line (dots only). @default 2 */
	width?: number;
	/** Dot radius; 0 draws no dots. @default 0 */
	dots?: number;
	/** Field of the row holding the CSS colour of each point's dot; falls back to `color` when the field is empty. */
	pointColorKey?: string;
	/** Field of the row holding a text appended to this series' line in the tooltip. */
	detailKey?: string;
	/** Dash the segments that bridge a gap in this series (see `gapDashAfterDays`). @default true */
	gapDash?: boolean;
	/** Listed in the legend. @default true */
	legend?: boolean;
	/**
	 * `line`, `area` (the line plus a fill down to the axis; the fill covers the plain runs, a dashed bridge over a gap is not
	 * filled) or `bar` (one bar per row from 0 up to the value, 70% of a day wide, at least 2 px). @default 'line'
	 */
	kind?: 'line' | 'area' | 'bar';
	/** Floating bar (`kind: bar` only): field holding the START value, the bar spans from this field to `key`. A row missing either value draws no bar. */
	fromKey?: string;
	/** Decimals of this series' values in the tooltip. Absent: the chart's `yDecimals`. */
	decimals?: number;
	/** Show the value in the tooltip. False for a marker whose position carries no meaning: only the name and `detailKey` text are shown. @default true */
	showValue?: boolean;
	/** Y axis of this series. The right axis has its own fitted scale and `yRight*` settings; bands and range areas always follow the left one. @default 'left' */
	axis?: 'left' | 'right';
}

/** A horizontal band between two fixed values. */
export interface TimeSeriesBand {
	from: number;
	to: number;
	/** Any CSS colour or theme token. */
	color: string;
	/** @default 0.12 */
	opacity?: number;
	label?: string;
}

/** A band whose edges come from two fields of each row, e.g. a target that follows another value. */
export interface TimeSeriesRangeArea {
	/** Row field of the lower edge; absent = the bottom of the axis (open ended band). */
	lowKey?: string;
	/** Row field of the upper edge; absent = the top of the axis. A given key without a number in a row draws nothing for that row. */
	highKey?: string;
	name: string;
	/** Any CSS colour or theme token. */
	color: string;
	/** @default 0.15 */
	opacity?: number;
	/** Listed in the legend. @default true */
	legend?: boolean;
}

/** A free legend entry (a dot and a label), e.g. to explain the colours of `pointColorKey`. */
export interface TimeSeriesLegendItem {
	label: string;
	/** Any CSS colour or theme token. */
	color: string;
}

export interface TimeSeriesChartProps {
	/** Rows, typically `$sources.x.rows`. Undefined (still loading) shows a placeholder; entries that are not maps are no row. */
	data: unknown[] | undefined;
	/** Row field holding the x value: a timestamp in milliseconds. @default 't' */
	xKey?: string;
	/** Shared x domain `[min, max]` in ms with min < max; without it, the extent of the data (plus half a day on each side). */
	domain?: number[];
	/**
	 * At least one. Maps carry expressions too (`name: $sources.x.label`).
	 * @resolveDeep
	 * @itemKeys TimeSeriesSeries
	 */
	series: TimeSeriesSeries[];
	/**
	 * Horizontal bands at fixed values (target zones).
	 * @resolveDeep
	 * @itemKeys TimeSeriesBand
	 */
	bands?: TimeSeriesBand[];
	/**
	 * Bands whose edges follow row fields. A missing `lowKey` / `highKey` is the edge of the axis.
	 * @resolveDeep
	 * @itemKeys TimeSeriesRangeArea
	 */
	rangeAreas?: TimeSeriesRangeArea[];
	/**
	 * Free legend entries.
	 * @resolveDeep
	 * @itemKeys TimeSeriesLegendItem
	 */
	legendItems?: TimeSeriesLegendItem[];
	/** A segment between two measured points further apart than this many days is dashed. Absent = never dashed. */
	gapDashAfterDays?: number;
	/** Charts and brushes with the same group share their time window (pan, zoom, brush) and x domain. @default 'default' */
	syncGroup?: string;
	title?: string;
	/** Height in px, axes included. @default 220 */
	height?: number;
	/** Suffix of the values in the tooltip, e.g. "%" or "ms". */
	yUnit?: string;
	/** `clock`: values are hours of the day (18.5), shown as 18:30 on the axis and in the tooltip (`+1` after midnight). @default 'number' */
	yFormat?: 'number' | 'clock';
	/** Decimals of the values in the tooltip. @default 1 */
	yDecimals?: number;
	/** Anchor the left axis at 0. Implied by a plain bar series on it. @default false */
	yIncludeZero?: boolean;
	/** Left axis width in px: give the same value to stacked charts so their plot areas align. @default 56 */
	yAxisWidth?: number;
	/**
	 * Right margin in px, same advice. A right axis is drawn INSIDE this margin (the plot area does not move), so with a right
	 * axis it must be at least `yRightAxisWidth`. @default 16
	 */
	marginRight?: number;
	/** Text shown when there is no row with a usable x. @default 'No data in this period' */
	emptyMessage?: string;
	/**
	 * X tick labels and tooltip heading, in the language, clock and time zone of the date settings (`DateFormatProvider`).
	 * `date`: "5 Jan". `datetime`: "5 Jan, 14:30". `time`: "14:30", and the first tick plus every tick that starts a new day
	 * carry the date as well. The tooltip heading always has the date. @default 'date'
	 */
	xFormat?: 'date' | 'time' | 'datetime';
	/** Format of the right axis values. Only with a series on the right axis. @default 'number' */
	yRightFormat?: 'number' | 'clock';
	/** Tooltip suffix of the right axis values. */
	yRightUnit?: string;
	/** Tooltip decimals of the right axis values. @default 1 */
	yRightDecimals?: number;
	yRightIncludeZero?: boolean;
	/** Width in px of the right axis labels, drawn inside `marginRight`. @default 56 */
	yRightAxisWidth?: number;
}

/**
 * Time-series chart: lines with gap-aware dashing, areas, bars (plain or floating), a second y axis, per-point colours, fixed
 * bands and per-row range areas, and a time window (drag to pan, Ctrl + wheel to zoom, double click to reset) shared by every
 * chart and `TimeBrush` of the same `syncGroup`. Stacked charts with the same `yAxisWidth` and `marginRight` align to the pixel.
 *
 * Keyboard: the plot is focusable; arrows pan, + and - zoom, 0 shows the whole period. It is a `role="img"` whose label
 * summarises the visible window (latest, min, max and count per series).
 *
 * Props the component cannot use (a series without a key, a right-axis setting without a right series...) render an inline
 * alert naming the fix and one development warning; odd data (null, NaN, text values, unsorted x) is skipped. Use `Chart` for
 * category axes, sparklines and byte values.
 *
 * @registryCategory composite
 * @registryTags chart timeseries
 * @registryLazy
 */
export function TimeSeriesChart(props: TimeSeriesChartProps): React.ReactElement {
	const checked = checkTimeSeriesChartProps(props);
	if (!checked.ok) {
		return <TimeSeriesInvalid component="TimeSeriesChart" message={checked.message} />;
	}
	return <TimeSeriesChartView {...checked.settings} />;
}
