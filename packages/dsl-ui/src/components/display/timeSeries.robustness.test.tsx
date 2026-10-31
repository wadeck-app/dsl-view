// Odd-input sweep for TimeSeriesChart and TimeBrush, in the manner of src/registry.robustness.test.tsx (which feeds every declared
// prop of every registry component the values below and fails on any exception that escapes). Here the two components are
// rendered directly, because the real sweep goes through the generated registry; they still have to pass that one once their
// entries exist. What is asserted for every case:
//   - nothing escapes: an error boundary catches whatever a render throws, and the case fails with the message;
//   - the props check is the oracle: props it refuses show ONE inline alert (its message) and ONE development warning,
//     props it accepts show no alert, log nothing (warn and error), and survive pointer, wheel, keyboard and button use.
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetReportedMessages } from '@dsl-ui/components/dev/reportOnce.js';
import { DateFormatProvider } from '@dsl-ui/dates/DateFormatContext.js';
import { createDateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DEFAULT_DATE_SETTINGS } from '@dsl-ui/dates/dateSettings.js';

import { TimeBrush } from './TimeBrush.js';
import type { TimeBrushProps } from './TimeBrush.js';
import { TimeSeriesChart } from './TimeSeriesChart.js';
import type { TimeSeriesChartProps } from './TimeSeriesChart.js';
import { DAY_MS } from './timeSeriesMath.js';
import { checkTimeBrushProps, checkTimeSeriesChartProps } from './timeSeriesProps.js';
import { TimeSeriesSyncProvider } from './timeSeriesSync.js';

const circular: Record<string, unknown> = {};
circular['self'] = circular;
// What a page author, a half-loaded `$sources` value or a broken backend can hand to a prop (the registry sweep's list, plus a
// negative number, NaN, a function and a circular map).
const ODD: ReadonlyArray<readonly [string, unknown]> = [
	['undefined', undefined],
	['null', null],
	['empty string', ''],
	['zero', 0],
	['negative', -1],
	['NaN', Number.NaN],
	['number', 42],
	['false', false],
	['true', true],
	['empty object', {}],
	['empty array', []],
	['array of empty objects', [{}]],
	['text', 'text'],
	['function', () => 1],
	['circular map', circular],
];

// ---- environment: no layout in jsdom, so the box is 600 px wide (0 for the zero-width cases) and pointer capture is a no-op ----
let width = 600;
const proto = HTMLElement.prototype as { setPointerCapture?: unknown };
beforeEach(() => {
	width = 600;
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width, height: 100, left: 0, top: 0, right: width, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
	proto.setPointerCapture = () => undefined;
});
afterEach(() => {
	delete proto.setPointerCapture;
});

class Catcher extends React.Component<{ children: React.ReactNode; onError: (error: unknown) => void }, { failed: boolean }> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(error: unknown) {
		this.props.onError(error);
	}
	render() {
		return this.state.failed ? null : this.props.children;
	}
}

const utc = createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC' });
const pointer = (el: Element | null, type: string, clientX: number) => {
	if (el) {
		fireEvent(el, new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY: 40 }));
	}
};

/** Pokes every interaction path of what is mounted. */
function interact(container: HTMLElement): void {
	const overlay = container.querySelector('[data-chart-overlay]');
	const strip = container.querySelector('[data-brush-strip]');
	for (const x of [0, 300, 599, 99999, -50]) {
		pointer(overlay, 'pointermove', x);
		pointer(overlay, 'pointerdown', x);
		pointer(overlay, 'pointermove', x + 20);
		pointer(overlay, 'pointerup', x);
		pointer(strip, 'pointerdown', x);
		pointer(strip, 'pointermove', x + 20);
		pointer(strip, 'pointerup', x);
	}
	if (overlay) {
		act(() => {
			overlay.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaY: 100, clientX: 200 }));
			overlay.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 100, deltaY: 1, clientX: 200 }));
		});
		fireEvent.doubleClick(overlay);
		fireEvent.pointerLeave(overlay);
	}
	for (const key of ['+', '-', 'ArrowLeft', 'ArrowRight', '0']) {
		const plot = container.querySelector('[data-chart-plot]');
		if (plot) {
			fireEvent.keyDown(plot, { key });
		}
	}
	for (const handle of Array.from(container.querySelectorAll('[data-brush-handle], [data-brush-window]'))) {
		pointer(handle, 'pointerdown', 300);
		pointer(strip, 'pointermove', 340);
		pointer(strip, 'pointerup', 340);
	}
	for (const button of Array.from(container.querySelectorAll('button'))) {
		fireEvent.click(button);
	}
}

