import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DateFormatProvider } from '@dsl-ui/dates/DateFormatContext.js';
import { createDateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DEFAULT_DATE_SETTINGS } from '@dsl-ui/dates/dateSettings.js';
import type { DateSettings } from '@dsl-ui/dates/dateSettings.js';

import { CHART_PALETTE } from './chartFormat.js';
import { TimeSeriesChart } from './TimeSeriesChart.js';
import type { TimeSeriesChartProps } from './TimeSeriesChart.js';
import { DAY_MS } from './timeSeriesMath.js';
import { TimeSeriesSyncProvider } from './timeSeriesSync.js';

// jsdom has no layout: the width of the chart box comes from getBoundingClientRect, the real recharts draws into it.
const T0 = Date.UTC(2026, 0, 1);
const day = (i: number): number => T0 + i * DAY_MS;
const utc = (overrides: Partial<DateSettings> = {}) => createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC', ...overrides });

function mockWidth(width: number): void {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width, height: 100, left: 0, top: 0, right: width, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
}
beforeEach(() => mockWidth(600));

/** Every render gets its own sync store (no state shared between tests) and the UTC date settings. */
const tree = (props: TimeSeriesChartProps, formatter = utc()) => (
	<DateFormatProvider formatter={formatter}>
		<TimeSeriesSyncProvider>
			<TimeSeriesChart {...props} />
		</TimeSeriesSyncProvider>
	</DateFormatProvider>
);
const draw = (props: TimeSeriesChartProps, formatter = utc()) => render(tree(props, formatter));

const rows = Array.from({ length: 30 }, (_, i) => ({ t: day(i), a: 100 + i, b: i % 4, dot: i % 2 === 0 ? 'red' : 'blue', note: `note ${i}` }));
const base: TimeSeriesChartProps = { data: rows, series: [{ key: 'a', name: 'Series A', color: 'red' }] };

const q = (container: HTMLElement, selector: string) => Array.from(container.querySelectorAll<SVGElement | HTMLElement>(selector));
const legendOf = (container: HTMLElement) => container.querySelector('[data-chart-legend]');
/** Axis tick labels, one string per tick (recharts splits a label on spaces into tspans). */
const xTicks = (container: HTMLElement) => q(container, '.recharts-xAxis .recharts-cartesian-axis-tick-value').map(t => Array.from(t.querySelectorAll('tspan')).map(s => s.textContent).join(' '));

describe('placeholder, empty and loading states', () => {
	it('data undefined: an announced busy placeholder of the chart height, no plot', () => {
		const { container } = draw({ ...base, data: undefined, height: 120 });
		const placeholder = screen.getByRole('status', { name: 'Loading chart' });
		expect(placeholder).toHaveAttribute('aria-busy', 'true');
		expect(placeholder).toHaveStyle({ height: '120px' });
		expect(placeholder).toHaveClass('animate-pulse', 'motion-reduce:animate-none');
		expect(container.querySelector('[data-chart-plot]')).toBeNull();
	});

	it('no row, or no row with a usable x: the message, at the chart height (default and custom text)', () => {
		const empty = draw({ ...base, data: [], height: 90 });
		expect(screen.getByText('No data in this period')).toHaveStyle({ height: '90px' });
		empty.unmount();
		const noX = draw({ ...base, data: [{ t: 'x', a: 1 }, null, 3], emptyMessage: 'Nothing yet' });
		expect(screen.getByText('Nothing yet')).toBeInTheDocument();
		expect(noX.container.querySelector('[data-chart-plot]')).toBeNull();
	});

	it('an empty custom message is shown as an empty message, not replaced by the default', () => {
		draw({ ...base, data: [], emptyMessage: '' });
		expect(screen.queryByText('No data in this period')).toBeNull();
	});

	it('loading, then rows: the plot is drawn at the measured width (the box did not exist at the first render)', () => {
		const view = draw({ ...base, data: undefined });
		expect(view.container.querySelector('[data-chart-plot]')).toBeNull();
		view.rerender(tree(base));
		const plot = view.container.querySelector<HTMLElement>('[data-chart-plot]');
		expect(plot).not.toBeNull();
		expect(plot).toHaveStyle({ width: '600px', height: '220px' });
		expect(view.container.querySelectorAll('path.recharts-line-curve').length).toBeGreaterThan(0);
	});

	it('rows, then none again: back to the message, no stale plot', () => {
		const view = draw(base);
		view.rerender(tree({ ...base, data: [] }));
		expect(view.container.querySelector('[data-chart-plot]')).toBeNull();
		expect(screen.getByText('No data in this period')).toBeInTheDocument();
	});

	it('a zero-width container or a height of 0 draws no plot (and no error)', () => {
		mockWidth(0);
		expect(draw(base).container.querySelector('[data-chart-plot]')).toBeNull();
		mockWidth(600);
		expect(draw({ ...base, height: 0 }).container.querySelector('[data-chart-plot]')).toBeNull();
		expect(draw({ ...base, height: -5 }).container.querySelector('[data-chart-plot]')).toBeNull();
	});

	it('follows the container width when it changes (the observer reports a new width)', () => {
		const callbacks: Array<(entries: unknown[]) => void> = [];
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: (entries: unknown[]) => void) {
					callbacks.push(callback);
				}
				observe() {}
				unobserve() {}
				disconnect() {}
			},
		);
		const { container } = draw(base);
		expect(container.querySelector('[data-chart-plot]')).toHaveStyle({ width: '600px' });
		React.act(() => callbacks.forEach(callback => callback([{ contentRect: { width: 321.7 } }])));
		expect(container.querySelector('[data-chart-plot]')).toHaveStyle({ width: '321px' });
	});

	it('stops observing when unmounted', () => {
		const disconnect = vi.fn();
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe() {}
				unobserve() {}
				disconnect = disconnect;
			},
		);
		draw(base).unmount();
		expect(disconnect).toHaveBeenCalled();
	});
});

