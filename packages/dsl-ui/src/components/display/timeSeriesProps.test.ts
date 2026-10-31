import { describe, expect, it } from 'vitest';

import { CHART_PALETTE } from './chartFormat.js';
import { checkTimeBrushProps, checkTimeSeriesChartProps, isRecord, recordRows, show } from './timeSeriesProps.js';
import type { TimeBrushSettings, TimeSeriesChartSettings } from './timeSeriesProps.js';

const ok = { data: [{ t: 1, v: 1 }], series: [{ key: 'v', name: 'V', color: 'red' }] };

/** The settings of props that must be valid; fails loudly with the message otherwise. */
function settingsOf(props: unknown): TimeSeriesChartSettings {
	const checked = checkTimeSeriesChartProps(props);
	if (!checked.ok) {
		throw new Error(`expected valid props, got: ${checked.message}`);
	}
	return checked.settings;
}
/** The message of props that must be refused. */
function messageOf(props: unknown): string {
	const checked = checkTimeSeriesChartProps(props);
	if (checked.ok) {
		throw new Error('expected the props to be refused');
	}
	return checked.message;
}
function brushOf(props: unknown): TimeBrushSettings {
	const checked = checkTimeBrushProps(props);
	if (!checked.ok) {
		throw new Error(`expected valid brush props, got: ${checked.message}`);
	}
	return checked.settings;
}

describe('checkTimeSeriesChartProps: defaults', () => {
	it('fills every default for a minimal node', () => {
		const s = settingsOf(ok);
		expect(s).toMatchObject({
			xKey: 't',
			syncGroup: 'default',
			gapDashAfterDays: null,
			yAxisWidth: 56,
			marginRight: 16,
			height: 220,
			yUnit: '',
			yFormat: 'number',
			yDecimals: 1,
			yIncludeZero: false,
			xFormat: 'date',
			emptyMessage: 'No data in this period',
			yRightFormat: 'number',
			yRightUnit: '',
			yRightDecimals: 1,
			yRightIncludeZero: false,
			yRightAxisWidth: 56,
		});
		expect(s.title).toBeUndefined();
		expect(s.domain).toBeUndefined();
		expect(s.bands).toStrictEqual([]);
		expect(s.rangeAreas).toStrictEqual([]);
		expect(s.legendItems).toStrictEqual([]);
		expect(s.series[0]).toStrictEqual({ key: 'v', name: 'V', color: 'red', width: 2, dots: 0, gapDash: true, legend: true, kind: 'line', axis: 'left', showValue: true, pointColorKey: undefined, detailKey: undefined, fromKey: undefined, decimals: undefined });
	});

	it('keeps what is given: every falsy-but-valid value wins over its default', () => {
		const s = settingsOf({
			...ok,
			series: [{ key: 'v', name: 'V', color: 'red', width: 0, dots: 0, gapDash: false, legend: false, showValue: false, decimals: 0 }],
			height: 0,
			yDecimals: 0,
			marginRight: 0,
			yAxisWidth: 0,
			gapDashAfterDays: 0,
			yUnit: '',
			emptyMessage: '',
			syncGroup: 'g',
		});
		expect(s.series[0]).toMatchObject({ width: 0, dots: 0, gapDash: false, legend: false, showValue: false, decimals: 0 });
		expect([s.height, s.yDecimals, s.marginRight, s.yAxisWidth, s.gapDashAfterDays, s.emptyMessage, s.syncGroup]).toStrictEqual([0, 0, 0, 0, 0, '', 'g']);
	});

	it('an empty text for syncGroup or xKey is the default, a number-like text for a number prop is read', () => {
		const s = settingsOf({ ...ok, syncGroup: '', xKey: '', height: '300' });
		expect([s.syncGroup, s.xKey, s.height]).toStrictEqual(['default', 't', 300]);
	});

	it('data: undefined and null are "still loading"; a list is kept as it is', () => {
		expect(settingsOf({ ...ok, data: undefined }).data).toBeUndefined();
		expect(settingsOf({ ...ok, data: null }).data).toBeUndefined();
		expect(settingsOf({ ...ok, data: [] }).data).toStrictEqual([]);
		const rows = [{ t: 1 }];
		expect(settingsOf({ ...ok, data: rows }).data).toBe(rows);
	});

	it('props that are not a map count as no props, and the missing series is said', () => {
		for (const odd of [undefined, null, 'x', 3, [], true]) {
			expect(messageOf(odd)).toMatch(/^series must list at least one series/);
		}
	});
});

