import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DateFormatProvider } from '@dsl-ui/dates/DateFormatContext.js';
import { createDateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DEFAULT_DATE_SETTINGS } from '@dsl-ui/dates/dateSettings.js';

import { TimeBrush } from './TimeBrush.js';
import type { TimeBrushProps } from './TimeBrush.js';
import { DAY_MS, MIN_SPAN_MS } from './timeSeriesMath.js';
import { TimeSeriesSyncProvider } from './timeSeriesSync.js';

const T0 = Date.UTC(2026, 0, 1);
const day = (i: number): number => T0 + i * DAY_MS;
const utc = createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC' });

// jsdom has no layout and no pointer capture: the strip is 600 px wide at the origin, capture is a no-op, both restored after each test.
const proto = HTMLElement.prototype as { setPointerCapture?: unknown };
beforeEach(() => {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 600, height: 56, left: 0, top: 0, right: 600, bottom: 56, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
	proto.setPointerCapture = () => undefined;
});
afterEach(() => {
	delete proto.setPointerCapture;
});

const rows = Array.from({ length: 100 }, (_, i) => ({ t: day(i), v: i % 10, sparse: i % 5 === 0 ? i + 1 : null }));
const base: TimeBrushProps = { data: rows, valueKey: 'v' };

const tree = (props: TimeBrushProps) => (
	<DateFormatProvider formatter={utc}>
		<TimeSeriesSyncProvider>
			<TimeBrush {...props} />
		</TimeSeriesSyncProvider>
	</DateFormatProvider>
);
const draw = (props: TimeBrushProps) => render(tree(props));

// jsdom's PointerEvent ignores clientX: React reads the coordinates of a plain MouseEvent dispatched under the pointer event's name.
const pointer = (el: Element, type: string, clientX: number) => fireEvent(el, new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY: 10 }));
const stripOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-brush-strip]')!;
const windowBoxOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-brush-window]')!;
const handleOf = (container: HTMLElement, side: 'left' | 'right') => container.querySelector<HTMLElement>(`[data-brush-handle="${side}"]`)!;
const labelOf = (container: HTMLElement) => container.querySelector('[data-window-label]')!.textContent;
const px = (el: HTMLElement, property: 'left' | 'width') => Number.parseFloat(el.style[property]);