// ---- base props: a valid node using every feature ----
const rows = Array.from({ length: 12 }, (_, i) => ({ t: i * DAY_MS, v: 60 + i, w: i % 3 === 0 ? null : i, lo: i - 1, hi: i + 2, c: 'red', d: 'detail' }));
const lineSeries = { key: 'v', name: 'V', color: 'red', width: 2, dots: 2, pointColorKey: 'c', detailKey: 'd', gapDash: true, legend: true, kind: 'line', decimals: 1, showValue: true, axis: 'left' };
const barSeries = { key: 'w', name: 'W', color: 'blue', width: 2, dots: 0, fromKey: 'lo', gapDash: true, legend: true, kind: 'bar', showValue: true, axis: 'left' };
const rightSeries = { key: 'hi', name: 'H', color: 'green', width: 2, dots: 0, gapDash: true, legend: true, kind: 'area', showValue: true, axis: 'right' };
const band = { from: 62, to: 66, color: 'orange', opacity: 0.12, label: 'target' };
const range = { lowKey: 'lo', highKey: 'hi', name: 'R', color: 'gray', opacity: 0.15, legend: true };
const legendItem = { label: 'L', color: 'red' };
const chartProps: Record<string, unknown> = {
	data: rows,
	xKey: 't',
	domain: undefined,
	series: [lineSeries, barSeries, rightSeries],
	bands: [band],
	rangeAreas: [range],
	legendItems: [legendItem],
	gapDashAfterDays: 2,
	syncGroup: 'sweep',
	title: 'T',
	height: 220,
	yUnit: 'u',
	yFormat: 'number',
	yDecimals: 1,
	yIncludeZero: false,
	yAxisWidth: 56,
	marginRight: 60,
	emptyMessage: 'No data in this period',
	xFormat: 'date',
	yRightFormat: 'number',
	yRightUnit: 'r',
	yRightDecimals: 1,
	yRightIncludeZero: false,
	yRightAxisWidth: 56,
};
const brushProps: Record<string, unknown> = { data: rows, xKey: 't', valueKey: 'v', kind: 'line', domain: undefined, syncGroup: 'sweep', height: 56, yAxisWidth: 56, marginRight: 16 };

interface Target {
	name: 'TimeSeriesChart' | 'TimeBrush';
	/** Renders the component with props of any shape (that is the point of the sweep). */
	render: (props: unknown) => React.ReactElement;
	oracle: (props: unknown) => string | null;
}
const CHART: Target = { name: 'TimeSeriesChart', render: props => <TimeSeriesChart {...(props as TimeSeriesChartProps)} />, oracle: props => (checkTimeSeriesChartProps(props).ok ? null : (checkTimeSeriesChartProps(props) as { message: string }).message) };
const BRUSH: Target = { name: 'TimeBrush', render: props => <TimeBrush {...(props as TimeBrushProps)} />, oracle: props => (checkTimeBrushProps(props).ok ? null : (checkTimeBrushProps(props) as { message: string }).message) };

/** Mounts, re-renders with an equal-valued new object, then checks the alert / warning against the oracle; valid props are also driven. */
function check(target: Target, props: unknown, label: string): void {
	resetReportedMessages();
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const error = vi.spyOn(console, 'error').mockImplementation(() => {});
	let escaped: unknown;
	const element = (value: unknown) => (
		<DateFormatProvider formatter={utc}>
			<TimeSeriesSyncProvider>
				<Catcher onError={e => (escaped ??= e)}>
					{target.render(value)}
				</Catcher>
			</TimeSeriesSyncProvider>
		</DateFormatProvider>
	);
	const view = render(element(props));
	view.rerender(element(props !== null && typeof props === 'object' && !Array.isArray(props) ? { ...props } : props));
	const expected = target.oracle(props);
	const alerts = view.container.querySelectorAll('[role="alert"]');
	const ours = warn.mock.calls.map(call => String(call[0])).filter(text => text.startsWith(`[${target.name}] `));
	try {
		expect(escaped === undefined ? '' : `escaped: ${escaped instanceof Error ? escaped.message : String(escaped)}`, `${label}: nothing may escape`).toBe('');
		if (expected === null) {
			expect(alerts.length, `${label}: no alert expected`).toBe(0);
			expect(ours, `${label}: no warning expected`).toStrictEqual([]);
			interact(view.container);
			expect(escaped === undefined ? '' : `escaped: ${escaped instanceof Error ? escaped.message : String(escaped)}`, `${label}: nothing may escape while interacting`).toBe('');
			expect(view.container.querySelectorAll('[role="alert"]').length, `${label}: no alert after interaction`).toBe(0);
			// React reports invalid DOM values (NaN styles, unknown props) through console.error: a valid case must not produce any.
			expect(error.mock.calls.map(call => String(call[0]).slice(0, 160)), `${label}: no console.error expected`).toStrictEqual([]);
		} else {
			expect(alerts.length, `${label}: one alert expected`).toBe(1);
			expect(alerts[0]!.textContent, label).toBe(`${target.name}: ${expected}`);
			expect(ours, `${label}: exactly one warning`).toHaveLength(1);
			expect(ours[0], label).toContain(expected);
		}
	} finally {
		view.unmount();
		warn.mockRestore();
		error.mockRestore();
	}
}