describe('props the component cannot use: an inline alert and ONE development warning', () => {
	it('shows the message that names the fix in a role=alert, and nothing of the chart', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = draw({ ...base, data: 'nope' as unknown as undefined });
		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent('TimeSeriesChart: data must be a list of rows (for example data: $sources.series.rows), got "nope".');
		expect(container.querySelector('[data-chart-plot]')).toBeNull();
	});

	it('logs exactly one warning with the component, the message and the consequence; a re-render does not repeat it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const view = draw({ ...base, height: 'tall' as unknown as number });
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('[TimeSeriesChart] height must be a number, got "tall". Showing an inline alert instead of the chart until the props are fixed.');
		view.rerender(tree({ ...base, height: 'tall' as unknown as number }));
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('a different mistake warns again; fixing the props removes the alert and the chart comes back', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const view = draw({ ...base, height: 'tall' as unknown as number });
		view.rerender(tree({ ...base, yDecimals: 'x' as unknown as number }));
		expect(warn).toHaveBeenCalledTimes(2);
		view.rerender(tree(base));
		expect(screen.queryByRole('alert')).toBeNull();
		expect(view.container.querySelector('[data-chart-plot]')).not.toBeNull();
		expect(warn).toHaveBeenCalledTimes(2);
	});

	it('props without any series, and props that are not even a map, say what is missing', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		draw({ data: [] } as unknown as TimeSeriesChartProps);
		expect(screen.getByRole('alert')).toHaveTextContent('series must list at least one series ({ key, name }).');
	});

	it('a server render shows the alert and logs nothing (the warning comes from an effect)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const html = renderToStaticMarkup(tree({ ...base, data: 7 as unknown as undefined }));
		expect(html).toContain('role="alert"');
		expect(warn).not.toHaveBeenCalled();
	});

	it('in production the alert stays (it is the UI) and the warning is not sent', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		draw({ ...base, data: 7 as unknown as undefined });
		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(warn).not.toHaveBeenCalled();
	});

	it('valid props log nothing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		draw({ ...base, bands: [{ from: 100, to: 105, color: 'orange' }], rangeAreas: [{ highKey: 'a', name: 'Zone', color: 'gray' }], legendItems: [{ label: 'L', color: 'red' }] });
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	});

	it('a text starting with $ is a text here (the registry resolves expressions before the component)', () => {
		draw({ ...base, title: '$sources.nothing', series: [{ key: 'a', name: '$x', color: 'red' }] });
		expect(screen.getByText('$sources.nothing')).toBeInTheDocument();
		expect(screen.getByText('$x')).toBeInTheDocument();
	});
});

