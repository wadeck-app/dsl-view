import { describe, expect, it } from 'vitest';

import {
	bridgeY,
	layoutSpark,
	nearestIndex,
	placeTooltip,
	pointAnnouncement,
	pointsFromValues,
	pointsProblem,
	pointText,
	SPARK_H,
	SPARK_W,
	sparkValuesProblem,
	stepIndex,
	xOf,
	type SparkPoint,
} from './sparkline.js';

const m = (label: string, value: number, extra: Partial<SparkPoint> = {}): SparkPoint => ({ label, value, measured: true, ...extra });
const gap = (label: string): SparkPoint => ({ label, value: null, measured: false });

describe('nearestIndex', () => {
	it('snaps to the closest of 7 points over 60 px (step 10)', () => {
		expect(nearestIndex(0, 60, 7)).toBe(0);
		expect(nearestIndex(4.9, 60, 7)).toBe(0);
		expect(nearestIndex(5.1, 60, 7)).toBe(1);
		expect(nearestIndex(30, 60, 7)).toBe(3);
		expect(nearestIndex(60, 60, 7)).toBe(6);
	});

	it('clamps outside the drawing (hit area padding, fast moves)', () => {
		expect(nearestIndex(-20, 60, 7)).toBe(0);
		expect(nearestIndex(500, 60, 7)).toBe(6);
	});

	it('degenerate inputs: one point, no point, zero width', () => {
		expect(nearestIndex(10, 60, 1)).toBe(0);
		expect(nearestIndex(10, 60, 0)).toBe(-1);
		expect(nearestIndex(10, 0, 7)).toBe(0);
	});

	it('a missing coordinate (NaN) is the first point, never a NaN index', () => {
		expect(nearestIndex(Number.NaN, 60, 7)).toBe(0);
		expect(nearestIndex(undefined as unknown as number, 60, 7)).toBe(0);
	});
});

describe('stepIndex', () => {
	it('arrows move by one, Home/End jump, Up/Down mirror Right/Left', () => {
		expect(stepIndex(3, 'ArrowRight', 7)).toBe(4);
		expect(stepIndex(3, 'ArrowLeft', 7)).toBe(2);
		expect(stepIndex(3, 'ArrowUp', 7)).toBe(4);
		expect(stepIndex(3, 'ArrowDown', 7)).toBe(2);
		expect(stepIndex(3, 'Home', 7)).toBe(0);
		expect(stepIndex(3, 'End', 7)).toBe(6);
	});

	it('null at the ends and for other keys', () => {
		expect(stepIndex(6, 'ArrowRight', 7)).toBeNull();
		expect(stepIndex(0, 'ArrowLeft', 7)).toBeNull();
		expect(stepIndex(0, 'Home', 7)).toBeNull();
		expect(stepIndex(6, 'End', 7)).toBeNull();
		expect(stepIndex(3, 'a', 7)).toBeNull();
		expect(stepIndex(0, 'ArrowRight', 0)).toBeNull();
	});
});

describe('placeTooltip', () => {
	const tip = { w: 150, h: 40 };
	const vp = { w: 1000, h: 800 };
	// a 140x50 tile at (300, 200)
	const tile = { left: 300, top: 200, right: 440, bottom: 250 };
	const intersects = (p: { left: number; top: number }, r: typeof tile): boolean => p.left < r.right && p.left + tip.w > r.left && p.top < r.bottom && p.top + tip.h > r.top;

	it('above the tile by default, centred on the pointer', () => {
		expect(placeTooltip(370, tile, tip, vp)).toStrictEqual({ left: 295, top: 154, side: 'above' });
	});

	it('follows the pointer horizontally and keeps the same height', () => {
		const a = placeTooltip(350, tile, tip, vp);
		const b = placeTooltip(400, tile, tip, vp);
		expect(b.left - a.left).toBe(50);
		expect(a.top).toBe(b.top);
	});

	it('clamps at the right and left edges of the viewport', () => {
		expect(placeTooltip(995, tile, tip, vp).left).toBe(846);
		expect(placeTooltip(2, tile, tip, vp).left).toBe(4);
		expect(placeTooltip(-100, tile, tip, vp).left).toBe(4);
		expect(placeTooltip(5000, tile, tip, vp).left).toBe(846);
	});

	it('no room above: below the whole tile, not on its content', () => {
		const top = { left: 300, top: 10, right: 440, bottom: 60 };
		const p = placeTooltip(370, top, tip, vp);
		expect(p).toStrictEqual({ left: 295, top: 66, side: 'below' });
		expect(intersects(p, top)).toBe(false);
	});

	it('exactly enough room above stays above, one pixel less goes below', () => {
		const edge = { ...tile, top: 4 + 6 + 40, bottom: 100 };
		expect(placeTooltip(370, edge, tip, vp).side).toBe('above');
		expect(placeTooltip(370, { ...edge, top: edge.top - 1 }, tip, vp).side).toBe('below');
	});

	it('small viewport: never leaves it, and never overlaps the tile when one side fits', () => {
		const small = { w: 200, h: 140 };
		for (const t of [{ left: 10, top: 60, right: 150, bottom: 110 }, { left: 10, top: 10, right: 150, bottom: 60 }, { left: 10, top: 80, right: 150, bottom: 130 }]) {
			for (const x of [-10, 20, 100, 190, 400]) {
				const p = placeTooltip(x, t, tip, small);
				expect(p.left, `x=${x} left`).toBeGreaterThanOrEqual(4);
				expect(p.left + tip.w, `x=${x} right`).toBeLessThanOrEqual(small.w - 4);
				expect(p.top, `x=${x} top`).toBeGreaterThanOrEqual(4);
				expect(p.top + tip.h, `x=${x} bottom`).toBeLessThanOrEqual(small.h - 4);
				if (t.top >= 50 || t.bottom <= 90) {
					expect(intersects(p, t), `x=${x} tile=${JSON.stringify(t)} -> ${JSON.stringify(p)}`).toBe(false);
				}
			}
		}
	});

	it('neither side fits: picks the side with more room and stays inside the viewport', () => {
		const p = placeTooltip(50, { left: 0, top: 20, right: 100, bottom: 60 }, { w: 80, h: 100 }, { w: 200, h: 110 });
		expect(p.top).toBeGreaterThanOrEqual(4);
		expect(p.top + 100).toBeLessThanOrEqual(106);
	});
});

