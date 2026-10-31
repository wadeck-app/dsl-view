import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DateFormatProvider } from '@dsl-ui/dates/DateFormatContext.js';
import { createDateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DEFAULT_DATE_SETTINGS } from '@dsl-ui/dates/dateSettings.js';

import { TimeBrush } from './TimeBrush.js';
import { TimeSeriesChart } from './TimeSeriesChart.js';
import type { TimeSeriesChartProps } from './TimeSeriesChart.js';
import { DAY_MS } from './timeSeriesMath.js';
import { TimeSeriesSyncProvider } from './timeSeriesSync.js';

const T0 = Date.UTC(2026, 0, 1);
const day = (i: number): number => T0 + i * DAY_MS;
const utc = createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC' });

// jsdom has no layout and no pointer capture: the box is 600 px wide at the origin, capture is a no-op, both restored after each test.
const proto = HTMLElement.prototype as { setPointerCapture?: unknown };
beforeEach(() => {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 600, height: 100, left: 0, top: 0, right: 600, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
	proto.setPointerCapture = () => undefined;
});
afterEach(() => {
	delete proto.setPointerCapture;
});

const rows = Array.from({ length: 100 }, (_, i) => ({ t: day(i), a: 100 + i, b: i % 4 === 0 ? 2 : null, note: `note ${i}`, start: 10, end: 14 }));
const base: TimeSeriesChartProps = { data: rows, series: [{ key: 'a', name: 'Series A', color: 'red' }] };

const wrap = (children: React.ReactNode) => (
	<DateFormatProvider formatter={utc}>
		<TimeSeriesSyncProvider>{children}</TimeSeriesSyncProvider>
	</DateFormatProvider>
);
const draw = (props: TimeSeriesChartProps) => render(wrap(<TimeSeriesChart {...props} />));

const plotOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-chart-plot]')!;
const overlayOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-chart-overlay]')!;
/** The number of days the chart shows now, read from its accessible label. */
const daysShown = (container: HTMLElement): number => Number(/\((\d+) days\)/.exec(plotOf(container).getAttribute('aria-label')!)![1]);
/** The latest value of the first series in the window, read from the accessible label (a later window has a greater one). */
const latestOf = (el: Element): number => Number(/latest (\d+)/.exec(el.getAttribute('aria-label')!)![1]);
// jsdom's PointerEvent ignores clientX / clientY: React reads the coordinates of a plain MouseEvent dispatched under the pointer event's name.
const pointer = (el: Element, type: string, clientX: number, clientY = 60) => fireEvent(el, new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY }));
const move = (el: Element, clientX: number, clientY = 60) => pointer(el, 'pointermove', clientX, clientY);
const down = (el: Element, clientX: number) => pointer(el, 'pointerdown', clientX);
const up = (el: Element) => pointer(el, 'pointerup', 0);

