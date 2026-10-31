import { describe, expect, it } from 'vitest';

import { applyChartKeyAction, CHART_KEYS_HINT, chartKeyAction, chartSummary, ZOOM_IN_FACTOR } from './timeSeriesA11y.js';
import { DAY_MS, panWindow } from './timeSeriesMath.js';

describe('chartSummary', () => {
	const rows = [
		{ t: 1 * DAY_MS, a: 70, b: 70 },
		{ t: 2 * DAY_MS, a: null, b: 70 },
		{ t: 3 * DAY_MS, a: 68.5, b: 69.25 },
		{ t: 20 * DAY_MS, a: 99, b: null },
	];
	const base = {
		title: 'Temperature',
		rows,
		xKey: 't',
		win: [0.5 * DAY_MS, 10.5 * DAY_MS] as const,
		formatValue: (v: number) => `${v} deg`,
		formatDay: (t: number) => `day ${Math.round(t / DAY_MS)}`,
	};

	it('summarises the window: range, latest with its day, min, max, count; values outside the window are ignored', () => {
		const text = chartSummary({ ...base, series: [{ key: 'a', name: 'Series A' }, { key: 'b', name: 'Series B' }] });
		expect(text).toBe(
			'Temperature, day 1 to day 10 (10 days). Series A: latest 68.5 deg on day 3, min 68.5 deg, max 70 deg, 2 values. Series B: latest 69.25 deg on day 3, min 69.25 deg, max 70 deg, 3 values.',
		);
	});

	it('says so when nothing is in the window, and names the chart "Chart" without a title', () => {
		const empty = chartSummary({ ...base, title: undefined, win: [100 * DAY_MS, 110 * DAY_MS], series: [{ key: 'a', name: 'Series A' }] });
		// The head names the first and last DAY of the window (half a day inside each edge): 100.5 rounds to 101 in this formatter.
		expect(empty).toBe('Chart, day 101 to day 110 (10 days). No value in this period.');
	});

	it('skips a series without values in the window', () => {
		const text = chartSummary({ ...base, series: [{ key: 'a', name: 'Series A' }, { key: 'nope', name: 'Ghost' }] });
		expect(text).not.toContain('Ghost');
		expect(text).toContain('Series A');
	});

	it('counts with the right plural, and the latest is the one with the greatest x even when rows come unsorted', () => {
		expect(chartSummary({ ...base, win: [2.5 * DAY_MS, 3.5 * DAY_MS], series: [{ key: 'a', name: 'Series A' }] })).toMatch(/, 1 value\.$/);
		const unsorted = chartSummary({ ...base, rows: [rows[2]!, rows[0]!], series: [{ key: 'a', name: 'Series A' }] });
		expect(unsorted).toContain('latest 68.5 deg on day 3');
	});

	it('the window edges are inside, and a one-day window says "1 days" at least once (never 0)', () => {
		const edge = chartSummary({ ...base, win: [DAY_MS, 3 * DAY_MS], series: [{ key: 'a', name: 'Series A' }] });
		expect(edge).toMatch(/2 values\.$/);
		expect(chartSummary({ ...base, win: [0, 1], series: [] })).toMatch(/\(1 days\)/);
	});

	it('ignores non-numeric and non-finite values', () => {
		const odd = [{ t: DAY_MS, a: 'x' }, { t: 2 * DAY_MS, a: NaN }, { t: 3 * DAY_MS, a: Infinity }, { t: 'y', a: 1 }];
		expect(chartSummary({ ...base, rows: odd, series: [{ key: 'a', name: 'Series A' }] })).toMatch(/No value in this period\.$/);
	});
});

describe('chartKeyAction', () => {
	it('maps the documented keys to their action', () => {
		expect(chartKeyAction('ArrowLeft')).toBe('pan-earlier');
		expect(chartKeyAction('ArrowRight')).toBe('pan-later');
		expect(chartKeyAction('+')).toBe('zoom-in');
		expect(chartKeyAction('=')).toBe('zoom-in');
		expect(chartKeyAction('-')).toBe('zoom-out');
		expect(chartKeyAction('_')).toBe('zoom-out');
		expect(chartKeyAction('0')).toBe('reset');
	});

	it('leaves every other key alone, including names inherited from Object', () => {
		for (const key of ['a', 'Tab', 'Enter', 'ArrowUp', '1', '', 'constructor', 'toString', '__proto__', 'hasOwnProperty']) {
			expect(chartKeyAction(key)).toBeNull();
		}
	});

	it('leaves Ctrl, Meta and Alt combinations to the browser (page zoom), each on its own', () => {
		expect(chartKeyAction('-', { ctrlKey: true })).toBeNull();
		expect(chartKeyAction('0', { metaKey: true })).toBeNull();
		expect(chartKeyAction('ArrowLeft', { altKey: true })).toBeNull();
		expect(chartKeyAction('-', { ctrlKey: false, metaKey: false, altKey: false })).toBe('zoom-out');
	});

	it('the hint names every key', () => {
		expect(CHART_KEYS_HINT).toMatch(/arrows.*plus and minus.*0/);
	});
});

describe('applyChartKeyAction', () => {
	const extent = [0, 100 * DAY_MS] as const;
	const win = [40 * DAY_MS, 60 * DAY_MS] as const;

	it('pans by half the window, like the brush buttons', () => {
		expect(applyChartKeyAction('pan-earlier', win, extent)).toStrictEqual(panWindow(win, extent, -10 * DAY_MS));
		expect(applyChartKeyAction('pan-later', win, extent)).toStrictEqual([50 * DAY_MS, 70 * DAY_MS]);
	});

	it('zooms by the brush factor around the centre in and out, and 0 is the whole period', () => {
		const zoomedIn = applyChartKeyAction('zoom-in', win, extent)!;
		expect(zoomedIn[1] - zoomedIn[0]).toBeCloseTo(20 * DAY_MS * ZOOM_IN_FACTOR, 0);
		expect((zoomedIn[0] + zoomedIn[1]) / 2).toBe(50 * DAY_MS);
		const zoomedOut = applyChartKeyAction('zoom-out', win, extent)!;
		expect(zoomedOut[1] - zoomedOut[0]).toBeCloseTo((20 * DAY_MS) / ZOOM_IN_FACTOR, 0);
		expect(applyChartKeyAction('reset', win, extent)).toBeNull();
	});

	it('on the whole period there is nothing to pan to, and a pan stops at the edge', () => {
		expect(applyChartKeyAction('pan-earlier', extent, extent)).toStrictEqual(extent);
		expect(applyChartKeyAction('pan-later', extent, extent)).toStrictEqual(extent);
		expect(applyChartKeyAction('pan-earlier', [0, 20 * DAY_MS], extent)![0]).toBe(0);
	});
});
