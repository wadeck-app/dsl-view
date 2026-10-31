import { describe, expect, it } from 'vitest';

import {
	barBox,
	clampWindow,
	DAY_MS,
	flattenLinks,
	flattenRuns,
	formatClock,
	isFullWindow,
	MIN_SPAN_MS,
	nearestIndex,
	niceYScale,
	numberAt,
	panWindow,
	rangeAreaBounds,
	rechartsMarginRight,
	splitAtGaps,
	tickStepDays,
	tickStepMs,
	timeTicks,
	timeTicksFine,
	toFixedDigits,
	valueExtent,
	valueToY,
	xExtent,
	zoomWindow,
} from './timeSeriesMath.js';

const HOUR = 3_600_000;
const MIN = 60_000;
const rowsAt = (days: (number | null)[], start = 0) => days.map((v, i) => ({ t: (start + i) * DAY_MS, v }));
const gap2 = 2 * DAY_MS;

describe('splitAtGaps (dashed bridge when the gap is more than the threshold)', () => {
	it('joins points at most 2 days apart with a plain line (a missed day stays plain)', () => {
		const { runs, links } = splitAtGaps(
			[
				{ t: 0, v: 1 },
				{ t: 1 * DAY_MS, v: 2 },
				{ t: 3 * DAY_MS, v: 3 },
			],
			't',
			'v',
			gap2,
		);
		expect(runs).toHaveLength(1);
		expect(runs[0]).toHaveLength(3);
		expect(links).toHaveLength(0);
	});

	it('boundary: exactly the threshold is plain, a millisecond more is dashed', () => {
		expect(splitAtGaps([{ t: 0, v: 1 }, { t: gap2, v: 1 }], 't', 'v', gap2).links).toHaveLength(0);
		expect(splitAtGaps([{ t: 0, v: 1 }, { t: gap2 + 1, v: 1 }], 't', 'v', gap2).links).toHaveLength(1);
	});

	it('bridges a gap with a dashed link between the last point before and the first after, never with nothing', () => {
		const { runs, links } = splitAtGaps(rowsAt([1, 2, null, null, null, null, 3, 4]), 't', 'v', gap2);
		expect(runs.map(run => run.map(p => p.v))).toStrictEqual([[1, 2], [3, 4]]);
		expect(links).toHaveLength(1);
		// the link starts where the first run ends and ends where the second run starts: no hole between plain and dashed
		expect(links[0]![0]).toBe(runs[0]![1]);
		expect(links[0]![1]).toBe(runs[1]![0]);
	});

	it('skips what is not a measurement (null, NaN, missing, text) before measuring the gap', () => {
		const { runs } = splitAtGaps([{ t: 0, v: 1 }, { t: DAY_MS, v: null }, { t: 2 * DAY_MS, v: Number.NaN }, { t: 3 * DAY_MS, v: 'x' }, { t: 4 * DAY_MS }], 't', 'v', gap2);
		expect(runs.map(run => run.length)).toStrictEqual([1]);
	});

	it('sorts by time and handles no data', () => {
		expect(splitAtGaps([{ t: DAY_MS, v: 2 }, { t: 0, v: 1 }], 't', 'v', gap2).runs[0]!.map(p => p.v)).toStrictEqual([1, 2]);
		expect(splitAtGaps([], 't', 'v', gap2)).toStrictEqual({ runs: [], links: [] });
	});

	it('a null threshold never dashes', () => {
		const { runs, links } = splitAtGaps(rowsAt([1, null, null, null, null, 5]), 't', 'v', null);
		expect(links).toHaveLength(0);
		expect(runs).toHaveLength(1);
	});

	it('flattenRuns separates runs by a null so recharts draws no line between them; flattenLinks does the same for links', () => {
		const { runs, links } = splitAtGaps(rowsAt([1, 2, null, null, null, 3, 4, null, null, null, null, 5]), 't', 'v', gap2);
		expect(flattenRuns(runs).map(p => p.v)).toStrictEqual([1, 2, null, 3, 4, null, 5]);
		expect(links).toHaveLength(2);
		expect(flattenLinks(links).map(p => p.v)).toStrictEqual([2, 3, null, 4, 5]);
	});

	it('a very long run is flattened without spreading it (no RangeError)', () => {
		const run = Array.from({ length: 300_000 }, (_, i) => ({ t: i, v: i }));
		expect(flattenRuns([run])).toHaveLength(300_000);
	});
});