describe('hover tooltip', () => {
	it('shows the date and the value of the nearest row under the pointer, formatted with the chart settings', () => {
		const { container } = draw({ ...base, yUnit: 'deg', yDecimals: 2 });
		move(overlayOf(container), 300);
		const tip = screen.getByRole('tooltip');
		// the middle of 100 days is day 49.5; ties go to the earlier row (day 49 = 19 Feb, value 149)
		expect(tip).toHaveTextContent(/19 Feb 2026/);
		expect(tip).toHaveTextContent('Series A: 149.00 deg');
	});

	it('the first and the last row can be reached at the edges, and outside the plot the nearest edge row is used', () => {
		const { container } = draw(base);
		move(overlayOf(container), 0);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Series A: 100.0');
		move(overlayOf(container), 5000);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Series A: 199.0');
		move(overlayOf(container), -5000);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Series A: 100.0');
	});

	it('hover finds the right row when the rows come unsorted', () => {
		const shuffled = [rows[50]!, rows[0]!, rows[99]!, rows[25]!, rows[75]!];
		const { container } = draw({ ...base, data: shuffled });
		move(overlayOf(container), 0);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Series A: 100.0');
		move(overlayOf(container), 600);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Series A: 199.0');
	});

	it('a vertical reference line follows the hovered day, and everything goes when the pointer leaves', () => {
		const { container } = draw(base);
		expect(container.querySelector('.recharts-reference-line')).toBeNull();
		move(overlayOf(container), 300);
		expect(container.querySelector('.recharts-reference-line')).not.toBeNull();
		fireEvent.pointerLeave(overlayOf(container));
		expect(screen.queryByRole('tooltip')).toBeNull();
		expect(container.querySelector('.recharts-reference-line')).toBeNull();
	});

	it('lists every series with a value, with its own decimals and unit, and the clock format', () => {
		const { container } = draw({
			...base,
			marginRight: 60,
			yUnit: 'deg',
			data: [{ t: day(0), a: 1.234, r: 5.678, clock: 18.5 }, { t: day(1), a: 2, r: 3, clock: 25.25 }],
			series: [
				{ key: 'a', name: 'Series A', color: 'red', decimals: 0 },
				{ key: 'r', name: 'Series R', color: 'blue', axis: 'right' },
				{ key: 'missing', name: 'No value', color: 'green' },
			],
			yRightUnit: 'units',
			yRightDecimals: 3,
		});
		move(overlayOf(container), 0);
		const tip = screen.getByRole('tooltip');
		expect(tip).toHaveTextContent('Series A: 1 deg');
		expect(tip).toHaveTextContent('Series R: 5.678 units');
		expect(tip).not.toHaveTextContent('No value:');
		expect(tip).not.toHaveTextContent('No value');
	});

	it('yFormat clock writes hours of the day as HH:MM, +1 after midnight, whatever the date settings', () => {
		const { container } = draw({ ...base, yFormat: 'clock', data: [{ t: day(0), a: 18.5 }, { t: day(1), a: 24.5 }], series: [{ key: 'a', name: 'Bedtime', color: 'red' }] });
		move(overlayOf(container), 0);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Bedtime: 18:30');
		move(overlayOf(container), 600);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Bedtime: 00:30+1');
	});

	it('showValue: false lists the name and the detail text only; detailKey text is shown under the line', () => {
		const { container } = draw({ ...base, series: [{ key: 'a', name: 'Marker', color: 'red', showValue: false, detailKey: 'note' }] });
		move(overlayOf(container), 0);
		const tip = screen.getByRole('tooltip');
		expect(tip).toHaveTextContent('Markernote 0');
		expect(tip).not.toHaveTextContent('100');
	});

	it('a floating bar shows "from - to"', () => {
		const { container } = draw({ ...base, series: [{ key: 'end', fromKey: 'start', name: 'Span', color: 'blue', kind: 'bar' }] });
		move(overlayOf(container), 0);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Span: 10.0 - 14.0');
	});

	it('a floating bar missing its start is not listed', () => {
		const { container } = draw({ ...base, data: [{ t: day(0), end: 14 }, { t: day(1), end: 15, start: 1 }], series: [{ key: 'end', fromKey: 'start', name: 'Span', color: 'blue', kind: 'bar' }, { key: 'end', name: 'Plain', color: 'red' }] });
		move(overlayOf(container), 0);
		const tip = screen.getByRole('tooltip');
		expect(tip).toHaveTextContent('Plain: 14.0');
		expect(tip).not.toHaveTextContent('Span');
	});

	it('lists the rows sharing the hovered day (several bars on one day), and says so when the day has no value', () => {
		const data = [{ t: day(0), s: 1 }, { t: day(0), s: 2 }, { t: day(1), x: 1 }];
		const { container } = draw({ ...base, data, series: [{ key: 's', name: 'Events', color: 'blue', kind: 'bar' }] });
		move(overlayOf(container), 0);
		expect(within(screen.getByRole('tooltip')).getAllByText(/Events/)).toHaveLength(2);
		move(overlayOf(container), 600);
		expect(screen.getByRole('tooltip')).toHaveTextContent('No value this day');
	});

	it('the point colour of a dot is the swatch of its tooltip line', () => {
		const { container } = draw({ ...base, data: [{ t: day(0), a: 1, c: 'purple' }], series: [{ key: 'a', name: 'S', color: 'red', dots: 2, pointColorKey: 'c' }] });
		move(overlayOf(container), 0);
		expect(screen.getByRole('tooltip').querySelector('circle')).toHaveAttribute('fill', 'purple');
	});

	it('the card stays inside the box on the right edge (it is moved left, never past the width)', () => {
		const { container } = draw(base);
		move(overlayOf(container), 600);
		expect(Number.parseFloat(screen.getByRole('tooltip').style.left)).toBeLessThanOrEqual(600 - 230);
	});
});

