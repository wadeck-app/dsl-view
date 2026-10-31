/** Pure helpers of the time-series chart (no React): gap segments, windows (zoom / pan), axis ticks. */

export const DAY_MS = 86_400_000;

export interface TimePoint {
	t: number;
	v: number;
}

export interface GapSegments {
	/** Runs of consecutive measured points joined by a plain line (a run of one point draws only its dot). */
	runs: TimePoint[][];
	/** Links between two consecutive measured points more than the threshold apart: drawn dashed. */
	links: [TimePoint, TimePoint][];
}

/**
 * Splits the measured points (null / non-finite values are not measurements and are skipped) into plain runs and dashed
 * links. Two consecutive MEASURED points are joined by a plain line when they are at most `gapMs` apart, by a dashed
 * line otherwise: absence of data is always drawn (dashed), never left blank and never plain.
 * `gapMs` null = never dashed (everything is one run).
 */
export function splitAtGaps(rows: readonly Record<string, unknown>[], xKey: string, yKey: string, gapMs: number | null): GapSegments {
	const points: TimePoint[] = [];
	for (const row of rows) {
		const t = row[xKey];
		const v = row[yKey];
		if (typeof t === 'number' && Number.isFinite(t) && typeof v === 'number' && Number.isFinite(v)) {
			points.push({ t, v });
		}
	}
	points.sort((a, b) => a.t - b.t);
	const runs: TimePoint[][] = [];
	const links: [TimePoint, TimePoint][] = [];
	let run: TimePoint[] = [];
	for (const p of points) {
		const prev = run[run.length - 1];
		if (prev && gapMs !== null && p.t - prev.t > gapMs) {
			links.push([prev, p]);
			runs.push(run);
			run = [p];
		} else {
			run.push(p);
		}
	}
	if (run.length > 0) {
		runs.push(run);
	}
	return { runs, links };
}

/** Flat point list for one recharts <Line data>: the runs separated by a null value, so no line is drawn between two runs. */
export function flattenRuns(runs: readonly (readonly TimePoint[])[]): { t: number; v: number | null }[] {
	const out: { t: number; v: number | null }[] = [];
	for (const run of runs) {
		if (run.length === 0) {
			continue;
		}
		if (out.length > 0) {
			out.push({ t: run[0]!.t, v: null });
		}
		// A loop: spreading a very long run into push throws a RangeError.
		for (const p of run) {
			out.push(p);
		}
	}
	return out;
}

export function flattenLinks(links: readonly (readonly [TimePoint, TimePoint])[]): { t: number; v: number | null }[] {
	return flattenRuns(links.map(([a, b]) => [a, b]));
}

export type TimeWindow = readonly [number, number];

/** Smallest window a zoom can reach. */
export const MIN_SPAN_MS = 7 * DAY_MS;

/** The window moved so it lies inside `extent` (span kept; clamped to [minSpan, extent span]). */
export function clampWindow(win: TimeWindow, extent: TimeWindow, minSpan: number = MIN_SPAN_MS): TimeWindow {
	const total = extent[1] - extent[0];
	const span = Math.min(Math.max(win[1] - win[0], Math.min(minSpan, total)), total);
	let from = win[0];
	if (from < extent[0]) {
		from = extent[0];
	}
	if (from + span > extent[1]) {
		from = extent[1] - span;
	}
	return [from, from + span];
}

/** Zoom by `factor` (< 1 zooms in) keeping the time under `anchor` at the same relative position. */
export function zoomWindow(win: TimeWindow, extent: TimeWindow, factor: number, anchor: number, minSpan: number = MIN_SPAN_MS): TimeWindow {
	if (!(factor > 0)) {
		throw new RangeError(`zoom factor must be positive, got ${factor}.`);
	}
	const span = win[1] - win[0];
	const ratio = span === 0 ? 0.5 : (anchor - win[0]) / span;
	const next = Math.min(Math.max(span * factor, minSpan), extent[1] - extent[0]);
	const from = anchor - ratio * next;
	return clampWindow([from, from + next], extent, minSpan);
}

/** Pan by `deltaMs` (positive = later), stopping at the extent. */
export function panWindow(win: TimeWindow, extent: TimeWindow, deltaMs: number): TimeWindow {
	return clampWindow([win[0] + deltaMs, win[1] + deltaMs], extent);
}

/** True when the window shows the whole extent (nothing to reset). */
export function isFullWindow(win: TimeWindow | null, extent: TimeWindow): boolean {
	return win === null || (win[0] <= extent[0] && win[1] >= extent[1]);
}

/** Hard cap on generated ticks: an absurd window (or a step lost in float rounding at huge values) must not loop forever. */
const MAX_TICKS = 1000;

/**
 * `first`, `first + step`, ... up to `last`. Ends early when a step no longer moves the value (a time near 1e300, where adding
 * a day is lost in float rounding): otherwise the same tick would repeat up to the cap, and React would see duplicate keys.
 */
