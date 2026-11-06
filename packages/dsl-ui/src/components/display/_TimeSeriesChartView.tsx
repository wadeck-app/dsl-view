import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Customized, Line, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts';

import { useDateFormat } from '@dsl-ui/dates/DateFormatContext.js';

import { TimeSeriesBars } from './_TimeSeriesBars.js';
import { TimeSeriesLegend } from './_TimeSeriesLegend.js';
import { TimeSeriesTooltip } from './_TimeSeriesTooltip.js';
import { applyChartKeyAction, CHART_KEYS_HINT, chartKeyAction, chartSummary } from './timeSeriesA11y.js';
import { formatXHeading, xTickLabels } from './timeSeriesFormat.js';
import {
	DAY_MS,
	flattenLinks,
	flattenRuns,
	formatClock,
	nearestIndex,
	niceYScale,
	numberAt,
	panWindow,
	rangeAreaBounds,
	rechartsMarginRight,
	splitAtGaps,
	timeTicks,
	timeTicksFine,
	toFixedDigits,
	valueExtent,
	xExtent,
	zoomWindow,
} from './timeSeriesMath.js';
import type { TimeWindow } from './timeSeriesMath.js';
import { recordRows } from './timeSeriesProps.js';
import type { SeriesSettings, TimeSeriesChartSettings } from './timeSeriesProps.js';
import { useSyncWindow } from './timeSeriesSync.js';
import { useElementWidth } from './useElementWidth.js';

const MARGIN_TOP = 8;
const X_AXIS_HEIGHT = 24;
// Same token strings as `Chart`: recharts paints from props, so a theme token is a `var(--color-*)` string, not a class.
const TICK_STYLE = { fontSize: 12, fill: 'var(--color-muted)' };
const DASH = '6 4';
const LINE_PROPS = { dot: false, activeDot: false, connectNulls: false, isAnimationActive: false, legendType: 'none' } as const;

// @formatter:off
const LOADING_CLASS = 'animate-pulse motion-reduce:animate-none rounded-lg border border-border bg-bg-secondary';
const EMPTY_CLASS = 'flex items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted';
// @formatter:on

type Row = Record<string, unknown>;
// `spans`: the [from, to] x of each dashed bridge, what the legend checks against the visible window.
type Segments = { runs: Row[]; links: Row[]; spans: [number, number][] };