describe('pan, zoom and reset', () => {
	it('dragging the plot pans the window: later when dragged to the left', () => {
		const { container } = draw(base);
		// zoom in first, otherwise the window is the whole period and there is nothing to pan
		fireEvent.keyDown(plotOf(container), { key: '+' });
		const label = () => plotOf(container).getAttribute('aria-label');
		const before = label();
		const overlay = overlayOf(container);
		down(overlay, 300);
		move(overlay, 200);
		up(overlay);
		expect(label()).not.toBe(before);
		// 100 px to the left of 600 = a sixth of the 60 days shown: the window moved 10 days later
		expect(latestOf(plotOf(container))).toBe(179 + 10);
	});

	it('a drag of 3 px or less is not a pan (a click with a little jitter keeps the tooltip)', () => {
		const { container } = draw(base);
		fireEvent.keyDown(plotOf(container), { key: '+' });
		const before = plotOf(container).getAttribute('aria-label');
		const overlay = overlayOf(container);
		down(overlay, 300);
		move(overlay, 302);
		expect(plotOf(container).getAttribute('aria-label')).toBe(before);
		expect(screen.getByRole('tooltip')).toBeInTheDocument();
	});

	it('while dragging the tooltip is hidden, the cursor says grabbing, and releasing restores grab', () => {
		const { container } = draw(base);
		fireEvent.keyDown(plotOf(container), { key: '+' });
		const overlay = overlayOf(container);
		expect(overlay).toHaveClass('cursor-grab');
		down(overlay, 300);
		expect(overlay).toHaveClass('cursor-grabbing');
		move(overlay, 100);
		expect(screen.queryByRole('tooltip')).toBeNull();
		up(overlay);
		expect(overlay).toHaveClass('cursor-grab');
		// the drag is over: moving again hovers, it does not pan
		const label = plotOf(container).getAttribute('aria-label');
		move(overlay, 400);
		expect(plotOf(container).getAttribute('aria-label')).toBe(label);
		expect(screen.getByRole('tooltip')).toBeInTheDocument();
	});

	it('a cancelled pointer ends the drag too', () => {
		const { container } = draw(base);
		const overlay = overlayOf(container);
		down(overlay, 300);
		fireEvent.pointerCancel(overlay, { pointerId: 1 });
		expect(overlay).toHaveClass('cursor-grab');
	});

	it('Ctrl + wheel zooms (in on a negative delta, out on a positive one) and the browser zoom is prevented', () => {
		const { container } = draw(base);
		const overlay = overlayOf(container);
		expect(daysShown(container)).toBe(100);
		const zoomIn = new WheelEvent('wheel', { ctrlKey: true, deltaY: -100, clientX: 300, bubbles: true, cancelable: true });
		act(() => {
			overlay.dispatchEvent(zoomIn);
		});
		expect(zoomIn.defaultPrevented).toBe(true);
		const zoomed = daysShown(container);
		expect(zoomed).toBeLessThan(100);
		const zoomOut = new WheelEvent('wheel', { ctrlKey: true, deltaY: 100, clientX: 300, bubbles: true, cancelable: true });
		act(() => {
			overlay.dispatchEvent(zoomOut);
		});
		expect(daysShown(container)).toBeGreaterThan(zoomed);
	});

	it('Meta + wheel zooms as well (macOS)', () => {
		const { container } = draw(base);
		act(() => {
			overlayOf(container).dispatchEvent(new WheelEvent('wheel', { metaKey: true, deltaY: -100, clientX: 300, bubbles: true, cancelable: true }));
		});
		expect(daysShown(container)).toBeLessThan(100);
	});

	it('a plain vertical wheel keeps scrolling the page: not prevented, window unchanged', () => {
		const { container } = draw(base);
		const plain = new WheelEvent('wheel', { deltaY: 100, clientX: 300, bubbles: true, cancelable: true });
		act(() => {
			overlayOf(container).dispatchEvent(plain);
		});
		expect(plain.defaultPrevented).toBe(false);
		expect(daysShown(container)).toBe(100);
	});

	it('a horizontal wheel pans (prevented) once zoomed in; at the whole period it only prevents the page swipe', () => {
		const { container } = draw(base);
		fireEvent.keyDown(plotOf(container), { key: '+' });
		const before = plotOf(container).getAttribute('aria-label');
		const swipe = new WheelEvent('wheel', { deltaX: 200, deltaY: 1, clientX: 300, bubbles: true, cancelable: true });
		act(() => {
			overlayOf(container).dispatchEvent(swipe);
		});
		expect(swipe.defaultPrevented).toBe(true);
		expect(plotOf(container).getAttribute('aria-label')).not.toBe(before);
	});

	it('double click shows the whole period again', () => {
		const { container } = draw(base);
		fireEvent.keyDown(plotOf(container), { key: '+' });
		expect(daysShown(container)).toBeLessThan(100);
		fireEvent.doubleClick(overlayOf(container));
		expect(daysShown(container)).toBe(100);
	});

	it('the wheel listener is removed with the chart', () => {
		const { container, unmount } = draw(base);
		const overlay = overlayOf(container);
		const remove = vi.spyOn(overlay, 'removeEventListener');
		unmount();
		expect(remove).toHaveBeenCalledWith('wheel', expect.any(Function));
	});
});