describe('valid base props', () => {
	it('chart: no alert, no warning, the plot is drawn at a real width', () => {
		check(CHART, chartProps, 'valid chart');
	});
	it('brush: no alert, no warning, the strip is drawn', () => {
		check(BRUSH, brushProps, 'valid brush');
	});
});

describe('TimeSeriesChart: every prop x every odd value', () => {
	it('props that are not even a map', () => {
		for (const [name, value] of [['undefined', undefined], ['null', null], ['empty object', {}], ['empty array', []], ['circular', circular]] as const) {
			check(CHART, value, `props = ${name}`);
		}
	});
	for (const key of Object.keys(chartProps)) {
		it.each(ODD)(`${key} = %s`, (_label, odd) => {
			check(CHART, { ...chartProps, [key]: odd }, key);
		});
	}
	for (const list of ['series', 'bands', 'rangeAreas', 'legendItems'] as const) {
		it.each(ODD)(`${list} = [%s]`, (_label, odd) => {
			check(CHART, { ...chartProps, [list]: [odd] }, `${list}[odd]`);
		});
		const sample = { series: lineSeries, bands: band, rangeAreas: range, legendItems: legendItem }[list];
		for (const key of Object.keys(sample)) {
			it.each(ODD)(`${list}[0].${key} = %s`, (_label, odd) => {
				const items = [{ ...sample, [key]: odd }, ...(list === 'series' ? [barSeries, rightSeries] : [])];
				check(CHART, { ...chartProps, [list]: items }, `${list}[0].${key}`);
			});
		}
	}
	for (const [name, series] of [['bar', barSeries], ['right axis', rightSeries]] as const) {
		for (const key of Object.keys(series)) {
			it.each(ODD)(`series ${name} .${key} = %s`, (_label, odd) => {
				const others = [lineSeries, barSeries, rightSeries].filter(s => s !== series);
				check(CHART, { ...chartProps, series: [...others, { ...series, [key]: odd }] }, `series(${name}).${key}`);
			});
		}
	}
	it('known wrong shapes', () => {
		check(CHART, { ...chartProps, domain: [5, 1] }, 'reversed domain');
		check(CHART, { ...chartProps, domain: [Number.NaN, 1] }, 'NaN domain');
		check(CHART, { ...chartProps, data: 'nope' }, 'data string');
		check(CHART, { ...chartProps, series: [{ ...lineSeries, kind: 'step' }] }, 'kind');
		check(CHART, { ...chartProps, series: [lineSeries], yRightUnit: 'u' }, 'right prop without right series');
		check(CHART, { ...chartProps, marginRight: 10 }, 'margin below the right axis');
		check(CHART, { ...chartProps, title: Symbol('s') }, 'symbol title');
		check(CHART, { ...chartProps, height: Symbol('s') }, 'symbol height');
		check(CHART, { ...chartProps, height: 1n }, 'bigint height');
		check(CHART, { ...chartProps, height: Object.create(null) }, 'null-prototype height');
	});
});

describe('TimeBrush: every prop x every odd value', () => {
	it('props that are not even a map', () => {
		for (const [name, value] of [['undefined', undefined], ['null', null], ['empty object', {}], ['empty array', []], ['circular', circular]] as const) {
			check(BRUSH, value, `props = ${name}`);
		}
	});
	for (const key of Object.keys(brushProps)) {
		it.each(ODD)(`${key} = %s`, (_label, odd) => {
			check(BRUSH, { ...brushProps, [key]: odd }, key);
		});
	}
	it('known wrong shapes', () => {
		check(BRUSH, { ...brushProps, domain: [5, 5] }, 'empty domain');
		check(BRUSH, { ...brushProps, domain: [1, 0] }, 'reversed domain');
		check(BRUSH, { ...brushProps, domain: [0, Infinity] }, 'infinite domain');
		check(BRUSH, { ...brushProps, domain: [0, 'x'] }, 'text in domain');
		check(BRUSH, { ...brushProps, valueKey: '' }, 'empty valueKey');
		check(BRUSH, { ...brushProps, kind: 'dots' }, 'kind');
	});
});