describe('checkTimeSeriesChartProps: series', () => {
	it('a series without a colour takes the next colour of the theme palette, by position; an empty one too', () => {
		const s = settingsOf({ ...ok, series: [{ key: 'a', name: 'A' }, { key: 'b', name: 'B', color: 'red' }, { key: 'c', name: 'C', color: '' }] });
		expect(s.series.map(x => x.color)).toStrictEqual([CHART_PALETTE[0], 'red', CHART_PALETTE[2]]);
		expect(CHART_PALETTE[0]).toMatch(/^var\(--color-/);
	});

	it('a colour that is not a text is refused naming the fix (not ignored)', () => {
		expect(messageOf({ ...ok, series: [{ key: 'v', name: 'V', color: 3 }] })).toBe('series[0].color must be a non-empty text, got 3.');
		expect(messageOf({ ...ok, series: [{ key: 'v', name: 'V', color: {} }] })).toBe('series[0].color must be a non-empty text, got {}.');
	});

	it('key and name are required texts', () => {
		expect(messageOf({ ...ok, series: [{ name: 'V' }] })).toBe('series[0].key must be a non-empty text, got nothing.');
		expect(messageOf({ ...ok, series: [{ key: 'v', name: '' }] })).toBe('series[0].name must be a non-empty text, got "".');
		expect(messageOf({ ...ok, series: [{ key: 'v', name: 'V' }, 5] })).toBe('series[1] must be a map with key and name (and optionally color).');
	});

	it('kind: line by default, area and bar accepted, anything else refused naming the values', () => {
		const kinds = settingsOf({ ...ok, series: [{ key: 'a', name: 'A' }, { key: 'b', name: 'B', kind: 'area' }, { key: 'c', name: 'C', kind: 'bar' }, { key: 'd', name: 'D', kind: null }] }).series.map(s => s.kind);
		expect(kinds).toStrictEqual(['line', 'area', 'bar', 'line']);
		expect(messageOf({ ...ok, series: [{ key: 'v', name: 'V', kind: 'step' }] })).toBe('series[0].kind must be "line", "area" or "bar", got "step".');
	});

	it('fromKey only on a bar; an empty fromKey is none', () => {
		const bar = settingsOf({ ...ok, series: [{ key: 'end', fromKey: 'start', kind: 'bar', name: 'B', decimals: 1 }] }).series[0]!;
		expect([bar.fromKey, bar.decimals]).toStrictEqual(['start', 1]);
		expect(messageOf({ ...ok, series: [{ key: 'v', fromKey: 's', name: 'V' }] })).toBe('series[0].fromKey only applies to a bar (add kind: bar), got kind "line".');
		expect(settingsOf({ ...ok, series: [{ key: 'v', fromKey: '', name: 'V' }] }).series[0]!.fromKey).toBeUndefined();
	});

	it('axis: left by default, right accepted, anything else refused', () => {
		const axes = settingsOf({ ...ok, marginRight: 60, series: [{ key: 'a', name: 'A' }, { key: 'b', name: 'B', axis: 'right' }] }).series.map(s => s.axis);
		expect(axes).toStrictEqual(['left', 'right']);
		expect(messageOf({ ...ok, series: [{ key: 'v', name: 'V', axis: 'top' }] })).toBe('series[0].axis must be "left" or "right", got "top".');
	});

	it('numbers: a text that is not a number is refused, null and empty are the default', () => {
		expect(messageOf({ ...ok, series: [{ key: 'v', name: 'V', width: 'thick' }] })).toBe('series[0].width must be a number, got "thick".');
		expect(messageOf({ ...ok, series: [{ key: 'v', name: 'V', dots: NaN }] })).toBe('series[0].dots must be a number, got null.');
		expect(messageOf({ ...ok, series: [{ key: 'v', name: 'V', decimals: 'x' }] })).toBe('series[0].decimals must be a number, got "x".');
		const s = settingsOf({ ...ok, series: [{ key: 'v', name: 'V', width: null, dots: '', decimals: null }] }).series[0]!;
		expect([s.width, s.dots, s.decimals]).toStrictEqual([2, 0, undefined]);
	});

	it('only the boolean false switches gapDash, legend and showValue off', () => {
		const s = settingsOf({ ...ok, series: [{ key: 'v', name: 'V', gapDash: 0, legend: '', showValue: null }] }).series[0]!;
		expect([s.gapDash, s.legend, s.showValue]).toStrictEqual([true, true, true]);
	});

	it('series must be a list with at least one entry', () => {
		expect(messageOf({ data: [] })).toBe('series must list at least one series ({ key, name }).');
		expect(messageOf({ data: [], series: [] })).toBe('series must list at least one series ({ key, name }).');
		expect(messageOf({ data: [], series: 'v' })).toBe('series must be a list, got "v".');
	});
});

describe('checkTimeSeriesChartProps: bands, range areas, legend items', () => {
	const area = { lowKey: 'a', highKey: 'b', name: 'N', color: 'red' };

	it('a range area may leave lowKey or highKey out: that side is the edge of the axis (undefined and null alike)', () => {
		const s = settingsOf({ ...ok, rangeAreas: [{ highKey: 'b', name: 'N', color: 'red' }, { lowKey: 'a', name: 'M', color: 'red' }, { lowKey: null, highKey: null, name: 'O', color: 'red' }] });
		expect(s.rangeAreas.map(a => [a.lowKey, a.highKey])).toStrictEqual([[null, 'b'], ['a', null], [null, null]]);
		expect(messageOf({ ...ok, rangeAreas: [{ ...area, lowKey: 3 }] })).toBe('rangeAreas[0].lowKey must be a non-empty text, got 3.');
		expect(messageOf({ ...ok, rangeAreas: [{ ...area, highKey: '' }] })).toBe('rangeAreas[0].highKey must be a non-empty text, got "".');
	});

	it('a range area is listed in the legend unless it says legend: false; opacity defaults to 0.15', () => {
		const s = settingsOf({ ...ok, rangeAreas: [area, { ...area, name: 'M', legend: false, opacity: 0 }] });
		expect(s.rangeAreas.map(a => a.legend)).toStrictEqual([true, false]);
		expect(s.rangeAreas.map(a => a.opacity)).toStrictEqual([0.15, 0]);
	});

	it('bands: from, to and colour are required, 0 is a value, opacity defaults to 0.12', () => {
		expect(messageOf({ ...ok, bands: [{ to: 3, color: 'red' }] })).toBe('bands[0].from is required.');
		expect(messageOf({ ...ok, bands: [{ from: 1, to: '', color: 'red' }] })).toBe('bands[0].to is required.');
		expect(messageOf({ ...ok, bands: [{ from: 1, to: 2 }] })).toBe('bands[0].color must be a non-empty text, got nothing.');
		expect(messageOf({ ...ok, bands: ['x'] })).toBe('bands[0] must be a map with from, to and color.');
		const band = settingsOf({ ...ok, bands: [{ from: 0, to: 0, color: 'red', label: 'zero' }] }).bands[0]!;
		expect(band).toStrictEqual({ from: 0, to: 0, color: 'red', opacity: 0.12, label: 'zero' });
	});

	it('legend items: label and colour are required', () => {
		expect(settingsOf({ ...ok, legendItems: [{ label: 'L', color: 'red' }] }).legendItems).toStrictEqual([{ label: 'L', color: 'red' }]);
		expect(messageOf({ ...ok, legendItems: [{ color: 'red' }] })).toBe('legendItems[0].label must be a non-empty text, got nothing.');
		expect(messageOf({ ...ok, legendItems: [null] })).toBe('legendItems[0] must be a map with label and color.');
	});

	it('the four lists must be lists', () => {
		for (const name of ['bands', 'rangeAreas', 'legendItems']) {
			expect(messageOf({ ...ok, [name]: 'x' })).toBe(`${name} must be a list, got "x".`);
			expect(settingsOf({ ...ok, [name]: null })).toBeTruthy();
		}
	});
});

describe('checkTimeSeriesChartProps: right axis, domain, formats', () => {
	const right = { ...ok, series: [{ key: 'v', name: 'V', color: 'red', axis: 'right' }] };

	it('a right series reads its own settings once marginRight leaves room for it', () => {
		const s = settingsOf({ ...right, marginRight: 60, yRightFormat: 'clock', yRightUnit: 'u', yRightDecimals: 0, yRightIncludeZero: true, yRightAxisWidth: 48 });
		expect([s.yRightFormat, s.yRightUnit, s.yRightDecimals, s.yRightIncludeZero, s.yRightAxisWidth, s.marginRight]).toStrictEqual(['clock', 'u', 0, true, 48, 60]);
	});

	it('orphan yRight settings are refused naming the fix, singular and plural', () => {
		expect(messageOf({ ...ok, yRightUnit: 'u' })).toBe('yRightUnit only applies to the right axis: add axis: right to a series, or remove it.');
		expect(messageOf({ ...ok, yRightUnit: 'u', yRightFormat: 'clock' })).toBe('yRightFormat, yRightUnit only apply to the right axis: add axis: right to a series, or remove them.');
	});

	it('a right-axis setting equal to its default is not "given" (the generated registry may pass every prop)', () => {
		const defaults = { yRightFormat: 'number', yRightUnit: '', yRightDecimals: 1, yRightIncludeZero: false, yRightAxisWidth: 56 };
		expect(settingsOf({ ...ok, ...defaults })).toBeTruthy();
		expect(messageOf({ ...ok, ...defaults, yRightDecimals: 2 })).toMatch(/^yRightDecimals only applies/);
	});

	it('a margin smaller than the right axis is refused, the boundary is accepted', () => {
		expect(messageOf(right)).toBe('The right axis is drawn inside marginRight: set marginRight to at least 56 (got 16), the same on every stacked chart and on the TimeBrush so the plot areas stay aligned.');
		expect(messageOf({ ...right, marginRight: 55 })).toMatch(/at least 56 \(got 55\)/);
		expect(settingsOf({ ...right, marginRight: 56 }).marginRight).toBe(56);
		expect(settingsOf({ ...right, marginRight: 40, yRightAxisWidth: 40 }).yRightAxisWidth).toBe(40);
	});

	it('domain must be [min, max], finite, min < max', () => {
		expect(settingsOf({ ...ok, domain: [1, 2] }).domain).toStrictEqual([1, 2]);
		for (const bad of [[5, 1], [5, 5], [NaN, 1], [0, Infinity], [0, 'x'], [1], [1, 2, 3], 'x', {}]) {
			expect(messageOf({ ...ok, domain: bad })).toMatch(/^domain must be \[min, max\] with min < max, got /);
		}
	});

	it('xFormat and yFormat accept their values and refuse the rest naming them', () => {
		expect(settingsOf({ ...ok, xFormat: 'time' }).xFormat).toBe('time');
		expect(settingsOf({ ...ok, xFormat: 'datetime' }).xFormat).toBe('datetime');
		expect(settingsOf({ ...ok, yFormat: 'clock' }).yFormat).toBe('clock');
		expect(messageOf({ ...ok, xFormat: 'hour' })).toBe('xFormat must be "date", "time" or "datetime", got "hour".');
		expect(messageOf({ ...ok, yFormat: 'hex' })).toBe('yFormat must be "number" or "clock", got "hex".');
		expect(messageOf({ ...right, marginRight: 60, yRightFormat: 'hex' })).toBe('yRightFormat must be "number" or "clock", got "hex".');
	});

	it('numbers that are not numbers are refused naming the prop', () => {
		expect(messageOf({ ...ok, height: 'tall' })).toBe('height must be a number, got "tall".');
		expect(messageOf({ ...ok, yDecimals: {} })).toBe('yDecimals must be a number, got {}.');
		expect(messageOf({ ...ok, gapDashAfterDays: 'x' })).toBe('gapDashAfterDays must be a number, got "x".');
		expect(messageOf({ ...ok, yAxisWidth: Infinity })).toBe('yAxisWidth must be a number, got null.');
	});

	it('data must be a list, with the way to write it', () => {
		expect(messageOf({ ...ok, data: 'nope' })).toBe('data must be a list of rows (for example data: $sources.series.rows), got "nope".');
		expect(messageOf({ ...ok, data: {} })).toMatch(/^data must be a list of rows/);
	});

	it('yIncludeZero and yRightIncludeZero need the boolean true', () => {
		expect(settingsOf({ ...ok, yIncludeZero: 'yes' }).yIncludeZero).toBe(false);
		expect(settingsOf({ ...ok, yIncludeZero: true }).yIncludeZero).toBe(true);
	});

	it('is idempotent on its own output (the settings are valid props)', () => {
		const first = settingsOf({ ...right, marginRight: 60, rangeAreas: [{ highKey: 'b', name: 'N', color: 'red' }], title: 'T' });
		expect(settingsOf(first)).toStrictEqual(first);
	});
});

describe('checkTimeBrushProps', () => {
	it('line by default, bars accepted, anything else refused', () => {
		expect(brushOf({ valueKey: 'v' }).kind).toBe('line');
		expect(brushOf({ valueKey: 'v', kind: 'bars' }).kind).toBe('bars');
		expect(brushOf({ valueKey: 'v', kind: null }).kind).toBe('line');
		const refused = checkTimeBrushProps({ valueKey: 'v', kind: 'dots' });
		expect(refused).toStrictEqual({ ok: false, message: 'kind must be "line" or "bars", got "dots".' });
	});

	it('defaults, and what is given wins (0 included)', () => {
		expect(brushOf({ valueKey: 'v' })).toStrictEqual({ data: undefined, xKey: 't', valueKey: 'v', kind: 'line', domain: undefined, syncGroup: 'default', height: 56, yAxisWidth: 56, marginRight: 16 });
		const given = brushOf({ valueKey: 'v', height: 0, yAxisWidth: 0, marginRight: 0, syncGroup: 'g', xKey: 'x', domain: [1, 2], data: [] });
		expect(given).toMatchObject({ height: 0, yAxisWidth: 0, marginRight: 0, syncGroup: 'g', xKey: 'x', domain: [1, 2], data: [] });
	});

	it('numbers that are not finite numbers fall back to the default (the strip must still draw)', () => {
		expect(brushOf({ valueKey: 'v', height: 'x', yAxisWidth: NaN, marginRight: Infinity })).toMatchObject({ height: 56, yAxisWidth: 56, marginRight: 16 });
	});

	it('valueKey is required, naming what it is for', () => {
		for (const bad of [undefined, '', 3, null]) {
			expect(checkTimeBrushProps({ valueKey: bad })).toStrictEqual({ ok: false, message: 'valueKey is required: the field of the row drawn as the overview line.' });
		}
	});

	it('domain and data are refused like the chart does', () => {
		expect(checkTimeBrushProps({ valueKey: 'v', domain: [5, 5] })).toStrictEqual({ ok: false, message: 'domain must be [min, max] with min < max, got [5,5].' });
		expect(checkTimeBrushProps({ valueKey: 'v', domain: [0, Infinity] })).toMatchObject({ ok: false });
		expect(checkTimeBrushProps({ valueKey: 'v', data: 'x' })).toStrictEqual({ ok: false, message: 'data must be a list of rows, got "x".' });
	});
});

describe('helpers', () => {
	it('recordRows keeps the maps in order and drops everything else', () => {
		const a = { t: 1 };
		const b = { t: 2 };
		expect(recordRows([a, null, 3, 'x', [], undefined, true, b])).toStrictEqual([a, b]);
		expect(recordRows([a, b])[0]).toBe(a);
		expect(recordRows(undefined)).toStrictEqual([]);
		expect(recordRows([])).toStrictEqual([]);
	});

	it('isRecord is true for maps only', () => {
		expect([{}, { a: 1 }, Object.create(null)].every(isRecord)).toBe(true);
		expect([null, undefined, [], 'x', 3, () => 1].some(isRecord)).toBe(false);
	});

	it('show prints any value for a message and never throws', () => {
		const circular: Record<string, unknown> = {};
		circular['self'] = circular;
		expect(show('x')).toBe('"x"');
		expect(show(undefined)).toBe('undefined');
		expect(show(undefined, 'nothing')).toBe('nothing');
		expect(show(() => 1, 'a function')).toBe('a function');
		expect(show(circular)).toBe('[object Object]');
		expect(show(10n)).toBe('10');
		expect(show(Object.create(null))).toBe('{}');
		expect(show(Symbol('s'))).toBe('undefined');
	});
});