describe('keyboard (the plot is focusable)', () => {
	it('+ and = zoom in, - and _ zoom out, 0 shows the whole period; the keys are prevented', () => {
		const { container } = draw(base);
		const plot = plotOf(container);
		expect(fireEvent.keyDown(plot, { key: '+' })).toBe(false);
		const zoomed = daysShown(container);
		expect(zoomed).toBeLessThan(100);
		fireEvent.keyDown(plot, { key: '=' });
		expect(daysShown(container)).toBeLessThan(zoomed);
		fireEvent.keyDown(plot, { key: '-' });
		fireEvent.keyDown(plot, { key: '_' });
		expect(daysShown(container)).toBeGreaterThan(zoomed);
		fireEvent.keyDown(plot, { key: '0' });
		expect(daysShown(container)).toBe(100);
	});

	it('the arrows move the window earlier and later by half of it', () => {
		const { container } = draw(base);
		const plot = plotOf(container);
		fireEvent.keyDown(plot, { key: '+' });
		const label = () => plot.getAttribute('aria-label')!;
		const start = label();
		expect(latestOf(plot)).toBe(179);
		fireEvent.keyDown(plot, { key: 'ArrowRight' });
		expect(label()).not.toBe(start);
		// half of the 60 days later, stopped by the end of the data (day 99)
		expect(latestOf(plot)).toBe(199);
		fireEvent.keyDown(plot, { key: 'ArrowLeft' });
		expect(latestOf(plot)).toBe(199 - 30);
		fireEvent.keyDown(plot, { key: 'ArrowLeft' });
		fireEvent.keyDown(plot, { key: 'ArrowLeft' });
		// stopped by the start of the data: the window begins with the first day
		expect(label()).toMatch(/^Chart, Thu, 1 Jan 2026 to /);
		expect(latestOf(plot)).toBe(159);
	});

	it('other keys, and Ctrl / Meta / Alt combinations (page zoom), are left to the browser', () => {
		const { container } = draw(base);
		const plot = plotOf(container);
		for (const init of [{ key: 'a' }, { key: 'Tab' }, { key: '+', ctrlKey: true }, { key: '-', metaKey: true }, { key: '0', altKey: true }]) {
			expect(fireEvent.keyDown(plot, init)).toBe(true);
		}
		expect(daysShown(container)).toBe(100);
	});

	it('is reachable with the Tab key and works from there (user-event)', async () => {
		const user = userEvent.setup();
		const { container } = draw(base);
		await user.tab();
		expect(plotOf(container)).toHaveFocus();
		await user.keyboard('+');
		expect(daysShown(container)).toBeLessThan(100);
	});
});