describe('layoutSpark', () => {
	it('all measured: one solid run, no bridge, no dot; highest value is at the top', () => {
		const l = layoutSpark([m('a', 1), m('b', 3), m('c', 2)]);
		expect(l.solid).toHaveLength(1);
		expect(l.dashed).toStrictEqual([]);
		expect(l.dots).toStrictEqual([]);
		expect(l.xs[0]).toBe(0);
		expect(l.xs[2]).toBe(SPARK_W);
		expect(l.ys[1]!).toBeLessThan(l.ys[2]!);
		expect(l.ys[2]!).toBeLessThan(l.ys[0]!);
		expect(l.ys.every(y => y! > 0 && y! < SPARK_H)).toBe(true);
	});

	it('a gap in the middle: two runs joined by a dashed bridge', () => {
		const l = layoutSpark([m('a', 1), m('b', 2), gap('c'), gap('d'), m('e', 3), m('f', 2)]);
		expect(l.solid).toHaveLength(2);
		expect(l.dashed).toHaveLength(1);
		expect([l.dashed[0]![0], l.dashed[0]![2]]).toStrictEqual([l.xs[1], l.xs[4]]);
	});

	it('a lone measured point between gaps is a dot; leading and trailing gaps draw nothing', () => {
		const l = layoutSpark([gap('a'), m('b', 1), gap('c'), m('d', 2), m('e', 3), gap('f')]);
		expect(l.dots).toStrictEqual([[l.xs[1]!, l.ys[1]!]]);
		expect(l.solid).toHaveLength(1);
		expect(l.dashed).toHaveLength(1);
	});

	it('single measured point: one dot in the window, no line', () => {
		const l = layoutSpark([gap('a'), gap('b'), m('c', 5)]);
		expect(l.dots).toHaveLength(1);
		expect(l.solid.length + l.dashed.length).toBe(0);
	});

	it('constant values sit mid-height; no data at all draws nothing', () => {
		expect(layoutSpark([m('a', 2), m('b', 2)]).ys).toStrictEqual([SPARK_H / 2, SPARK_H / 2]);
		const none = layoutSpark([gap('a'), gap('b')]);
		expect([none.solid, none.dashed, none.dots]).toStrictEqual([[], [], []]);
	});

	it('a range wider than the largest float is drawn flat, never with NaN coordinates', () => {
		const l = layoutSpark([m('a', 1e308), m('b', -1e308), m('c', 0)]);
		expect(l.ys).toStrictEqual([SPARK_H / 2, SPARK_H / 2, SPARK_H / 2]);
		expect(l.solid.join(' ')).not.toContain('NaN');
	});

	it('negative and decimal values keep their order', () => {
		const l = layoutSpark([m('a', -3.5), m('b', 0.25), m('c', -1)]);
		expect(l.ys[1]!).toBeLessThan(l.ys[2]!);
		expect(l.ys[2]!).toBeLessThan(l.ys[0]!);
	});
});