describe('what it shows', () => {
	it('renders nothing while the data is loading, empty, or without a usable x', () => {
		expect(draw({ ...base, data: undefined }).container).toBeEmptyDOMElement();
		expect(draw({ ...base, data: [] }).container).toBeEmptyDOMElement();
		expect(draw({ ...base, data: [{ t: 'x', v: 1 }, null, 4] }).container).toBeEmptyDOMElement();
	});

	it('writes the period with the date settings and the number of days', () => {
		const { container } = draw(base);
		expect(labelOf(container)).toBe('1 Jan 2026 - 10 Apr 2026 (100 days)');
	});

	it('the date settings decide the language of the period', () => {
		const { container } = render(
			<DateFormatProvider formatter={createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC', locale: 'fr-FR' })}>
				<TimeSeriesSyncProvider>
					<TimeBrush {...base} />
				</TimeSeriesSyncProvider>
			</DateFormatProvider>,
		);
		expect(labelOf(container)).toBe('1 janv. 2026 - 10 avr. 2026 (100 days)');
	});

	it('the window covers the whole strip at first, and the handles sit on its edges', () => {
		const { container } = draw(base);
		expect(px(windowBoxOf(container), 'left')).toBe(0);
		expect(px(windowBoxOf(container), 'width')).toBe(600);
		expect(px(handleOf(container, 'left'), 'left')).toBe(-3.5);
		expect(px(handleOf(container, 'right'), 'left')).toBe(600 - 3.5);
	});

	it('draws the values as a line over the whole period; kind bars draws one tick per row with a value', () => {
		const line = draw(base);
		const d = line.container.querySelector('svg path')!.getAttribute('d')!;
		expect(d.startsWith('M')).toBe(true);
		expect(d.match(/L/g)).toHaveLength(99);
		line.unmount();
		const bars = draw({ ...base, valueKey: 'sparse', kind: 'bars' });
		const ticks = bars.container.querySelector('svg path')!.getAttribute('d')!.split('M').filter(Boolean);
		expect(ticks).toHaveLength(20);
		// each tick rises from the bottom of the strip (4 px margin + 48 px inner)
		expect(ticks.every(tick => tick.trim().startsWith(tick.split(' ')[0]!))).toBe(true);
	});

	it('bars: the tallest tick fills the strip and a value of 0 keeps 1 px', () => {
		const { container } = draw({ ...base, kind: 'bars', data: [{ t: day(0), v: 0 }, { t: day(1), v: 10 }, { t: day(2), v: 5 }] });
		const heights = container.querySelector('svg path')!.getAttribute('d')!.split('M').filter(Boolean).map(tick => {
			const [, y1, , y2] = tick.replace('L', ' ').trim().split(/\s+/).map(Number);
			return y1! - y2!;
		});
		expect(heights).toStrictEqual([1, 48, 24]);
	});

	it('a valueKey that names no field draws an empty strip, not an error', () => {
		const { container } = draw({ ...base, valueKey: 'nope' });
		expect(container.querySelector('svg path')).toHaveAttribute('d', '');
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('a constant series is drawn in the middle of the strip', () => {
		const { container } = draw({ ...base, data: [{ t: day(0), v: 5 }, { t: day(1), v: 5 }] });
		// two days padded by half a day each side: the points sit at 1/4 and 3/4 of the 600 px, on the middle line (4 + 48 / 2)
		expect(container.querySelector('svg path')!.getAttribute('d')).toBe('M150.0 28.0 L450.0 28.0');
	});

	it('aligns with the plot area of the charts: yAxisWidth on the left, marginRight on the right', () => {
		const { container } = draw({ ...base, yAxisWidth: 80, marginRight: 30 });
		expect(stripOf(container).parentElement).toHaveStyle({ marginLeft: '80px', marginRight: '30px' });
		const defaults = draw(base);
		expect(stripOf(defaults.container).parentElement).toHaveStyle({ marginLeft: '56px', marginRight: '16px' });
	});

	it('height sets the strip height; the overview marker is hidden from assistive technology', () => {
		const { container } = draw({ ...base, height: 90 });
		expect(stripOf(container)).toHaveStyle({ height: '90px' });
		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
	});

	it('uses the dsl-ui frame tokens only', () => {
		const { container } = draw(base);
		expect(container.firstElementChild).toHaveClass('rounded-lg', 'border', 'border-border', 'bg-surface');
		expect(container.innerHTML).not.toMatch(/dark:/);
		expect(stripOf(container)).toHaveClass('bg-bg-secondary');
	});
});

describe('buttons', () => {
	it('are labelled for assistive technology and have a tooltip, and Reset is disabled on the whole period', () => {
		draw(base);
		for (const name of ['Zoom in', 'Zoom out', 'Earlier', 'Later', 'Reset zoom']) {
			expect(screen.getByRole('button', { name })).toBeInTheDocument();
		}
		expect(screen.getByRole('button', { name: 'Zoom in' })).toHaveAttribute('title', 'Zoom in');
		expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeDisabled();
	});

	it('Zoom in shrinks the window to 60% around its centre; Reset enables, then restores the period', async () => {
		const user = userEvent.setup();
		const { container } = draw(base);
		await user.click(screen.getByRole('button', { name: 'Zoom in' }));
		expect(labelOf(container)).toMatch(/\(60 days\)$/);
		expect(px(windowBoxOf(container), 'left')).toBeCloseTo(120, 0);
		expect(px(windowBoxOf(container), 'width')).toBeCloseTo(360, 0);
		expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeEnabled();
		await user.click(screen.getByRole('button', { name: 'Reset zoom' }));
		expect(labelOf(container)).toMatch(/\(100 days\)$/);
		expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeDisabled();
	});

	it('Zoom out widens it again, up to the whole period', async () => {
		const user = userEvent.setup();
		const { container } = draw(base);
		await user.click(screen.getByRole('button', { name: 'Zoom in' }));
		await user.click(screen.getByRole('button', { name: 'Zoom in' }));
		expect(labelOf(container)).toMatch(/\(36 days\)$/);
		await user.click(screen.getByRole('button', { name: 'Zoom out' }));
		await user.click(screen.getByRole('button', { name: 'Zoom out' }));
		await user.click(screen.getByRole('button', { name: 'Zoom out' }));
		expect(labelOf(container)).toMatch(/\(100 days\)$/);
	});

	it('Earlier and Later move by half the window and stop at the ends', async () => {
		const user = userEvent.setup();
		const { container } = draw(base);
		await user.click(screen.getByRole('button', { name: 'Zoom in' }));
		// 360 px window at 120: half of it (180 px) later would pass the end, so it stops with its right edge on the strip's
		await user.click(screen.getByRole('button', { name: 'Later' }));
		expect(px(windowBoxOf(container), 'left')).toBeCloseTo(240, 0);
		expect(px(windowBoxOf(container), 'width')).toBeCloseTo(360, 0);
		await user.click(screen.getByRole('button', { name: 'Earlier' }));
		expect(px(windowBoxOf(container), 'left')).toBeCloseTo(60, 0);
		await user.click(screen.getByRole('button', { name: 'Earlier' }));
		expect(px(windowBoxOf(container), 'left')).toBe(0);
	});

	it('the buttons never submit a surrounding form', async () => {
		const user = userEvent.setup();
		const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
		render(
			<form onSubmit={submit}>
				{tree(base)}
			</form>,
		);
		await user.click(screen.getByRole('button', { name: 'Zoom in' }));
		expect(submit).not.toHaveBeenCalled();
	});
});

describe('pointer: pan, resize and recentre', () => {
	it('a click outside the window centres it on that spot', () => {
		const { container } = draw(base);
		fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
		// window [120, 480] px: a click at 540 recentres on 540, which the end of the strip stops at 480+...: it clamps
		pointer(stripOf(container), 'pointerdown', 540);
		pointer(stripOf(container), 'pointerup', 540);
		expect(px(windowBoxOf(container), 'left') + px(windowBoxOf(container), 'width')).toBeCloseTo(600, 0);
		pointer(stripOf(container), 'pointerdown', 60);
		expect(px(windowBoxOf(container), 'left')).toBe(0);
	});

	it('dragging the window pans it by the pointer distance', () => {
		const { container } = draw(base);
		fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
		pointer(windowBoxOf(container), 'pointerdown', 300);
		pointer(stripOf(container), 'pointermove', 360);
		expect(px(windowBoxOf(container), 'left')).toBeCloseTo(120 + 60, 0);
		pointer(stripOf(container), 'pointerup', 360);
		pointer(stripOf(container), 'pointermove', 500);
		expect(px(windowBoxOf(container), 'left')).toBeCloseTo(180, 0);
	});

	it('the left handle moves the start only, the right handle the end only, and neither goes under the minimum span', () => {
		const { container } = draw(base);
		fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
		pointer(handleOf(container, 'left'), 'pointerdown', 120);
		pointer(stripOf(container), 'pointermove', 220);
		expect(px(windowBoxOf(container), 'left')).toBeCloseTo(220, 0);
		expect(px(windowBoxOf(container), 'left') + px(windowBoxOf(container), 'width')).toBeCloseTo(480, 0);
		pointer(stripOf(container), 'pointerup', 220);
		pointer(handleOf(container, 'right'), 'pointerdown', 480);
		pointer(stripOf(container), 'pointermove', 5000);
		expect(px(windowBoxOf(container), 'left') + px(windowBoxOf(container), 'width')).toBeCloseTo(600, 0);
		pointer(stripOf(container), 'pointerup', 0);
		pointer(handleOf(container, 'left'), 'pointerdown', 220);
		pointer(stripOf(container), 'pointermove', 5000);
		// 7 days of 100 over 600 px
		expect(px(windowBoxOf(container), 'width')).toBeCloseTo((MIN_SPAN_MS / (100 * DAY_MS)) * 600, 0);
	});

	it('moving the pointer without a drag in progress changes nothing', () => {
		const { container } = draw(base);
		const before = labelOf(container);
		pointer(stripOf(container), 'pointermove', 300);
		expect(labelOf(container)).toBe(before);
	});

	it('a cancelled pointer ends the drag', () => {
		const { container } = draw(base);
		fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
		pointer(windowBoxOf(container), 'pointerdown', 300);
		pointer(stripOf(container), 'pointercancel', 300);
		const before = px(windowBoxOf(container), 'left');
		pointer(stripOf(container), 'pointermove', 400);
		expect(px(windowBoxOf(container), 'left')).toBe(before);
	});

	it('a given domain wider than the data sets the period', () => {
		const { container } = draw({ ...base, domain: [day(-50), day(150)] });
		expect(labelOf(container)).toMatch(/\(200 days\)$/);
	});
});

describe('props the component cannot use: an inline alert and ONE development warning', () => {
	it('names the component and the fix', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = draw({ data: rows } as unknown as TimeBrushProps);
		expect(screen.getByRole('alert')).toHaveTextContent('TimeBrush: valueKey is required: the field of the row drawn as the overview line.');
		expect(container.querySelector('[data-brush-strip]')).toBeNull();
	});

	it('logs one warning with the consequence for the brush, once per message', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const view = draw({ ...base, kind: 'dots' as unknown as 'line' });
		view.rerender(tree({ ...base, kind: 'dots' as unknown as 'line' }));
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('[TimeBrush] kind must be "line" or "bars", got "dots". Showing an inline alert instead of the brush until the props are fixed.');
	});

	it('refuses a domain that is not [min, max] with min < max (it used to render NaN positions)', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const domain of [[5, 5], [0, Infinity], [1, 0]]) {
			const { unmount } = draw({ ...base, domain });
			expect(screen.getByRole('alert')).toHaveTextContent(/domain must be \[min, max\] with min < max/);
			unmount();
		}
	});

	it('fixing the props brings the brush back', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const view = draw({ ...base, kind: 'dots' as unknown as 'line' });
		view.rerender(tree(base));
		expect(screen.queryByRole('alert')).toBeNull();
		expect(view.container.querySelector('[data-brush-strip]')).not.toBeNull();
	});

	it('a server render shows the alert and logs nothing; in production the alert stays and the warning goes', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(renderToStaticMarkup(tree({ data: rows } as unknown as TimeBrushProps))).toContain('role="alert"');
		expect(warn).not.toHaveBeenCalled();
		vi.stubEnv('NODE_ENV', 'production');
		draw({ data: rows } as unknown as TimeBrushProps);
		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(warn).not.toHaveBeenCalled();
	});

	it('valid props log nothing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		draw(base);
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	});
});

describe('loading, then rows', () => {
	it('the strip appears after the rows arrive and is measured (it did not exist at the first render)', () => {
		const view = draw({ ...base, data: undefined });
		expect(view.container).toBeEmptyDOMElement();
		view.rerender(tree(base));
		expect(px(windowBoxOf(view.container), 'width')).toBe(600);
	});
});