// ---- odd but valid data ----
const T0 = Date.UTC(2026, 0, 1);
const dayAt = (i: number): number => T0 + i * DAY_MS;
const ODD_VALUES = [null, Number.NaN, Infinity, -Infinity, '5', '', {}, [], true, undefined, 1e308, -1e308, 1e-320, 0];
const DATASETS: Record<string, unknown[]> = {
	'no row': [],
	'entries that are not rows': [null, 1, 'x', [], undefined, true, { t: dayAt(0), v: 1 }],
	'a single row': [{ t: dayAt(3), v: 70, w: 1, lo: 0, hi: 2, c: 'red', d: 'x' }],
	'a single row without value': [{ t: dayAt(3) }],
	'all-null series': Array.from({ length: 5 }, (_, i) => ({ t: dayAt(i), v: null, w: null, lo: null, hi: null })),
	'unsorted x': [4, 1, 9, 0, 3].map(i => ({ t: dayAt(i), v: i, w: i, lo: 0, hi: i + 1 })),
	'duplicate x': [0, 0, 1, 1, 1, 2].map((i, k) => ({ t: dayAt(i), v: k, w: k, lo: 0, hi: k + 1 })),
	'same value everywhere': Array.from({ length: 6 }, (_, i) => ({ t: dayAt(i), v: 5, w: 5, lo: 5, hi: 5 })),
	'x that is not a time': [{ t: 'x', v: 1 }, { t: null, v: 2 }, { t: Number.NaN, v: 3 }, { t: Infinity, v: 4 }, { v: 5 }, { t: dayAt(1), v: 6 }],
	'x outside the date range': [{ t: 1e300, v: 1, w: 1 }, { t: -1e300, v: 2, w: 2 }, { t: 8.64e15 + 1, v: 3, w: 3 }, { t: dayAt(0), v: 4, w: 4 }],
	'only huge x': [{ t: 1e300, v: 1, w: 1, lo: 0, hi: 1 }],
	'huge values': [0, 1, 2].map(i => ({ t: dayAt(i), v: [1e308, -1e308, 1e-320][i], w: 1e308, lo: -1e308, hi: 1e308 })),
};
for (const field of ['v', 'w', 'lo', 'hi', 'c', 'd']) {
	DATASETS[`odd values in ${field}`] = ODD_VALUES.map((value, i) => ({ t: dayAt(i), v: 60 + i, w: i, lo: 0, hi: 5, c: 'red', d: 'x', [field]: value }));
}