/** Chart body: the checked settings (see `TimeSeriesChart`) drawn with recharts at a measured width. */
export function TimeSeriesChartView(props: TimeSeriesChartSettings): React.ReactElement {
	const { data, xKey, series, bands, rangeAreas, legendItems, gapDashAfterDays, syncGroup, title, height, yUnit, yFormat, yDecimals, yAxisWidth, marginRight, emptyMessage, yRightAxisWidth, xFormat } = props;
	const dates = useDateFormat();
	// A plain bar grows from 0: the axis must reach it.
	const yIncludeZero = props.yIncludeZero || series.some(s => s.kind === 'bar' && !s.fromKey && s.axis === 'left');
	const yRightIncludeZero = props.yRightIncludeZero || series.some(s => s.kind === 'bar' && !s.fromKey && s.axis === 'right');
	const hasRight = series.some(s => s.axis === 'right');
	// With only right-axis series the left axis keeps its width (alignment) but shows no labels: it has nothing to measure.
	const leftUsed = series.some(s => s.axis === 'left') || rangeAreas.length > 0 || bands.length > 0;
	const [setBox, width] = useElementWidth();
	const hintId = useId();
	const rows = useMemo(() => recordRows(data), [data]);

	const ownExtent = useMemo<TimeWindow | null>(() => props.domain ?? xExtent(rows, xKey), [props.domain, rows, xKey]);
	const { window: win, extent, setWindow } = useSyncWindow(syncGroup, ownExtent);

	const gapMs = gapDashAfterDays === null ? null : gapDashAfterDays * DAY_MS;
	const segments = useMemo<Segments[]>(
		() =>
			series.map(s => {
				if (s.kind === 'bar') {
					return { runs: [], links: [], spans: [] };
				}
				const { runs, links } = splitAtGaps(rows, xKey, s.key, s.gapDash ? gapMs : null);
				const withX = (pts: { t: number; v: number | null }[]): Row[] => pts.map(p => ({ [xKey]: p.t, v: p.v }));
				return { runs: withX(flattenRuns(runs)), links: withX(flattenLinks(links)), spans: links.map(([a, b]): [number, number] => [a.t, b.t]) };
			}),
		[rows, series, xKey, gapMs],
	);

	// Y scale of each axis from what is visible in the window (series values, range areas, bands on the left).
	const yScale = useMemo(() => {
		const keys = series.filter(s => s.axis === 'left').flatMap(s => (s.fromKey ? [s.key, s.fromKey] : [s.key]));
		// An open ended band (missing key) follows the axis, it does not size it.
		for (const area of rangeAreas) {
			for (const key of [area.lowKey, area.highKey]) {
				if (key !== null) {
					keys.push(key);
				}
			}
		}
		const { min, max } = valueExtent(rows, xKey, win, keys);
		return niceYScale(min, max, yIncludeZero);
	}, [rows, win, series, rangeAreas, xKey, yIncludeZero]);
	const yScaleRight = useMemo(() => {
		const keys = series.filter(s => s.axis === 'right').flatMap(s => (s.fromKey ? [s.key, s.fromKey] : [s.key]));
		const { min, max } = valueExtent(rows, xKey, win, keys);
		return niceYScale(min, max, yRightIncludeZero);
	}, [rows, win, series, xKey, yRightIncludeZero]);

	// A series without any value (e.g. an average switched off) has nothing to explain in the legend.
	const legendSeries = useMemo(() => series.filter(s => s.legend && rows.some(r => numberAt(r, s.key) !== null)), [series, rows]);

	const plotWidth = Math.max(0, width - yAxisWidth - marginRight);
	const plotHeight = Math.max(0, height - MARGIN_TOP - X_AXIS_HEIGHT);

	const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
	const drag = useRef<{ startX: number; win: TimeWindow; moved: boolean } | null>(null);
	const [dragging, setDragging] = useState(false);

	// The rows with a usable x, ascending by x (the data may come unsorted), each with its index in `rows`: what a hover looks up.
	const byTime = useMemo(() => {
		const pairs: { t: number; index: number }[] = [];
		rows.forEach((r, index) => {
			const t = numberAt(r, xKey);
			if (t !== null) {
				pairs.push({ t, index });
			}
		});
		return pairs.sort((a, b) => a.t - b.t);
	}, [rows, xKey]);
	const sortedTimes = useMemo(() => byTime.map(p => p.t), [byTime]);
	// What recharts is given: a row without a usable x has no position (it would reach the svg as NaN).
	const plotRows = useMemo(() => rows.filter(r => numberAt(r, xKey) !== null), [rows, xKey]);

	// Ctrl + wheel zooms (a plain wheel keeps scrolling the page); the listener is native because React's is passive.
	const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
	const latest = useRef({ win, extent, setWindow });
	latest.current = { win, extent, setWindow };
	useEffect(() => {
		const el = overlay;
		if (!el) {
			return;
		}
		const onWheel = (e: WheelEvent): void => {
			const { win: w, extent: x, setWindow: set } = latest.current;
			if (!w || !x) {
				return;
			}
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				const rect = el.getBoundingClientRect();
				const anchor = w[0] + ((e.clientX - rect.left) / Math.max(1, rect.width)) * (w[1] - w[0]);
				set(zoomWindow(w, x, e.deltaY > 0 ? 1.25 : 0.8, anchor));
			} else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				e.preventDefault();
				set(panWindow(w, x, (e.deltaX / Math.max(1, el.getBoundingClientRect().width)) * (w[1] - w[0])));
			}
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	}, [overlay]);

	if (data === undefined) {
		return <div role="status" aria-busy="true" aria-label="Loading chart" className={LOADING_CLASS} style={{ height }} />;
	}
	if (rows.length === 0 || !ownExtent || !win || !extent) {
		return (
			<div className={EMPTY_CLASS} style={{ height }}>
				{emptyMessage}
			</div>
		);
	}

	const span = win[1] - win[0];
	// Anchored on the extent (its start + half a day = the first x of the data), also for sub-day steps. The budget leaves room for
	// the longest label of the format (a 12h clock with the date); recharts then draws every tick given (`interval={0}`).
	const maxTicks = Math.max(3, Math.floor(plotWidth / (xFormat === 'date' ? 80 : 110)));
	const ticks = xFormat === 'date' ? timeTicks(win, maxTicks, extent[0] + DAY_MS / 2) : timeTicksFine(win, maxTicks, extent[0] + DAY_MS / 2);
	const tickLabels = xTickLabels(dates, ticks, xFormat, span);

	const hoverRow = hover ? rows[hover.index] : undefined;
	const hoverT = hoverRow ? numberAt(hoverRow, xKey) : null;
	// Explained only when a dashed bridge is drawn: one overlapping the visible window (a threshold no gap reaches, or a window
	// panned or zoomed past every gap, needs no legend entry). A bridge touching an edge counts.
	const hasDashed = series.some((s, i) => s.width > 0 && (segments[i]?.spans ?? []).some(([from, to]) => from <= win[1] && to >= win[0]));
	const formatY = (v: number): string => (yFormat === 'clock' ? formatClock(v) : `${v}`);
	const formatYRight = (v: number): string => (props.yRightFormat === 'clock' ? formatClock(v) : `${v}`);
	const formatValue = (v: number, s: SeriesSettings): string => {
		const right = s.axis === 'right';
		if ((right ? props.yRightFormat : yFormat) === 'clock') {
			return formatClock(v);
		}
		const unit = right ? props.yRightUnit : yUnit;
		return `${v.toFixed(toFixedDigits(s.decimals ?? (right ? props.yRightDecimals : yDecimals)))}${unit ? ` ${unit}` : ''}`;
	};
	const barSeries = series.filter(s => s.kind === 'bar');
	// Every row of the hovered day (several bars can share a day).
	const hoverRows = hoverT === null ? [] : rows.filter(r => numberAt(r, xKey) === hoverT);

	const summary = chartSummary({
		title,
		rows,
		xKey,
		win,
		series: series.filter(s => s.legend),
		formatValue: (v, key) => formatValue(v, series.find(s => s.key === key) ?? series[0]!),
		formatDay: t => formatXHeading(dates, t, xFormat),
	});
	const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
		const action = chartKeyAction(e.key, e);
		if (action === null) {
			return;
		}
		e.preventDefault();
		setWindow(applyChartKeyAction(action, win, extent));
	};

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
		const el = e.currentTarget;
		const rect = el.getBoundingClientRect();
		const d = drag.current;
		if (d) {
			const dx = e.clientX - d.startX;
			if (Math.abs(dx) > 3) {
				d.moved = true;
			}
			if (d.moved) {
				setHover(null);
				setWindow(panWindow(d.win, extent, (-dx / Math.max(1, rect.width)) * (d.win[1] - d.win[0])));
				return;
			}
		}
		const ratio = (e.clientX - rect.left) / Math.max(1, rect.width);
		const t = win[0] + Math.min(1, Math.max(0, ratio)) * span;
		const nearest = byTime[nearestIndex(sortedTimes, t)];
		setHover(nearest === undefined ? null : { index: nearest.index, x: e.clientX - rect.left, y: e.clientY - rect.top });
	};

	return (
		<div ref={setBox} className="relative rounded-lg border border-border bg-surface p-2" data-chart-group={syncGroup}>
			{title && <div className="px-1 pb-1 text-sm font-semibold text-content">{title}</div>}
			<TimeSeriesLegend series={legendSeries} rangeAreas={rangeAreas} legendItems={legendItems} dashedAfterDays={hasDashed ? gapDashAfterDays : null} />
			{/* Outside the role="img" element, whose children are presentational. */}
			<span id={hintId} className="sr-only">
				{CHART_KEYS_HINT}
			</span>
			{width > 0 && height > 0 && (
				<div className="relative" style={{ width, height }} role="img" aria-label={summary} aria-describedby={hintId} tabIndex={0} onKeyDown={onKeyDown} data-chart-plot="">
					<ComposedChart width={width} height={height} data={plotRows} margin={{ top: MARGIN_TOP, right: rechartsMarginRight(marginRight, hasRight ? yRightAxisWidth : null), bottom: 0, left: 0 }}>
						<CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
						<XAxis
							type="number"
							dataKey={xKey}
							domain={[win[0], win[1]]}
							allowDataOverflow
							ticks={ticks}
							interval={0}
							tickFormatter={(t: number) => tickLabels.get(t) ?? String(t)}
							tick={TICK_STYLE}
							tickLine={false}
							height={X_AXIS_HEIGHT}
						/>
						<YAxis
							yAxisId="left"
							type="number"
							domain={yScale.domain}
							ticks={leftUsed ? yScale.ticks : []}
							allowDataOverflow
							width={yAxisWidth}
							tick={leftUsed ? TICK_STYLE : false}
							tickLine={false}
							axisLine={false}
							tickFormatter={formatY}
						/>
						{hasRight && (
							<YAxis
								yAxisId="right"
								orientation="right"
								type="number"
								domain={yScaleRight.domain}
								ticks={yScaleRight.ticks}
								allowDataOverflow
								width={yRightAxisWidth}
								tick={TICK_STYLE}
								tickLine={false}
								axisLine={false}
								tickFormatter={formatYRight}
							/>
						)}
						{bands.map((b, i) => (
							<ReferenceArea key={`band-${i}`} yAxisId="left" y1={b.from} y2={b.to} fill={b.color} fillOpacity={b.opacity} ifOverflow="hidden" stroke="none" />
						))}
						{rangeAreas.map((a, ai) => (
							<Area
								key={`${a.name}-${ai}`}
								yAxisId="left"
								dataKey={(row: Row) => rangeAreaBounds(row, a.lowKey, a.highKey, yScale.domain)}
								type="stepAfter"
								stroke="none"
								fill={a.color}
								fillOpacity={a.opacity}
								connectNulls={false}
								isAnimationActive={false}
							/>
						))}
						{/* Drawn in the chart's own svg, before the lines and dots below, so they stay on top of the bars. */}
						{barSeries.length > 0 && (
							<Customized
								component={
									<TimeSeriesBars
										barRows={rows}
										barSeries={barSeries}
										barDomains={barSeries.map(s => (s.axis === 'right' ? yScaleRight.domain : yScale.domain))}
										barXKey={xKey}
										barWindow={win}
									/>
								}
							/>
						)}
						{series.flatMap((s, i) => {
							if (s.kind === 'bar') {
								return [];
							}
							const seg = segments[i] ?? { runs: [], links: [], spans: [] };
							// Flat list of elements: recharts looks for its graphical children by type and does not reliably see through fragments.
							const out: React.ReactElement[] = [];
							if (s.kind === 'area' && seg.runs.length > 0) {
								// Fill under the plain runs only: a dashed bridge over a gap stays an unfilled line (the stroke is the Line below).
								out.push(<Area key={`${s.key}-${i}-fill`} yAxisId={s.axis} data={seg.runs} dataKey="v" stroke="none" fill={s.color} fillOpacity={0.2} {...LINE_PROPS} />);
							}
							if (s.width > 0 && seg.runs.length > 0) {
								out.push(<Line key={`${s.key}-${i}-runs`} yAxisId={s.axis} data={seg.runs} dataKey="v" stroke={s.color} strokeWidth={s.width} {...LINE_PROPS} />);
							}
							if (s.width > 0 && seg.links.length > 0) {
								out.push(<Line key={`${s.key}-${i}-links`} yAxisId={s.axis} data={seg.links} dataKey="v" stroke={s.color} strokeWidth={Math.max(1.5, s.width * 0.75)} strokeDasharray={DASH} strokeOpacity={0.85} {...LINE_PROPS} />);
							}
							if (s.dots > 0) {
								out.push(
									<Line
										key={`${s.key}-${i}-dots`}
										yAxisId={s.axis}
										dataKey={s.key}
										stroke="none"
										activeDot={false}
										isAnimationActive={false}
										legendType="none"
										dot={(p: { cx?: number; cy?: number; payload?: Row; index?: number }) => {
											const colorField = s.pointColorKey ? p.payload?.[s.pointColorKey] : undefined;
											const fill = typeof colorField === 'string' && colorField !== '' ? colorField : s.color;
											return !Number.isFinite(p.cx) || !Number.isFinite(p.cy) || p.payload === undefined || numberAt(p.payload, s.key) === null ? (
												<g key={`d-${p.index}`} />
											) : (
												<circle key={`d-${p.index}`} cx={p.cx} cy={p.cy} r={s.dots} fill={fill} stroke="var(--color-surface)" strokeWidth={1} data-point={s.key} />
											);
										}}
									/>,
								);
							}
							return out;
						})}
						{hoverT !== null && <ReferenceLine yAxisId="left" x={hoverT} stroke="var(--color-muted)" strokeDasharray="2 2" ifOverflow="hidden" />}
					</ComposedChart>
					<div
						ref={setOverlay}
						data-chart-overlay=""
						className={`absolute touch-pan-y ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
						style={{ left: yAxisWidth, top: MARGIN_TOP, width: plotWidth, height: plotHeight }}
						onPointerDown={e => {
							e.currentTarget.setPointerCapture(e.pointerId);
							drag.current = { startX: e.clientX, win, moved: false };
							setDragging(true);
						}}
						onPointerUp={() => {
							drag.current = null;
							setDragging(false);
						}}
						onPointerCancel={() => {
							drag.current = null;
							setDragging(false);
						}}
						onPointerMove={onPointerMove}
						onPointerLeave={() => setHover(null)}
						onDoubleClick={() => setWindow(null)}
					/>
					{hover && hoverRow && (
						<TimeSeriesTooltip
							heading={hoverT === null ? '' : formatXHeading(dates, hoverT, xFormat)}
							rows={hoverRows}
							series={series}
							formatValue={formatValue}
							left={Math.min(yAxisWidth + hover.x + 12, Math.max(0, width - 230))}
							top={MARGIN_TOP + Math.max(0, hover.y - 20)}
						/>
					)}
				</div>
			)}
		</div>
	);
}