function ticksBetween(first: number, last: number, step: number): number[] {
	const ticks: number[] = [];
	for (let t = first; t <= last && ticks.length < MAX_TICKS; ) {
		ticks.push(t);
		const next = t + step;
		if (!(next > t)) {
			break;
		}
		t = next;
	}
	return ticks;
}

const TICK_STEPS_DAYS = [1, 2, 3, 7, 14, 30, 60, 90, 180, 365];

/** Smallest tick step (days) giving at most `maxTicks` ticks over `spanMs`. */
export function tickStepDays(spanMs: number, maxTicks: number): number {
	const days = spanMs / DAY_MS;
	return TICK_STEPS_DAYS.find(step => days / step <= maxTicks) ?? 365;
}

/** Ticks every step from the first multiple at or after the window start, aligned on `anchor` so they stay put while panning. */
export function timeTicks(win: TimeWindow, maxTicks: number, anchor: number): number[] {
	const step = tickStepDays(win[1] - win[0], maxTicks) * DAY_MS;
	return ticksBetween(anchor + Math.ceil((win[0] - anchor) / step) * step, win[1], step);
}

function niceStep(raw: number): number {
	const pow = 10 ** Math.floor(Math.log10(raw));
	const f = raw / pow;
	return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

export interface YScale {
	domain: [number, number];
	ticks: number[];
}

/**
 * Y domain and ticks from the extreme values shown: padded, then rounded to a 1/2/5 step. `includeZero` anchors the axis
 * at 0. No value at all gives [0, 1] so the axis still draws.
 */
export function niceYScale(min: number | null, max: number | null, includeZero: boolean, tickCount: number = 5): YScale {
	if (min === null || max === null) {
		return { domain: [0, 1], ticks: [0, 1] };
	}
	let lo = includeZero ? Math.min(0, min) : min;
	let hi = includeZero ? Math.max(0, max) : max;
	if (hi - lo === 0) {
		lo -= 1;
		hi += 1;
	}
	const pad = (hi - lo) * 0.06;
	lo = includeZero && min >= 0 ? 0 : lo - pad;
	hi += pad;
	const step = niceStep((hi - lo) / Math.max(1, tickCount - 1));
	const start = Math.floor(lo / step) * step;
	const end = Math.ceil(hi / step) * step;
	// A non-finite step (values near the float limits) or a lost increment would never end: capped and stopped when stuck.
	const ticks = ticksBetween(start, end + step / 2, step).map(v => parseFloat(v.toFixed(10)));
	return ticks.length < 2 || !ticks.every(Number.isFinite) ? { domain: [0, 1], ticks: [0, 1] } : { domain: [ticks[0]!, ticks[ticks.length - 1]!], ticks };
}

/** Index of the time closest to `t` in `times` (ascending); -1 for an empty list. */
export function nearestIndex(times: readonly number[], t: number): number {
	if (times.length === 0) {
		return -1;
	}
	let lo = 0;
	let hi = times.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (times[mid]! < t) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	return lo > 0 && Math.abs(times[lo - 1]! - t) <= Math.abs(times[lo]! - t) ? lo - 1 : lo;
}

/** "HH:MM" of decimal hours of the day (18.5 -> "18:30"); past midnight the hour wraps and "+1" is appended, 24 stays "24:00". */
export function formatClock(hours: number): string {
	const total = Math.round(hours * 60);
	const h = Math.floor(total / 60);
	const mm = String(total % 60).padStart(2, '0');
	if (h > 24 || (h === 24 && total % 60 !== 0)) {
		return `${String(h - 24).padStart(2, '0')}:${mm}+1`;
	}
	return `${String(h).padStart(2, '0')}:${mm}`;
}

/** Pixel position of a value on a y axis of `plotHeight` px (top = domain max). */
export function valueToY(value: number, domain: readonly [number, number], plotHeight: number): number {
	return plotHeight - ((value - domain[0]) / (domain[1] - domain[0])) * plotHeight;
}

export interface BarBox {
	x: number;
	width: number;
	y: number;
	height: number;
}

/**
 * Box of one bar in a plot of `plotWidth` x `plotHeight` px showing `win` (x) and `yDomain` (y): centred on time `t`, `fraction`
 * of a day wide (at least 2 px so a bar stays visible when zoomed out), spanning `from` to `to` (a plain bar passes the
 * baseline 0 clamped into the domain as `from`). A reversed pair is accepted. Null when the bar lies entirely outside the window.
 */
export function barBox(t: number, from: number, to: number, win: TimeWindow, yDomain: readonly [number, number], plotWidth: number, plotHeight: number, fraction: number = 0.7): BarBox | null {
	const span = win[1] - win[0];
	const width = Math.max(2, (DAY_MS / span) * plotWidth * fraction);
	const x = ((t - win[0]) / span) * plotWidth - width / 2;
	if (x + width < 0 || x > plotWidth) {
		return null;
	}
	const lo = Math.min(from, to);
	const hi = Math.max(from, to);
	const top = valueToY(Math.min(hi, yDomain[1]), yDomain, plotHeight);
	const bottom = valueToY(Math.max(lo, yDomain[0]), yDomain, plotHeight);
	// A zero-height bar (from === to) still gets 1 px so the measurement is visible.
	return { x, width, y: top, height: Math.max(1, bottom - top) };
}

/**
 * [low, high] of a range area on one row. A missing key (null) is the edge of the axis (`domain`), so a band can be open
 * ended; a given key without a finite number in the row means nothing to draw (null).
 */
export function rangeAreaBounds(row: Record<string, unknown>, lowKey: string | null, highKey: string | null, domain: readonly [number, number]): [number, number] | null {
	const pick = (key: string | null, edge: number): number | null => {
		if (key === null) {
			return edge;
		}
		const value = row[key];
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	};
	const lo = pick(lowKey, domain[0]);
	const hi = pick(highKey, domain[1]);
	return lo === null || hi === null ? null : [lo, hi];
}

/** Min and max of the numeric `keys` over the rows whose time lies in `win` (null, null when nothing is visible). */
export function valueExtent(rows: readonly Record<string, unknown>[], xKey: string, win: TimeWindow | null, keys: readonly string[]): { min: number | null; max: number | null } {
	let min: number | null = null;
	let max: number | null = null;
	if (!win) {
		return { min, max };
	}
	for (const row of rows) {
		const t = row[xKey];
		if (typeof t !== 'number' || !Number.isFinite(t) || t < win[0] || t > win[1]) {
			continue;
		}
		for (const key of keys) {
			const v = row[key];
			if (typeof v === 'number' && Number.isFinite(v)) {
				min = min === null ? v : Math.min(min, v);
				max = max === null ? v : Math.max(max, v);
			}
		}
	}
	return { min, max };
}

/**
 * Right margin handed to recharts. A right axis is drawn inside `marginRight` (recharts widens the plot's right side by the
 * axis width), so the margin it gets is what remains: the plot area ends at the same pixel with or without a right axis.
 * `rightAxisWidth` null = no right axis. Never negative (props validation refuses a margin smaller than the axis).
 */
export function rechartsMarginRight(marginRight: number, rightAxisWidth: number | null): number {
	return rightAxisWidth === null ? marginRight : Math.max(0, marginRight - rightAxisWidth);
}

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const FINE_STEPS_MS = [MINUTE_MS, 5 * MINUTE_MS, 10 * MINUTE_MS, 15 * MINUTE_MS, 30 * MINUTE_MS, HOUR_MS, 2 * HOUR_MS, 3 * HOUR_MS, 6 * HOUR_MS, 12 * HOUR_MS];

/** Smallest tick step (ms) giving at most `maxTicks` ticks over `spanMs`; `fine` adds the steps under a day (minutes, hours). */
export function tickStepMs(spanMs: number, maxTicks: number, fine: boolean): number {
	const steps = [...(fine ? FINE_STEPS_MS : []), ...TICK_STEPS_DAYS.map(d => d * DAY_MS)];
	return steps.find(step => spanMs / step <= maxTicks) ?? 365 * DAY_MS;
}

/**
 * Like `timeTicks` with sub-day steps available (`xFormat: time | datetime`). Ticks sit on multiples of the step counted from
 * `anchor` (the first x of the data), so they stay put while panning; they are not rounded to the wall clock.
 */
export function timeTicksFine(win: TimeWindow, maxTicks: number, anchor: number): number[] {
	const step = tickStepMs(win[1] - win[0], maxTicks, true);
	return ticksBetween(anchor + Math.ceil((win[0] - anchor) / step) * step, win[1], step);
}

export type XFormat = 'date' | 'time' | 'datetime';

/** The finite number in `row[key]`, else null (text, NaN, Infinity, missing: not a measurement). */
export function numberAt(row: Record<string, unknown>, key: string): number | null {
	const v = row[key];
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** `toFixed` throws a RangeError for digits outside 0..100: clamp to whole numbers in that range. */
export function toFixedDigits(decimals: number): number {
	return Math.min(100, Math.max(0, Math.trunc(decimals)));
}

/** Extent of the x values (padded by half a day each side so the first and last point are not on the frame), or null without any x. */
export function xExtent(rows: readonly Record<string, unknown>[], xKey: string): TimeWindow | null {
	// A loop: spreading a very long list into Math.min throws a RangeError.
	let lo = Infinity;
	let hi = -Infinity;
	for (const row of rows) {
		const t = numberAt(row, xKey);
		if (t !== null) {
			lo = Math.min(lo, t);
			hi = Math.max(hi, t);
		}
	}
	if (lo > hi) {
		return null;
	}
	const from = lo - DAY_MS / 2;
	const to = hi + DAY_MS / 2;
	// A time so large that half a day is lost in float rounding has no extent to draw: it counts as no usable x.
	return from < to ? [from, to] : null;
}