describe('plot semantics (role, label, keyboard hint)', () => {
	it('the plot is a focusable image whose label summarises the window, with the keys read after it', () => {
		const { container } = draw({ ...base, title: 'Temperature', yUnit: 'deg' });
		const plot = screen.getByRole('img');
		expect(plot).toHaveAttribute('tabindex', '0');
		expect(plot).toHaveAttribute('aria-label', expect.stringMatching(/^Temperature, .* \(30 days\)\. Series A: latest 129\.0 deg on .*, min 100\.0 deg, max 129\.0 deg, 30 values\.$/));
		const hint = container.querySelector(`#${CSS.escape(plot.getAttribute('aria-describedby')!)}`);
		expect(hint).toHaveTextContent(/arrows move the time window.*plus and minus zoom.*0 shows the whole period/);
		expect(hint).toHaveClass('sr-only');
	});

	it('the title is shown as text when given, and the label says "Chart" otherwise', () => {
		draw({ ...base, title: 'Temperature' });
		expect(screen.getByText('Temperature')).toBeInTheDocument();
	});

	it('the label counts only the series listed in the legend', () => {
		draw({ ...base, series: [{ key: 'a', name: 'Series A', color: 'red' }, { key: 'b', name: 'Hidden', color: 'blue', legend: false }] });
		const label = screen.getByRole('img').getAttribute('aria-label')!;
		expect(label).toContain('Series A');
		expect(label).not.toContain('Hidden');
	});
});

describe('legend', () => {
	it('lists the series with a marker of the right shape (line, area, bar, dot-only) and its colour as a paint attribute', () => {
		const { container } = draw({
			...base,
			series: [
				{ key: 'a', name: 'Line', color: 'red', width: 4 },
				{ key: 'a', name: 'Area', color: 'green', kind: 'area' },
				{ key: 'b', name: 'Bar', color: 'blue', kind: 'bar' },
				{ key: 'a', name: 'Dots', color: 'purple', width: 0, dots: 3 },
			],
		});
		const items = q(legendOf(container) as HTMLElement, ':scope > span');
		expect(items.map(i => i.textContent)).toStrictEqual(['Line', 'Area', 'Bar', 'Dots']);
		const shape = (i: number) => items[i]!.querySelector('svg > :not(title):not(desc)')!;
		expect([shape(0).tagName, shape(0).getAttribute('fill'), shape(0).getAttribute('height')]).toStrictEqual(['rect', 'red', '4']);
		expect(items[1]!.querySelector('line')).toHaveAttribute('stroke', 'green');
		expect(shape(2)).toHaveAttribute('fill-opacity', '0.75');
		expect([shape(3).tagName, shape(3).getAttribute('fill')]).toStrictEqual(['circle', 'purple']);
	});

	it('the marker is hidden from assistive technology', () => {
		const { container } = draw(base);
		expect(container.querySelector('[data-chart-legend] svg')).toHaveAttribute('aria-hidden', 'true');
	});

	it('a series without any value in the data is not listed; legend: false hides one that has values', () => {
		const { container } = draw({
			...base,
			series: [{ key: 'a', name: 'Has values', color: 'red' }, { key: 'nothing', name: 'Switched off', color: 'blue' }, { key: 'a', name: 'Unlisted', color: 'green', legend: false }],
		});
		expect(legendOf(container)).toHaveTextContent('Has values');
		expect(legendOf(container)).not.toHaveTextContent('Switched off');
		expect(legendOf(container)).not.toHaveTextContent('Unlisted');
	});

	it('range areas are listed unless legend: false; free legend items are always listed', () => {
		const { container } = draw({
			...base,
			rangeAreas: [{ lowKey: 'a', name: 'Listed zone', color: 'gray' }, { highKey: 'a', name: 'Unlisted zone', color: 'gray', legend: false }],
			legendItems: [{ label: 'Free item', color: 'orange' }],
		});
		expect(legendOf(container)).toHaveTextContent('Listed zone');
		expect(legendOf(container)).toHaveTextContent('Free item');
		expect(legendOf(container)).not.toHaveTextContent('Unlisted zone');
	});

	it('no entry at all: no legend box', () => {
		const { container } = draw({ ...base, series: [{ key: 'a', name: 'S', color: 'red', legend: false }] });
		expect(legendOf(container)).toBeNull();
	});

	it('explains a dashed segment only when one is drawn', () => {
		const gappy = rows.filter((_, i) => i < 5 || i > 12);
		const dashed = draw({ ...base, data: gappy, gapDashAfterDays: 2 });
		expect(legendOf(dashed.container)).toHaveTextContent('gap > 2 days');
		expect(legendOf(dashed.container)!.querySelector('.border-dashed')).toHaveAttribute('aria-hidden', 'true');
		dashed.unmount();
		const plain = draw({ ...base, data: rows, gapDashAfterDays: 2 });
		expect(legendOf(plain.container)).not.toHaveTextContent('gap >');
		plain.unmount();
		const off = draw({ ...base, data: gappy, series: [{ key: 'a', name: 'S', color: 'red', gapDash: false }], gapDashAfterDays: 2 });
		expect(legendOf(off.container)).not.toHaveTextContent('gap >');
		off.unmount();
		const noLine = draw({ ...base, data: gappy, series: [{ key: 'a', name: 'S', color: 'red', width: 0, dots: 2 }], gapDashAfterDays: 2 });
		expect(legendOf(noLine.container)).not.toHaveTextContent('gap >');
		noLine.unmount();
		const noThreshold = draw({ ...base, data: gappy });
		expect(legendOf(noThreshold.container)).not.toHaveTextContent('gap >');
	});
});