describe('windows', () => {
	const extent = [0, 100 * DAY_MS] as const;

	it('clampWindow keeps the span and stays inside the extent', () => {
		expect(clampWindow([-10 * DAY_MS, 20 * DAY_MS], extent)).toStrictEqual([0, 30 * DAY_MS]);
		expect(clampWindow([90 * DAY_MS, 120 * DAY_MS], extent)).toStrictEqual([70 * DAY_MS, 100 * DAY_MS]);
		expect(clampWindow([-1, 200 * DAY_MS], extent)).toStrictEqual([0, 100 * DAY_MS]);
	});

	it('clampWindow raises a window under the minimum span, but never above an extent shorter than it', () => {
		const tiny = clampWindow([10 * DAY_MS, 11 * DAY_MS], extent);
		expect(tiny[1] - tiny[0]).toBe(MIN_SPAN_MS);
		const shortExtent = [0, 3 * DAY_MS] as const;
		expect(clampWindow([0, DAY_MS], shortExtent)).toStrictEqual([0, 3 * DAY_MS]);
	});

	it('zoomWindow zooms around the anchor and never goes below the minimum span or above the extent', () => {
		expect(zoomWindow([0, 100 * DAY_MS], extent, 0.5, 50 * DAY_MS)).toStrictEqual([25 * DAY_MS, 75 * DAY_MS]);
		expect(zoomWindow([0, 100 * DAY_MS], extent, 0.5, 0)).toStrictEqual([0, 50 * DAY_MS]);
		const tiny = zoomWindow([0, 10 * DAY_MS], extent, 0.001, 5 * DAY_MS);
		expect(tiny[1] - tiny[0]).toBe(MIN_SPAN_MS);
		expect(zoomWindow([10 * DAY_MS, 20 * DAY_MS], extent, 1000, 15 * DAY_MS)).toStrictEqual([0, 100 * DAY_MS]);
	});

	it('zoomWindow refuses a factor that is not positive, naming it', () => {
		expect(() => zoomWindow([0, DAY_MS], extent, 0, 0)).toThrow(/zoom factor must be positive, got 0/);
		expect(() => zoomWindow([0, DAY_MS], extent, -2, 0)).toThrow(/got -2/);
	});

	it('zoomWindow on an empty window anchors at its middle', () => {
		const zoomed = zoomWindow([5 * DAY_MS, 5 * DAY_MS], extent, 2, 5 * DAY_MS);
		expect(zoomed[1] - zoomed[0]).toBe(MIN_SPAN_MS);
	});

	it('panWindow moves and stops at the edges', () => {
		expect(panWindow([10 * DAY_MS, 20 * DAY_MS], extent, 5 * DAY_MS)).toStrictEqual([15 * DAY_MS, 25 * DAY_MS]);
		expect(panWindow([10 * DAY_MS, 20 * DAY_MS], extent, -50 * DAY_MS)).toStrictEqual([0, 10 * DAY_MS]);
		expect(panWindow([90 * DAY_MS, 100 * DAY_MS], extent, 50 * DAY_MS)).toStrictEqual([90 * DAY_MS, 100 * DAY_MS]);
	});

	it('isFullWindow: null and a window covering the extent are full, one day short is not', () => {
		expect(isFullWindow(null, extent)).toBe(true);
		expect(isFullWindow([0, 100 * DAY_MS], extent)).toBe(true);
		expect(isFullWindow([0, 99 * DAY_MS], extent)).toBe(false);
		expect(isFullWindow([DAY_MS, 100 * DAY_MS], extent)).toBe(false);
	});
});