describe('TimeSeriesChart: odd data', () => {
	for (const [name, data] of Object.entries(DATASETS)) {
		for (const w of [600, 0]) {
			for (const xFormat of ['date', 'datetime']) {
				it(`${name}, width ${w}, xFormat ${xFormat}`, () => {
					width = w;
					check(CHART, { ...chartProps, data, xFormat }, name);
				});
			}
		}
	}
	it('rows without a usable x show the message', () => {
		check(CHART, { ...chartProps, data: [{ t: 'x', v: 1 }] }, 'unusable x');
		expect(document.body.textContent).not.toContain('NaN');
	});
	it('a zero-width container draws nothing and a height of 0 or less draws no plot', () => {
		width = 0;
		check(CHART, chartProps, 'zero width');
		width = 600;
		check(CHART, { ...chartProps, height: 0 }, 'height 0');
		check(CHART, { ...chartProps, height: -50 }, 'height -50');
	});
	it('series, bands and range areas naming a missing key', () => {
		const missing = [
			{ key: 'nope', name: 'N', color: 'red', width: 2, dots: 3, pointColorKey: 'nope', detailKey: 'nope' },
			{ key: 'nope', name: 'B', color: 'blue', width: 2, dots: 0, kind: 'bar', fromKey: 'nope' },
			{ key: 'nope', name: 'R', color: 'blue', width: 2, dots: 0, axis: 'right', kind: 'area' },
		];
		check(CHART, { ...chartProps, series: missing, rangeAreas: [{ ...range, lowKey: 'nope', highKey: 'nope' }] }, 'missing keys');
		check(CHART, { ...chartProps, xKey: 'nope' }, 'missing xKey');
	});
	it('the same key twice (legend, series and range names repeated)', () => {
		check(CHART, { ...chartProps, series: [lineSeries, lineSeries, barSeries, barSeries], rangeAreas: [range, range], legendItems: [legendItem, legendItem] }, 'duplicates');
	});
	it('a window larger or smaller than the data, and a domain without data in it', () => {
		for (const domain of [[dayAt(-1000), dayAt(1000)], [dayAt(5), dayAt(5) + 1], [dayAt(100), dayAt(200)], [dayAt(-200), dayAt(-100)], [0, 1e300], [-1e300, 1e300]]) {
			check(CHART, { ...chartProps, domain }, `domain ${domain.join(',')}`);
		}
	});
	it('time and datetime formats on sub-day data', () => {
		const data = Array.from({ length: 8 }, (_, i) => ({ t: T0 + i * 3_600_000, v: i, w: i, lo: 0, hi: i }));
		for (const xFormat of ['time', 'datetime']) {
			check(CHART, { ...chartProps, data, xFormat }, xFormat);
		}
	});
	it('tooltip decimals outside what toFixed accepts, clock format on odd hours', () => {
		for (const decimals of [-1, 101, 1.5, 1e9]) {
			check(CHART, { ...chartProps, yDecimals: decimals, yRightDecimals: decimals, series: [{ ...lineSeries, decimals }, barSeries, rightSeries] }, `decimals ${decimals}`);
		}
		const data = [{ t: dayAt(0), v: -5, w: 99, lo: 0, hi: 1e9 }, { t: dayAt(1), v: 30.5, w: 1, lo: 0, hi: 2 }];
		check(CHART, { ...chartProps, data, yFormat: 'clock', yRightFormat: 'clock' }, 'clock');
	});
	it('a very long list does not blow the call stack', () => {
		width = 0;
		const data = Array.from({ length: 300_000 }, (_, i) => ({ t: dayAt(i % 400), v: i }));
		check(CHART, { ...chartProps, data }, 'long list');
	}, 60_000);
	it('data arriving after the first render (loading, then rows, then none)', () => {
		const view = render(
			<DateFormatProvider formatter={utc}>
				<TimeSeriesSyncProvider>
					<TimeSeriesChart {...(chartProps as unknown as TimeSeriesChartProps)} data={undefined} />
				</TimeSeriesSyncProvider>
			</DateFormatProvider>,
		);
		expect(view.container.querySelector('[aria-busy="true"]')).not.toBeNull();
		view.rerender(
			<DateFormatProvider formatter={utc}>
				<TimeSeriesSyncProvider>
					<TimeSeriesChart {...(chartProps as unknown as TimeSeriesChartProps)} />
				</TimeSeriesSyncProvider>
			</DateFormatProvider>,
		);
		interact(view.container);
		view.rerender(
			<DateFormatProvider formatter={utc}>
				<TimeSeriesSyncProvider>
					<TimeSeriesChart {...(chartProps as unknown as TimeSeriesChartProps)} data={[]} />
				</TimeSeriesSyncProvider>
			</DateFormatProvider>,
		);
		expect(view.container.textContent).toContain('No data in this period');
		expect(view.container.querySelector('[role="alert"]')).toBeNull();
	});
});

describe('TimeBrush: odd data', () => {
	for (const [name, data] of Object.entries(DATASETS)) {
		for (const kind of ['line', 'bars']) {
			for (const w of [600, 0]) {
				it(`${name}, kind ${kind}, width ${w}`, () => {
					width = w;
					check(BRUSH, { ...brushProps, data, kind }, name);
				});
			}
		}
	}
	it('a domain smaller or larger than the data', () => {
		for (const domain of [[dayAt(-1000), dayAt(1000)], [dayAt(5), dayAt(5) + 1], [dayAt(100), dayAt(200)], [0, 1e300], [-1e300, 1e300]]) {
			check(BRUSH, { ...brushProps, domain }, `domain ${domain.join(',')}`);
		}
	});
	it('a very long list does not blow the call stack', () => {
		const data = Array.from({ length: 300_000 }, (_, i) => ({ t: dayAt(i % 400), v: i }));
		check(BRUSH, { ...brushProps, data }, 'long list');
	}, 60_000);
	it('valueKey naming a missing field draws an empty strip', () => {
		check(BRUSH, { ...brushProps, valueKey: 'nope' }, 'missing valueKey');
	});
});