describe('one window for the charts and the brush of a sync group', () => {
	const pair = (a: Partial<TimeSeriesChartProps> = {}, b: Partial<TimeSeriesChartProps> = {}) =>
		wrap(
			<>
				<div data-testid="one">
					<TimeSeriesChart {...base} syncGroup="g" {...a} />
				</div>
				<div data-testid="two">
					<TimeSeriesChart {...base} syncGroup="g" {...b} />
				</div>
				<TimeBrush data={rows} valueKey="a" syncGroup="g" />
			</>,
		);
	const days = (id: string) => daysShown(screen.getByTestId(id));

	it('zooming one chart zooms the other and the brush label; the brush Reset button resets all', async () => {
		const user = userEvent.setup();
		render(pair());
		fireEvent.keyDown(within1('one'), { key: '+' });
		expect(days('one')).toBeLessThan(100);
		expect(days('two')).toBe(days('one'));
		expect(screen.getByText(new RegExp(`\\(${days('one')} days\\)`))).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Reset zoom' }));
		expect(days('one')).toBe(100);
		expect(days('two')).toBe(100);
	});

	it('another group is independent', () => {
		render(pair({}, { syncGroup: 'other' }));
		fireEvent.keyDown(within1('one'), { key: '+' });
		expect(days('one')).toBeLessThan(100);
		expect(days('two')).toBe(100);
	});

	it('the zoom buttons of the brush drive the charts: in, out, earlier, later', async () => {
		const user = userEvent.setup();
		render(pair());
		await user.click(screen.getByRole('button', { name: 'Zoom in' }));
		const zoomed = days('one');
		expect(zoomed).toBeLessThan(100);
		await user.click(screen.getByRole('button', { name: 'Zoom out' }));
		expect(days('one')).toBeGreaterThan(zoomed);
		await user.click(screen.getByRole('button', { name: 'Zoom in' }));
		const plot = within1('one');
		const centre = latestOf(plot);
		await user.click(screen.getByRole('button', { name: 'Later' }));
		const later = latestOf(plot);
		expect(later).toBeGreaterThan(centre);
		await user.click(screen.getByRole('button', { name: 'Earlier' }));
		expect(latestOf(plot)).toBeLessThan(later);
		// the other chart of the group moved with it
		expect(latestOf(within1('two'))).toBe(latestOf(plot));
	});

	it('two providers on one page do not share their windows even with the same group name (two page runners)', () => {
		render(
			<DateFormatProvider formatter={utc}>
				<div data-testid="one">
					<TimeSeriesSyncProvider>
						<TimeSeriesChart {...base} syncGroup="g" />
					</TimeSeriesSyncProvider>
				</div>
				<div data-testid="two">
					<TimeSeriesSyncProvider>
						<TimeSeriesChart {...base} syncGroup="g" />
					</TimeSeriesSyncProvider>
				</div>
			</DateFormatProvider>,
		);
		fireEvent.keyDown(within1('one'), { key: '+' });
		expect(days('one')).toBeLessThan(100);
		expect(days('two')).toBe(100);
	});

	it('charts with different data share the union of their extents', () => {
		render(
			wrap(
				<>
					<div data-testid="one">
						<TimeSeriesChart {...base} syncGroup="u" data={rows.slice(0, 50)} />
					</div>
					<div data-testid="two">
						<TimeSeriesChart {...base} syncGroup="u" data={rows.slice(50)} />
					</div>
				</>,
			),
		);
		expect(days('one')).toBe(100);
		expect(days('two')).toBe(100);
	});

	function within1(id: string): HTMLElement {
		return screen.getByTestId(id).querySelector<HTMLElement>('[data-chart-plot]')!;
	}
});