describe('axis helpers', () => {
	it('tickStepDays picks the smallest step under the tick budget', () => {
		expect(tickStepDays(10 * DAY_MS, 10)).toBe(1);
		expect(tickStepDays(180 * DAY_MS, 8)).toBe(30);
		expect(tickStepDays(3000 * DAY_MS, 5)).toBe(365);
	});

	it('timeTicks are anchored (multiples of the step from the anchor) and inside the window', () => {
		const ticks = timeTicks([3 * DAY_MS, 40 * DAY_MS], 6, 0);
		expect(ticks.length).toBeGreaterThan(2);
		expect(ticks.every(t => t >= 3 * DAY_MS && t <= 40 * DAY_MS)).toBe(true);
		expect(ticks.every(t => t % (7 * DAY_MS) === 0)).toBe(true);
	});

	it('timeTicks stop at 1000 ticks even for an absurd window', () => {
		expect(timeTicks([0, 1e15], 1e12, 0).length).toBeLessThanOrEqual(1000);
	});

	it('niceYScale pads, rounds to nice steps, can anchor at zero, and survives no data / a constant', () => {
		const scale = niceYScale(68.2, 71.9, false);
		expect(scale.domain[0]).toBeLessThanOrEqual(68.2);
		expect(scale.domain[1]).toBeGreaterThanOrEqual(71.9);
		expect(scale.ticks.length).toBeGreaterThanOrEqual(3);
		expect(niceYScale(100, 400, true).domain[0]).toBe(0);
		expect(niceYScale(null, null, false).domain).toStrictEqual([0, 1]);
		expect(niceYScale(5, null, false).domain).toStrictEqual([0, 1]);
		const flat = niceYScale(5, 5, false);
		expect(flat.domain[0]).toBeLessThan(5);
		expect(flat.domain[1]).toBeGreaterThan(5);
	});

	it('niceYScale keeps 0 inside when asked and the data is negative', () => {
		expect(niceYScale(-8, -2, true).domain[1]).toBeGreaterThanOrEqual(0);
	});

	it('niceYScale falls back to 0..1 when the values are at the float limits', () => {
		expect(niceYScale(-1e308, 1e308, false).domain).toStrictEqual([0, 1]);
	});

	it('nearestIndex: first, last, middle, ties go earlier, empty list is -1', () => {
		expect(nearestIndex([], 5)).toBe(-1);
		expect(nearestIndex([0, 10, 20], 4)).toBe(0);
		expect(nearestIndex([0, 10, 20], 6)).toBe(1);
		expect(nearestIndex([0, 10, 20], 5)).toBe(0);
		expect(nearestIndex([0, 10, 20], 99)).toBe(2);
		expect(nearestIndex([0, 10, 20], -5)).toBe(0);
	});

	it('valueExtent: min / max of the keys over the visible rows only, ignoring non-numbers', () => {
		const rows = [{ t: 0, a: 5, b: 100 }, { t: 5, a: 1, b: null }, { t: 6, a: 'x', b: 7 }, { t: 50, a: 999, b: 999 }];
		expect(valueExtent(rows, 't', [0, 10], ['a'])).toStrictEqual({ min: 1, max: 5 });
		expect(valueExtent(rows, 't', [0, 10], ['a', 'b'])).toStrictEqual({ min: 1, max: 100 });
		expect(valueExtent(rows, 't', [20, 30], ['a'])).toStrictEqual({ min: null, max: null });
		expect(valueExtent(rows, 't', null, ['a'])).toStrictEqual({ min: null, max: null });
		expect(valueExtent(rows, 't', [0, 10], [])).toStrictEqual({ min: null, max: null });
	});

	it('valueExtent: the window edges are inside', () => {
		expect(valueExtent([{ t: 0, a: 1 }, { t: 10, a: 9 }], 't', [0, 10], ['a'])).toStrictEqual({ min: 1, max: 9 });
	});

	it('each axis fits its own scale', () => {
		const rows = [{ t: 1, a: 70, b: 2100 }, { t: 2, a: 71, b: 2500 }];
		const left = valueExtent(rows, 't', [0, 5], ['a']);
		const right = valueExtent(rows, 't', [0, 5], ['b']);
		const l = niceYScale(left.min, left.max, false);
		const r = niceYScale(right.min, right.max, false);
		expect(l.domain[1]).toBeLessThan(100);
		expect(r.domain[0]).toBeGreaterThan(1000);
	});

	it('rechartsMarginRight: the right axis is carved out of marginRight so the plot area ends at the same pixel', () => {
		expect(rechartsMarginRight(16, null)).toBe(16);
		expect(rechartsMarginRight(72, 56)).toBe(16);
		expect(rechartsMarginRight(56, 56)).toBe(0);
		expect(rechartsMarginRight(10, 56)).toBe(0);
	});
});