describe('bridgeY', () => {
	it('measured point: its own y; absent between two measured: linear interpolation; absent at an end: null', () => {
		const ys = [2, null, null, 8, null];
		expect(bridgeY(ys, 0)).toBe(2);
		expect(bridgeY(ys, 1)).toBe(4);
		expect(bridgeY(ys, 2)).toBe(6);
		expect(bridgeY(ys, 4)).toBeNull();
		expect(bridgeY([null, 1], 0)).toBeNull();
	});
});

describe('xOf / pointText / pointAnnouncement / pointsFromValues', () => {
	it('xOf spreads the points over the width, a single point is centred', () => {
		expect(xOf(0, 7, 60)).toBe(0);
		expect(xOf(3, 7, 60)).toBe(30);
		expect(xOf(0, 1, 60)).toBe(30);
	});

	it('uses the owner text and detail, with a readable default', () => {
		const p = m('2026-10-23', 68.6, { text: '2026-10-23: 68.6 ms', detail: '-0.3 ms vs 2026-10-22' });
		expect(pointText(p)).toBe('2026-10-23: 68.6 ms');
		expect(pointAnnouncement(p)).toBe('2026-10-23: 68.6 ms, -0.3 ms vs 2026-10-22');
		expect(pointText(m('x', 4))).toBe('x: 4');
		expect(pointText(m('x', 0))).toBe('x: 0');
		expect(pointText(gap('y'))).toBe('y: no data');
		expect(pointAnnouncement({ ...gap('y'), detail: 'ignored' })).toBe('y: no data');
	});

	it('an owner text of the empty string is kept (?? not ||), a detail of null adds nothing', () => {
		expect(pointText(m('x', 4, { text: '' }))).toBe('');
		expect(pointAnnouncement(m('x', 4, { detail: null }))).toBe('x: 4');
		expect(pointAnnouncement(m('x', 4, { detail: '' }))).toBe('x: 4');
	});

	it('plain values get positional labels and null is a gap', () => {
		expect(pointsFromValues([1, null, 3])).toStrictEqual([
			{ label: '#1', value: 1, measured: true },
			{ label: '#2', value: null, measured: false },
			{ label: '#3', value: 3, measured: true },
		]);
		expect(pointsFromValues([0])[0]!.measured).toBe(true);
	});
});

describe('pointsProblem', () => {
	it('accepts valid points, an empty list, and null/undefined optional fields', () => {
		expect(pointsProblem([m('a', 1), gap('b'), m('c', 0, { text: 't', detail: 'd' })], 'p')).toBeNull();
		expect(pointsProblem([], 'p')).toBeNull();
		expect(pointsProblem([{ label: 'a', value: 1, measured: true, text: null, detail: null }], 'p')).toBeNull();
		expect(pointsProblem([{ label: 'a', measured: false }], 'p')).toBeNull();
	});

	it('names the prop and the entry for each kind of wrong shape', () => {
		const bad: unknown[] = [
			'text',
			{},
			42,
			[null],
			[{}],
			[{ label: 1, value: 1, measured: true }],
			[{ label: 'a', value: 1, measured: 'yes' }],
			[{ label: 'a', value: '1', measured: true }],
			[{ label: 'a', value: null, measured: true }],
			[{ label: 'a', value: Number.NaN, measured: true }],
			[{ label: 'a', value: Infinity, measured: true }],
			[{ label: 'a', value: 'x', measured: false }],
			[{ label: 'a', value: 1, measured: true, text: 5 }],
			[{ label: 'a', value: 1, measured: true, detail: {} }],
			[m('ok', 1), { label: 'a' }],
		];
		for (const value of bad) {
			const problem = pointsProblem(value, 'trend.points');
			expect(problem, JSON.stringify(value)).toContain('trend.points must be a list of');
		}
		expect(pointsProblem([m('ok', 1), { label: 'a' }], 'p')).toContain('entry 1');
	});

	it('never throws on values JSON cannot print', () => {
		const circular: Record<string, unknown> = {};
		circular['self'] = circular;
		expect(() => pointsProblem([circular], 'p')).not.toThrow();
		expect(() => pointsProblem([{ label: 'a', value: 1n, measured: true }], 'p')).not.toThrow();
		expect(pointsProblem(Symbol('s'), 'p')).toContain('p must be a list');
	});
});

describe('sparkValuesProblem', () => {
	it('accepts finite numbers and null', () => {
		expect(sparkValuesProblem([1, null, 0, -2.5], 's')).toBeNull();
		expect(sparkValuesProblem([], 's')).toBeNull();
	});

	it('rejects a non-list, text, NaN, Infinity and objects', () => {
		for (const value of ['x', {}, 5, [Number.NaN], [Infinity], ['1'], [{}], [undefined]]) {
			expect(sparkValuesProblem(value, 'items[0].trend.spark'), JSON.stringify(value)).toContain('items[0].trend.spark must be a list of finite numbers or null');
		}
	});
});