describe('lines, gaps, dots, area', () => {
	const gappy = rows.filter((_, i) => i < 5 || i > 12);

	it('draws a plain line per run and a dashed bridge over a gap longer than the threshold', () => {
		const { container } = draw({ ...base, data: gappy, gapDashAfterDays: 2 });
		expect(q(container, 'path.recharts-line-curve[stroke="red"]:not([stroke-dasharray])')).toHaveLength(1);
		const dashed = q(container, 'path.recharts-line-curve[stroke-dasharray="6 4"]');
		expect(dashed).toHaveLength(1);
		expect(dashed[0]).toHaveAttribute('stroke', 'red');
	});

	it('no dashed bridge without a threshold, without a gap, or when the series opts out', () => {
		for (const props of [{ ...base, data: gappy }, { ...base, data: rows, gapDashAfterDays: 2 }, { ...base, data: gappy, gapDashAfterDays: 2, series: [{ key: 'a', name: 'S', color: 'red', gapDash: false }] }]) {
			const { container, unmount } = draw(props);
			expect(q(container, 'path[stroke-dasharray="6 4"]')).toHaveLength(0);
			unmount();
		}
	});

	it('width 0 draws no line at all; the dots remain', () => {
		const { container } = draw({ ...base, series: [{ key: 'a', name: 'S', color: 'red', width: 0, dots: 3 }] });
		expect(q(container, 'path.recharts-line-curve[stroke="red"]')).toHaveLength(0);
		expect(q(container, 'circle[data-point="a"]')).toHaveLength(30);
	});

	it('dots take the colour of their row field, fall back to the series colour, and skip rows without a value', () => {
		const data = [{ t: day(0), a: 1, dot: 'blue' }, { t: day(1), a: 2, dot: '' }, { t: day(2), a: null, dot: 'green' }, { t: day(3), a: 4 }];
		const { container } = draw({ ...base, data, series: [{ key: 'a', name: 'S', color: 'red', dots: 2, pointColorKey: 'dot' }] });
		const dots = q(container, 'circle[data-point="a"]');
		expect(dots.map(d => d.getAttribute('fill'))).toStrictEqual(['blue', 'red', 'red']);
		expect(dots[0]).toHaveAttribute('r', '2');
		expect(dots[0]).toHaveAttribute('stroke', 'var(--color-surface)');
	});

	it('a series without a colour is painted with the theme palette, by position', () => {
		const { container } = draw({ ...base, series: [{ key: 'a', name: 'First' }, { key: 'b', name: 'Second' }] });
		const strokes = q(container, 'path.recharts-line-curve').map(p => p.getAttribute('stroke'));
		expect(strokes).toStrictEqual([CHART_PALETTE[0], CHART_PALETTE[1]]);
	});

	it('an area series fills under the line; a line series does not', () => {
		const area = draw({ ...base, series: [{ key: 'a', name: 'S', color: 'green', kind: 'area' }] });
		const fill = q(area.container, 'path.recharts-area-area[fill="green"]');
		expect(fill).toHaveLength(1);
		expect(fill[0]).toHaveAttribute('fill-opacity', '0.2');
		area.unmount();
		expect(q(draw(base).container, 'path.recharts-area-area')).toHaveLength(0);
	});

	it('an area is filled under the plain runs only: the dashed bridge stays a line', () => {
		const { container } = draw({ ...base, data: gappy, gapDashAfterDays: 2, series: [{ key: 'a', name: 'S', color: 'green', kind: 'area' }] });
		const fill = q(container, 'path.recharts-area-area[fill="green"]')[0]!;
		// two runs: the fill path has two sub-paths, the dashed link adds none
		expect(fill.getAttribute('d')!.match(/M/g)!.length).toBeGreaterThanOrEqual(2);
		expect(q(container, 'path[stroke-dasharray="6 4"]')).toHaveLength(1);
	});

	it('every drawn series sits on its axis: a series on the right needs a right axis and gets one', () => {
		const left = draw(base);
		expect(q(left.container, '.recharts-yAxis')).toHaveLength(1);
		left.unmount();
		const both = draw({ ...base, marginRight: 60, series: [{ key: 'a', name: 'L', color: 'red' }, { key: 'b', name: 'R', color: 'blue', axis: 'right' }] });
		expect(q(both.container, '.recharts-yAxis')).toHaveLength(2);
		expect(q(both.container, '.recharts-yAxis text[text-anchor="start"]').length).toBeGreaterThan(0);
	});

	it('a chart with all its series on the right keeps the left axis width but no label on it', () => {
		const { container } = draw({ ...base, marginRight: 60, series: [{ key: 'b', name: 'R', color: 'blue', axis: 'right' }] });
		const [left, right] = q(container, '.recharts-yAxis');
		expect(left!.querySelectorAll('text')).toHaveLength(0);
		expect(right!.querySelectorAll('text').length).toBeGreaterThan(0);
		// the plot area (clip rect) starts after the full left axis width
		expect(container.querySelector('clipPath rect')).toHaveAttribute('x', '56');
	});

	it('the plot area ends at the same pixel with or without a right axis (stacked charts align)', () => {
		const without = draw({ ...base, marginRight: 60 });
		const widthWithout = Number(without.container.querySelector('clipPath rect')!.getAttribute('width'));
		without.unmount();
		const withRight = draw({ ...base, marginRight: 60, series: [{ key: 'a', name: 'L', color: 'red' }, { key: 'b', name: 'R', color: 'blue', axis: 'right' }] });
		expect(Number(withRight.container.querySelector('clipPath rect')!.getAttribute('width'))).toBe(widthWithout);
		expect(widthWithout).toBe(600 - 56 - 60);
	});

	it('yAxisWidth and marginRight set the plot area', () => {
		const { container } = draw({ ...base, yAxisWidth: 80, marginRight: 30 });
		expect(container.querySelector('clipPath rect')).toHaveAttribute('x', '80');
		expect(container.querySelector('clipPath rect')).toHaveAttribute('width', String(600 - 80 - 30));
	});
});