describe('bars', () => {
	const win: [number, number] = [0, 10 * DAY_MS];

	it('valueToY: the domain max is at the top, the min at the bottom', () => {
		expect(valueToY(10, [0, 10], 200)).toBe(0);
		expect(valueToY(0, [0, 10], 200)).toBe(200);
		expect(valueToY(2.5, [0, 10], 200)).toBe(150);
	});

	it('barBox: a plain bar rises from the baseline to the value, centred on its day, 70% of a day wide', () => {
		// 10 days over 1000 px: a day is 100 px
		expect(barBox(5 * DAY_MS, 0, 5, win, [0, 10], 1000, 200)).toStrictEqual({ x: 500 - 35, width: 70, y: 100, height: 100 });
	});

	it('barBox: a floating bar spans from..to whatever the order, and keeps 1 px for a zero-length one', () => {
		const forward = barBox(DAY_MS, 2, 6, win, [0, 10], 1000, 200)!;
		expect(barBox(DAY_MS, 6, 2, win, [0, 10], 1000, 200)).toStrictEqual(forward);
		expect(forward.y).toBe(80);
		expect(forward.height).toBe(80);
		expect(barBox(DAY_MS, 3, 3, win, [0, 10], 1000, 200)!.height).toBe(1);
	});

	it('barBox: never thinner than 2 px, clipped to the domain, null outside the window (both sides)', () => {
		expect(barBox(DAY_MS, 0, 1, [0, 1000 * DAY_MS], [0, 10], 500, 200)!.width).toBe(2);
		const over = barBox(DAY_MS, 0, 50, win, [0, 10], 1000, 200)!;
		expect([over.y, over.height]).toStrictEqual([0, 200]);
		expect(barBox(20 * DAY_MS, 0, 1, win, [0, 10], 1000, 200)).toBeNull();
		expect(barBox(-20 * DAY_MS, 0, 1, win, [0, 10], 1000, 200)).toBeNull();
	});

	it('barBox: a bar half outside the window is kept (its visible half is drawn)', () => {
		expect(barBox(0, 0, 5, win, [0, 10], 1000, 200)).not.toBeNull();
		expect(barBox(10 * DAY_MS, 0, 5, win, [0, 10], 1000, 200)).not.toBeNull();
	});
});

describe('formatClock (hours of the day as HH:MM, independent of the date settings)', () => {
	it('pads, rounds to the minute, keeps 24:00 and wraps past midnight with +1', () => {
		expect(formatClock(7.5)).toBe('07:30');
		expect(formatClock(18 + 22 / 60)).toBe('18:22');
		expect(formatClock(0)).toBe('00:00');
		expect(formatClock(24)).toBe('24:00');
		expect(formatClock(24.5)).toBe('00:30+1');
		expect(formatClock(23.999)).toBe('24:00');
	});
});

describe('rangeAreaBounds (a missing key is the edge of the axis)', () => {
	const domain: [number, number] = [0, 300];

	it('uses both row fields when both keys are given', () => {
		expect(rangeAreaBounds({ a: 10, b: 20 }, 'a', 'b', domain)).toStrictEqual([10, 20]);
	});

	it('takes the axis edge for a missing key', () => {
		expect(rangeAreaBounds({ b: 20 }, null, 'b', domain)).toStrictEqual([0, 20]);
		expect(rangeAreaBounds({ a: 250 }, 'a', null, domain)).toStrictEqual([250, 300]);
		expect(rangeAreaBounds({}, null, null, domain)).toStrictEqual([0, 300]);
	});

	it('is null when a given key has no number in the row (nothing to draw)', () => {
		expect(rangeAreaBounds({ a: null, b: 20 }, 'a', 'b', domain)).toBeNull();
		expect(rangeAreaBounds({ b: 20 }, 'a', 'b', domain)).toBeNull();
		expect(rangeAreaBounds({ a: 'x', b: 20 }, 'a', 'b', domain)).toBeNull();
		expect(rangeAreaBounds({ a: NaN, b: 20 }, 'a', 'b', domain)).toBeNull();
		expect(rangeAreaBounds({ a: 5 }, null, 'b', domain)).toBeNull();
	});
});

describe('sub-day ticks', () => {
	it('tickStepMs: sub-day steps only when fine; day steps are the same as tickStepDays', () => {
		expect(tickStepMs(6 * HOUR, 6, true)).toBe(HOUR);
		expect(tickStepMs(30 * MIN, 6, true)).toBe(5 * MIN);
		expect(tickStepMs(6 * HOUR, 6, false)).toBe(DAY_MS);
		expect(tickStepMs(180 * DAY_MS, 8, true)).toBe(tickStepDays(180 * DAY_MS, 8) * DAY_MS);
		expect(tickStepMs(3000 * DAY_MS, 5, true)).toBe(365 * DAY_MS);
	});

	it('timeTicksFine: hourly ticks anchored on the extent, inside the window, stable while panning by whole steps', () => {
		const anchor = Date.UTC(2026, 0, 5, 14, 30);
		const ticks = timeTicksFine([anchor - 2 * HOUR - 10 * MIN, anchor + 3 * HOUR], 8, anchor);
		expect(ticks.length).toBeGreaterThanOrEqual(5);
		expect(ticks.every(t => (t - anchor) % HOUR === 0)).toBe(true);
		expect(ticks.every(t => t >= anchor - 2 * HOUR - 10 * MIN && t <= anchor + 3 * HOUR)).toBe(true);
		const panned = timeTicksFine([anchor - 1 * HOUR - 10 * MIN, anchor + 4 * HOUR], 8, anchor);
		expect(panned).toContain(anchor);
		expect(ticks).toContain(anchor);
	});

	it('timeTicksFine uses the day steps over a month, like timeTicks', () => {
		expect(timeTicksFine([0, 40 * DAY_MS], 6, 0)).toStrictEqual(timeTicks([0, 40 * DAY_MS], 6, 0));
	});
});

describe('small readers', () => {
	it('numberAt returns finite numbers only', () => {
		expect(numberAt({ v: 3 }, 'v')).toBe(3);
		expect(numberAt({ v: 0 }, 'v')).toBe(0);
		for (const bad of [null, undefined, NaN, Infinity, '5', {}, [], true]) {
			expect(numberAt({ v: bad }, 'v')).toBeNull();
		}
		expect(numberAt({}, 'v')).toBeNull();
	});

	it('toFixedDigits clamps to the range toFixed accepts, whole numbers only', () => {
		expect([toFixedDigits(-1), toFixedDigits(0), toFixedDigits(1.9), toFixedDigits(100), toFixedDigits(101), toFixedDigits(1e9)]).toStrictEqual([0, 0, 1, 100, 100, 100]);
	});

	it('xExtent pads the first and last x by half a day, ignores rows without a usable x, and is null without any', () => {
		expect(xExtent([{ t: 2 * DAY_MS }, { t: 'x' }, { t: 5 * DAY_MS }, { t: NaN }, {}], 't')).toStrictEqual([1.5 * DAY_MS, 5.5 * DAY_MS]);
		expect(xExtent([], 't')).toBeNull();
		expect(xExtent([{ t: 'x' }, { v: 1 }], 't')).toBeNull();
		expect(xExtent([{ t: 7 }], 'other')).toBeNull();
	});

	it('xExtent counts a time too large for half a day to register (1e300) as no usable x', () => {
		expect(xExtent([{ t: 1e300 }], 't')).toBeNull();
		expect(xExtent([{ t: 1e300 }, { t: 5 * DAY_MS }], 't')).not.toBeNull();
	});

	it('ticks never repeat when a step is lost in float rounding (near 1e300), and stay under the cap', () => {
		const ticks = timeTicks([1e300, 1e300 * 2], 5, 1e300);
		expect(new Set(ticks).size).toBe(ticks.length);
		expect(timeTicksFine([1e300, 1e300 * 2], 5, 1e300)).toHaveLength(new Set(timeTicksFine([1e300, 1e300 * 2], 5, 1e300)).size);
	});

	it('xExtent of a very long list does not spread it into Math.min', () => {
		const rows = Array.from({ length: 300_000 }, (_, i) => ({ t: i * DAY_MS }));
		expect(xExtent(rows, 't')![0]).toBe(-DAY_MS / 2);
	});
});