describe('bars', () => {
	const barProps: TimeSeriesChartProps = { ...base, series: [{ key: 'b', name: 'Events', color: 'blue', kind: 'bar' }] };

	it('draws one bar per row with a value, in the colour of the series, inside the chart svg', () => {
		const data = [{ t: day(0), b: 2 }, { t: day(1), b: null }, { t: day(2), b: 3 }, { t: day(3) }, { t: day(4), b: 'x' }];
		const { container } = draw({ ...barProps, data });
		const bars = q(container, 'rect[data-bar="b"]');
		expect(bars).toHaveLength(2);
		expect(bars[0]).toHaveAttribute('fill', 'blue');
		expect(bars[0]!.closest('svg')).toHaveClass('recharts-surface');
	});

	it('a bar is drawn BEFORE the lines and dots of the chart, so those stay on top', () => {
		const { container } = draw({ ...barProps, series: [...barProps.series, { key: 'a', name: 'Line', color: 'red', dots: 2 }], marginRight: 16 });
		const bar = container.querySelector('rect[data-bar]')!;
		const line = container.querySelector('path.recharts-line-curve[stroke="red"]')!;
		const dot = container.querySelector('circle[data-point]')!;
		expect(bar.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(bar.compareDocumentPosition(dot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('a plain bar grows from the zero line, and the axis then reaches zero', () => {
		const data = [{ t: day(0), b: 40 }, { t: day(1), b: 50 }];
		const { container } = draw({ ...barProps, data });
		const bar = container.querySelector('rect[data-bar]')!;
		const plotHeight = 220 - 8 - 24;
		// the bar ends on the bottom of the plot: zero is the bottom of the axis
		expect(Number(bar.getAttribute('y')) + Number(bar.getAttribute('height'))).toBeCloseTo(plotHeight, 5);
	});

	it('a floating bar spans from fromKey to key and does not force zero into the axis', () => {
		const data = [{ t: day(0), start: 20, end: 30 }, { t: day(1), start: 22, end: 28 }];
		const { container } = draw({ ...base, data, series: [{ key: 'end', fromKey: 'start', name: 'Span', color: 'blue', kind: 'bar' }] });
		const [first, second] = q(container, 'rect[data-bar]');
		expect(Number(first!.getAttribute('height'))).toBeGreaterThan(Number(second!.getAttribute('height')));
		// not anchored at the bottom: zero is far below 20..30
		expect(Number(first!.getAttribute('y')) + Number(first!.getAttribute('height'))).toBeLessThan(220 - 8 - 24);
	});

	it('a floating bar with a missing end draws nothing for that row', () => {
		const data = [{ t: day(0), start: 20, end: 30 }, { t: day(1), start: 22 }, { t: day(2), end: 25 }];
		const { container } = draw({ ...base, data, series: [{ key: 'end', fromKey: 'start', name: 'Span', color: 'blue', kind: 'bar' }] });
		expect(q(container, 'rect[data-bar]')).toHaveLength(1);
	});

	it('bars are clipped to the plot area and are not drawn for rows outside the window', () => {
		const { container } = draw({ ...barProps, domain: [day(0), day(5)] });
		const group = container.querySelector('g[data-bars] > g')!;
		expect(group.getAttribute('clip-path')).toMatch(/^url\(#bars-/);
		expect(q(container, 'rect[data-bar]').length).toBeLessThan(10);
	});

	it('a bar on the right axis uses the right scale', () => {
		const data = [{ t: day(0), a: 1, b: 1000 }, { t: day(1), a: 2, b: 2000 }];
		const { container } = draw({ ...base, data, marginRight: 60, series: [{ key: 'a', name: 'L', color: 'red' }, { key: 'b', name: 'R', color: 'blue', kind: 'bar', axis: 'right' }] });
		const bars = q(container, 'rect[data-bar]');
		expect(bars).toHaveLength(2);
		// the 2000 bar nearly fills the plot although the left axis only goes to about 2
		expect(Number(bars[1]!.getAttribute('height'))).toBeGreaterThan(100);
	});

	it('the legend marker of a bar is a translucent rectangle', () => {
		const { container } = draw(barProps);
		expect(legendOf(container)!.querySelector('rect')).toHaveAttribute('fill-opacity', '0.75');
	});
});

describe('bands and range areas', () => {
	it('fixed bands are drawn at their value range in their colour and opacity', () => {
		const { container } = draw({ ...base, bands: [{ from: 105, to: 110, color: 'orange' }, { from: 120, to: 125, color: 'green', opacity: 0.4 }] });
		const bands = q(container, '.recharts-reference-area-rect');
		expect(bands.map(b => [b.getAttribute('fill'), b.getAttribute('fill-opacity')])).toStrictEqual([['orange', '0.12'], ['green', '0.4']]);
	});

	it('a range area draws a stepped fill between two row fields', () => {
		const data = rows.map(r => ({ ...r, lo: r.a - 5, hi: r.a + 5 }));
		const { container } = draw({ ...base, data, rangeAreas: [{ lowKey: 'lo', highKey: 'hi', name: 'Zone', color: 'gray', opacity: 0.3 }] });
		const fill = q(container, 'path.recharts-area-area[fill="gray"]');
		expect(fill).toHaveLength(1);
		expect(fill[0]).toHaveAttribute('fill-opacity', '0.3');
	});

	it('an open ended range area (missing lowKey or highKey) renders without an alert and reaches the edge of the axis', () => {
		const data = rows.map(r => ({ ...r, edge: 110 }));
		const { container } = draw({ ...base, data, rangeAreas: [{ highKey: 'edge', name: 'Below', color: 'red' }, { lowKey: 'edge', name: 'Above', color: 'green', legend: false }] });
		expect(screen.queryByRole('alert')).toBeNull();
		expect(q(container, 'path.recharts-area-area[fill="red"]')).toHaveLength(1);
		expect(q(container, 'path.recharts-area-area[fill="green"]')).toHaveLength(1);
		expect(legendOf(container)).toHaveTextContent('Below');
		expect(legendOf(container)).not.toHaveTextContent('Above');
	});

	it('only the keys an area gives size the axis: the open edge does not, a given key far from the data does', () => {
		const line = (c: HTMLElement) => q(c, 'path.recharts-line-curve[stroke="red"]')[0]!.getAttribute('d');
		const withEdge = (edge: number) => draw({ ...base, data: rows.map(r => ({ ...r, edge })), rangeAreas: [{ highKey: 'edge', name: 'Below', color: 'gray' }] });
		const plain = draw(base);
		const inRange = withEdge(110);
		// the area reaches the bottom of the axis (no lowKey) and its top is inside the data: the scale is the one of the series alone
		expect(line(inRange.container)).toBe(line(plain.container));
		const far = withEdge(5000);
		expect(line(far.container)).not.toBe(line(plain.container));
	});

	it('a row whose given key has no number draws no area for that row, and nothing throws', () => {
		const data = rows.map((r, i) => ({ ...r, hi: i % 3 === 0 ? null : r.a + 5 }));
		expect(() => draw({ ...base, data, rangeAreas: [{ highKey: 'hi', name: 'Zone', color: 'gray' }] })).not.toThrow();
	});
});

describe('xFormat (date settings: language, clock, time zone)', () => {
	const hourly = Array.from({ length: 6 }, (_, i) => ({ t: Date.UTC(2026, 0, 5, 12 + i), a: i }));
	const twoDays = { ...base, data: hourly, domain: [Date.UTC(2026, 0, 5, 11), Date.UTC(2026, 0, 6, 12)] };

	it('date (default): "5 Jan" style ticks', () => {
		const { container } = draw(base);
		const ticks = xTicks(container);
		expect(ticks.length).toBeGreaterThan(2);
		expect(ticks.every(t => /^\d{1,2} [A-Z][a-z]{2}$/.test(t))).toBe(true);
	});

	it('datetime: every tick has the date and the time', () => {
		const ticks = xTicks(draw({ ...twoDays, xFormat: 'datetime' }).container);
		expect(ticks.length).toBeGreaterThan(1);
		expect(ticks.every(t => /^\d{1,2} [A-Z][a-z]{2}, \d{2}:\d{2}$/.test(t))).toBe(true);
	});

	it('time: the clock only, but the first tick and the first tick of a new day carry the date', () => {
		const ticks = xTicks(draw({ ...twoDays, xFormat: 'time' }).container);
		expect(ticks[0]).toMatch(/^\d{1,2} [A-Z][a-z]{2}, \d{2}:\d{2}$/);
		const withDate = ticks.filter(t => t.includes(','));
		const clockOnly = ticks.filter(t => !t.includes(','));
		expect(clockOnly.length).toBeGreaterThan(0);
		expect(clockOnly.every(t => /^\d{2}:\d{2}$/.test(t))).toBe(true);
		// the window spans two calendar days: the day changed exactly once, so exactly two ticks carry the date
		expect(withDate).toHaveLength(2);
	});

	it('the clock follows the date settings: 12h for en-US, 24h forced by the settings', () => {
		const us = xTicks(draw({ ...twoDays, xFormat: 'time' }, utc({ locale: 'en-US' })).container);
		expect(us.some(t => /(AM|PM)/i.test(t))).toBe(true);
		const forced24 = xTicks(draw({ ...twoDays, xFormat: 'time' }, utc({ locale: 'en-US', hourCycle: '24h' })).container);
		expect(forced24.some(t => /(AM|PM)/i.test(t))).toBe(false);
	});

	it('the language follows the settings', () => {
		const ticks = xTicks(draw(base, utc({ locale: 'fr-FR' })).container);
		expect(ticks.some(t => /janv\./.test(t))).toBe(true);
	});

	it('the time zone follows the settings: the same data on the next day in Auckland', () => {
		const data = [{ t: Date.UTC(2026, 0, 5, 20), a: 1 }, { t: Date.UTC(2026, 0, 6, 20), a: 2 }];
		const inUtc = xTicks(draw({ ...base, data, domain: [Date.UTC(2026, 0, 5, 10), Date.UTC(2026, 0, 7, 10)], xFormat: 'datetime' }).container);
		const inAuckland = xTicks(draw({ ...base, data, domain: [Date.UTC(2026, 0, 5, 10), Date.UTC(2026, 0, 7, 10)], xFormat: 'datetime' }, utc({ timeZone: 'Pacific/Auckland' })).container);
		expect(inUtc).not.toStrictEqual(inAuckland);
	});

	it('a sub-day data set needs no day-sized tick steps: more than one tick over a few hours', () => {
		const ticks = xTicks(draw({ ...twoDays, domain: [Date.UTC(2026, 0, 5, 11), Date.UTC(2026, 0, 5, 18)], xFormat: 'time' }).container);
		expect(ticks.length).toBeGreaterThan(2);
	});

	it('the tick budget leaves room for the longest label: fewer ticks for datetime than for date on the same width', () => {
		const date = xTicks(draw({ ...base, data: rows }).container).length;
		const dateTime = xTicks(draw({ ...base, data: rows, xFormat: 'datetime' }).container).length;
		expect(dateTime).toBeLessThan(date);
	});
});

describe('colours and theme', () => {
	it('no element of the component carries an inline colour: only geometry in style attributes', () => {
		const { container } = draw({ ...base, title: 'T', bands: [{ from: 100, to: 110, color: 'orange' }], legendItems: [{ label: 'L', color: 'red' }], gapDashAfterDays: 2, series: [{ key: 'a', name: 'S', color: 'red', dots: 2 }, { key: 'b', name: 'B', color: 'blue', kind: 'bar' }] });
		// recharts writes its own wrapper style (position / cursor / size); everything else is ours
		const ours = q(container, '[style]').filter(el => !el.closest('.recharts-wrapper') || el.matches('[data-chart-overlay]'));
		expect(ours.length).toBeGreaterThan(0);
		for (const el of ours) {
			expect(el.getAttribute('style')).not.toMatch(/color|background|border|shadow|opacity|fill|stroke/i);
		}
	});

	it('the theme tokens are used as var(--color-*) strings for the frame of the plot', () => {
		const { container } = draw(base);
		expect(q(container, '.recharts-cartesian-grid line').every(l => l.getAttribute('stroke') === 'var(--color-border)')).toBe(true);
		expect(container.querySelector('.recharts-cartesian-axis-tick-value')).toHaveAttribute('fill', 'var(--color-muted)');
	});

	it('the frame uses token classes only (no dark: variant, no raw palette class)', () => {
		const html = draw({ ...base, title: 'T' }).container.innerHTML;
		expect(html).not.toMatch(/dark:/);
		expect(html).not.toMatch(/\b(?:bg|text|border)-(?:gray|slate|zinc|white|black|red|blue|green)-?\d*\b/);
		const frame = draw(base).container.firstElementChild!;
		expect(frame).toHaveClass('rounded-lg', 'border', 'border-border', 'bg-surface');
	});
});

describe('the sync group attribute and the series list identity', () => {
	it('exposes the group on the frame', () => {
		const { container } = draw({ ...base, syncGroup: 'page-1' });
		expect(container.querySelector('[data-chart-group="page-1"]')).not.toBeNull();
		expect(within(container).getByRole('img')).toBeInTheDocument();
	});
});
