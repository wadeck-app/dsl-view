import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FigureRow, type Figure, type FigureRowProps } from './FigureRow.js';
import type { SparkPoint } from './sparkline.js';

// jsdom has no PointerEvent: without one fireEvent.pointer* sends a plain Event with no clientX or pointerType.
// Same stand-in as AppShellMenu.test.tsx, plus pointerType; unstubGlobals (vitest.config.ts) restores the global.
class FakePointerEvent extends MouseEvent {
	readonly pointerType: string;
	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerType = init.pointerType ?? '';
	}
}

beforeEach(() => {
	vi.stubGlobal('PointerEvent', FakePointerEvent);
});


const points: SparkPoint[] = Array.from({ length: 5 }, (_, i) => ({ label: `P${i + 1}`, value: 10 + i, measured: i !== 2 }));

const latency: Figure = {
	label: 'Latency',
	value: '120',
	unit: 'ms',
	href: '/reports/latency',
	trend: { direction: 'up', text: 'Up 5 ms over the last 5 points', points },
};
const errors: Figure = { label: 'Errors', value: '3', trend: { direction: 'flat', text: 'No change', spark: [1, 2, null, 4] } };
const throughput: Figure = { label: 'Throughput', value: '1.2', unit: 'k/s' };

function Where() {
	return <output data-testid="where">{useLocation().pathname}</output>;
}

function inRouter(items: FigureRowProps['items']) {
	return render(
		<MemoryRouter>
			<FigureRow items={items} />
			<Where />
		</MemoryRouter>,
	);
}

const where = (): string => screen.getByTestId('where').textContent!;

describe('FigureRow content', () => {
	it('shows label, value and unit; the value and its unit share one line', () => {
		render(<FigureRow items={[throughput]} />);
		expect(screen.getByText('Throughput')).toBeInTheDocument();
		const value = screen.getByText('1.2');
		const unit = screen.getByText('k/s');
		expect(value.parentElement).toBe(unit.parentElement);
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('shows a number as it is, and 0 is a value (not an absent one)', () => {
		render(<FigureRow items={[{ label: 'A', value: 0 }, { label: 'B', value: 7.5 }]} />);
		expect(screen.getByText('0')).toBeInTheDocument();
		expect(screen.getByText('7.5')).toBeInTheDocument();
	});

	it('shows every figure, in order, and none when the list is empty', () => {
		const { container, rerender } = render(<FigureRow items={[latency, errors, throughput]} />);
		const cells = container.querySelectorAll('[data-figure-cell]');
		expect(Array.from(cells).map(c => c.firstElementChild!.textContent!.slice(0, 5))).toStrictEqual(['Laten', 'Error', 'Throu']);
		rerender(<FigureRow items={[]} />);
		expect(container.querySelectorAll('[data-figure-cell]')).toHaveLength(0);
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('two figures with the same label both render, without a React key warning', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		render(<FigureRow items={[{ label: 'Same', value: '1' }, { label: 'Same', value: '2' }]} />);
		expect(screen.getAllByText('Same')).toHaveLength(2);
		expect(error).not.toHaveBeenCalled();
	});

	it('null stands for an absent optional field', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<FigureRow items={[{ label: 'A', value: '1', unit: null, href: null, external: null, trend: null } as unknown as Figure]} />);
		expect(screen.getByText('A')).toBeInTheDocument();
		expect(screen.queryByRole('alert')).toBeNull();
		expect(warn).not.toHaveBeenCalled();
	});

	it('an empty unit renders no unit element', () => {
		const { container } = render(<FigureRow items={[{ label: 'A', value: '1', unit: '' }]} />);
		expect(container.querySelectorAll('[data-figure-cell] span')).toHaveLength(1);
	});
});

describe('FigureRow trend', () => {
	it.each(['up', 'down', 'flat', 'none'] as const)('direction %s has an icon hidden from assistive technology and the text as its accessible name', direction => {
		render(<FigureRow items={[{ label: 'A', value: '1', trend: { direction, text: `text of ${direction}` } }]} />);
		const mark = screen.getByRole('img', { name: `text of ${direction}` });
		expect(mark.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
		expect(mark).toHaveAttribute('title', `text of ${direction}`);
		expect(mark).toHaveAttribute('data-trend', direction);
	});

	it('draws a different icon for each direction', () => {
		const markup = (['up', 'down', 'flat', 'none'] as const).map(direction => {
			const { container, unmount } = render(<FigureRow items={[{ label: 'A', value: '1', trend: { direction, text: 't' } }]} />);
			const svg = container.querySelector('[data-trend] svg')?.innerHTML ?? '';
			unmount();
			return svg;
		});
		expect(markup.every(svg => svg !== '')).toBe(true);
		expect(new Set(markup).size).toBe(4);
	});

	it('is not coloured good or bad: the arrow carries no success or danger token', () => {
		const { container } = render(<FigureRow items={[{ label: 'A', value: '1', trend: { direction: 'down', text: 't' } }, { label: 'B', value: '1', trend: { direction: 'up', text: 't' } }]} />);
		expect(container.innerHTML).not.toMatch(/success|danger/);
	});

	it('has no trend mark without a trend', () => {
		render(<FigureRow items={[throughput]} />);
		expect(screen.queryByRole('img')).toBeNull();
	});

	it('names the sparkline after the figure and its point count', () => {
		render(<FigureRow items={[latency, errors]} />);
		expect(screen.getByRole('slider', { name: 'Latency, 5 points' })).toBeInTheDocument();
	});
});

describe('FigureRow sparkline', () => {
	it('points make a slider named after the figure, with one value per point', () => {
		render(<FigureRow items={[latency]} />);
		const slider = screen.getByRole('slider', { name: 'Latency, 5 points' });
		expect(slider).toHaveAttribute('aria-valuemax', '4');
		expect(slider).toHaveAttribute('aria-valuetext', 'P5: 14');
	});

	it('plain values (spark) become positional points, null being a gap', () => {
		render(<FigureRow items={[errors]} />);
		const slider = screen.getByRole('slider', { name: 'Errors, 4 points' });
		expect(slider).toHaveAttribute('aria-valuemax', '3');
		fireEvent.keyDown(slider, { key: 'Home' });
		expect(slider).toHaveAttribute('aria-valuetext', '#1: 1');
		fireEvent.keyDown(slider, { key: 'ArrowRight' });
		fireEvent.keyDown(slider, { key: 'ArrowRight' });
		expect(slider).toHaveAttribute('aria-valuetext', '#3: no data');
	});

	it('points win over spark', () => {
		render(<FigureRow items={[{ label: 'A', value: '1', trend: { direction: 'up', text: 't', spark: [1, 2], points } }]} />);
		expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '4');
	});

	it('a null points falls back to spark (null is absent)', () => {
		render(<FigureRow items={[{ label: 'A', value: '1', trend: { direction: 'up', text: 't', spark: [1, 2, 3], points: null } as unknown as Figure['trend'] }]} />);
		expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '2');
	});

	it('fewer than two points draws no sparkline but keeps the label and the trend mark', () => {
		render(<FigureRow items={[{ label: 'A', value: '1', trend: { direction: 'up', text: 't', spark: [3] } }]} />);
		expect(screen.queryByRole('slider')).toBeNull();
		expect(screen.getByText('A')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: 't' })).toBeInTheDocument();
	});
});

describe('FigureRow link and sparkline (nested interactive content)', () => {
	it('a linked figure is one link named by label, value, unit and trend text', () => {
		inRouter([latency]);
		const link = screen.getByRole('link', { name: 'Latency: 120 ms. Up 5 ms over the last 5 points' });
		expect(link).toHaveAttribute('href', '/reports/latency');
	});

	it('NOTHING interactive lives inside the link: the sparkline is a sibling control', () => {
		inRouter([latency, errors]);
		const link = screen.getByRole('link');
		expect(within(link).queryByRole('slider')).toBeNull();
		expect(link.querySelector('a, button, input, select, textarea, [tabindex], [role="slider"]')).toBeNull();
		const slider = screen.getByRole('slider', { name: 'Latency, 5 points' });
		expect(slider.closest('a')).toBeNull();
		// Same cell: the slider belongs to the figure the link drills into.
		expect(slider.closest('[data-figure-cell]')).toBe(link.closest('[data-figure-cell]'));
	});

	it('Tab reaches the sparkline first (visual order), then the link', async () => {
		const user = userEvent.setup();
		inRouter([latency]);
		await user.tab();
		expect(screen.getByRole('slider')).toHaveFocus();
		await user.tab();
		expect(screen.getByRole('link')).toHaveFocus();
	});

	it('clicking the link follows it through the router', async () => {
		const user = userEvent.setup();
		inRouter([latency]);
		expect(where()).toBe('/');
		await user.click(screen.getByRole('link'));
		expect(where()).toBe('/reports/latency');
	});

	it('a touch tap on the sparkline inspects a point and does not navigate', () => {
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 100, width: 60, height: 14, right: 60, bottom: 114, x: 0, y: 100, toJSON: () => ({}) } as DOMRect);
		inRouter([latency]);
		const slider = screen.getByRole('slider');
		fireEvent.pointerDown(slider, { clientX: 0, clientY: 105, pointerType: 'touch' });
		const tap = fireEvent.click(slider);
		expect(screen.getByRole('tooltip')).toHaveTextContent('P1: 10');
		expect(where()).toBe('/');
		// Nothing prevented the click either: there is no link around the slider to cancel.
		expect(tap).toBe(true);
	});

	it('a mouse click on the sparkline does not navigate either', async () => {
		const user = userEvent.setup();
		inRouter([latency]);
		await user.click(screen.getByRole('slider'));
		expect(where()).toBe('/');
	});

	it('the whole cell is the link target: the anchor stretches over it, the sparkline sits above', () => {
		inRouter([latency]);
		const link = screen.getByRole('link');
		// These two classes ARE the contract of the stretched link (jsdom has no layout to measure it).
		expect(link).toHaveClass('after:absolute', 'after:inset-0');
		expect(screen.getByRole('slider')).toHaveClass('relative', 'z-10');
		expect(link.closest('[data-figure-cell]')).toHaveClass('relative');
	});

	it('without href the cell is not a link and the slider keeps working', () => {
		render(<FigureRow items={[{ ...latency, href: undefined }]} />);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByRole('slider')).toBeInTheDocument();
	});

	it('an unusable href (not an app path) leaves the figure unlinked and reports once, naming FigureRow', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { rerender } = render(<FigureRow items={[{ label: 'A', value: '1', href: 'javascript:alert(1)' }]} />);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText('A')).toBeInTheDocument();
		rerender(<FigureRow items={[{ label: 'A', value: '1', href: 'javascript:alert(1)' }]} />);
		expect(error).toHaveBeenCalledTimes(1);
		expect(error.mock.calls[0]![0]).toContain('[FigureRow] href ignored');
	});

	it('an empty href is no link and no report', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		render(<FigureRow items={[{ label: 'A', value: '1', href: '' }]} />);
		expect(screen.queryByRole('link')).toBeNull();
		expect(error).not.toHaveBeenCalled();
	});

	it('external opens a full URL in a new tab with noopener noreferrer; without it the URL is refused', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { rerender } = render(<FigureRow items={[{ label: 'A', value: '1', href: 'https://example.com/x', external: true }]} />);
		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', 'https://example.com/x');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		rerender(<FigureRow items={[{ label: 'A', value: '1', href: 'https://example.com/x' }]} />);
		expect(screen.queryByRole('link')).toBeNull();
		expect(error).toHaveBeenCalledTimes(1);
	});

	it('works without a router above it (a plain anchor)', () => {
		render(<FigureRow items={[latency]} />);
		expect(screen.getByRole('link')).toHaveAttribute('href', '/reports/latency');
	});
});

describe('FigureRow styling contract', () => {
	it('no inline style at all, no raw palette class, no dark: variant', () => {
		const { container } = inRouter([latency, errors, throughput]);
		expect(container.querySelectorAll('[style]')).toHaveLength(0);
		const html = container.innerHTML;
		expect(html).not.toMatch(/\b(bg|text|border|stroke|fill)-(gray|slate|zinc|red|green|blue|white|black)\b/);
		expect(html).not.toMatch(/\bdark:/);
		expect(html).not.toMatch(/var\(--color-(?!primary-solid)/);
	});

	// jsdom has no layout, so the tile height cannot be measured here: these tokens ARE the contract. A 4x1 dashboard tile is
	// 50px high: 2 x 5px padding + 2 x 1px border + 12px x 1.2 (label) + 20px x 1.2 (value) = 50.4px. `py-1.5` + `leading-tight` made 54px.
	it('keeps the compact tile geometry: 5px vertical padding, line height 1.2, 3px between value, unit and arrow', () => {
		const { container } = inRouter([latency, throughput]);
		const cells = Array.from(container.querySelectorAll<HTMLElement>('[data-figure-cell]'));
		expect(cells).toHaveLength(2);
		for (const cell of cells) {
			expect(cell).toHaveClass('py-[5px]', 'border');
			expect(cell).not.toHaveClass('py-1.5');
			const label = within(cell).getByText(/Latency|Throughput/);
			expect(label.className.split(' ')).toContain('leading-[1.2]');
		}
		// A linked cell (latency, with a unit and a trend arrow) and a plain one: both lines carry the 3px gap.
		const lines = [screen.getByRole('link'), screen.getByText('1.2').parentElement!];
		for (const line of lines) {
			expect(line).toHaveClass('gap-[3px]');
			expect(line).not.toHaveClass('gap-1');
		}
		for (const value of [screen.getByText('120'), screen.getByText('1.2')]) {
			expect(value).toHaveClass('leading-[1.2]');
			expect(value).not.toHaveClass('leading-tight');
		}
	});
});

describe('FigureRow odd input', () => {
	const bad: Array<[string, unknown, RegExp]> = [
		['items is not a list', { label: 'A' }, /items must be a list/],
		['an item is not an object', ['text'], /items\[0\] must be \{ label/],
		['an item without a value', [{ label: 'A' }], /items\[0\] must have a string label/],
		['a NaN value', [{ label: 'A', value: Number.NaN }], /items\[0\] must have a string label/],
		['a unit that is not text', [{ label: 'A', value: '1', unit: 5 }], /items\[0\]\.unit must be a string/],
		['an href that is not text', [{ label: 'A', value: '1', href: {} }], /items\[0\]\.href must be a string/],
		['external that is not a boolean', [{ label: 'A', value: '1', external: 'yes' }], /items\[0\]\.external must be true or false/],
		['a trend without direction', [{ label: 'A', value: '1', trend: { text: 't' } }], /items\[0\]\.trend needs a direction/],
		['a trend with an empty text', [{ label: 'A', value: '1', trend: { direction: 'up', text: '' } }], /items\[0\]\.trend needs a direction/],
		['a trend that is text', [{ label: 'A', value: '1', trend: 'up' }], /items\[0\]\.trend needs a direction/],
		['spark with text in it', [{ label: 'A', value: '1', trend: { direction: 'up', text: 't', spark: ['1'] } }], /items\[0\]\.trend\.spark must be a list of finite numbers or null/],
		['points with a NaN value', [{ label: 'A', value: '1', trend: { direction: 'up', text: 't', points: [{ label: 'a', value: Number.NaN, measured: true }, { label: 'b', value: 1, measured: true }] } }], /items\[0\]\.trend\.points must be a list of/],
		['the second item is the bad one', [{ label: 'A', value: '1' }, { label: 'B' }], /items\[1\] must have a string label/],
	];

	it.each(bad)('%s: an alert naming the path and the fix, no figure, one warning', (_name, items, message) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = render(<FigureRow items={items as Figure[]} />);
		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent(message);
		expect(alert).toHaveTextContent(/^FigureRow: /);
		expect(container.querySelector('[data-figure-cell]')).toBeNull();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toMatch(message);
		expect(warn.mock.calls[0]![0]).toContain('[FigureRow]');
	});

	it('the same mistake is reported once across re-renders and instances', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const items = [{ label: 'A' }] as unknown as Figure[];
		const { rerender } = render(<FigureRow items={items} />);
		rerender(<FigureRow items={items} />);
		rerender(
			<>
				<FigureRow items={items} />
				<FigureRow items={items} />
			</>,
		);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('under StrictMode (effects run twice) it is still one report', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(
			<React.StrictMode>
				<FigureRow items={[{ label: 'A' }] as unknown as Figure[]} />
			</React.StrictMode>,
		);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('a different mistake is a different report; fixing the data clears the alert', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { rerender } = render(<FigureRow items={[{ label: 'A' }] as unknown as Figure[]} />);
		rerender(<FigureRow items={[{ label: 'B', value: '1', unit: 5 }] as unknown as Figure[]} />);
		expect(warn).toHaveBeenCalledTimes(2);
		rerender(<FigureRow items={[throughput]} />);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByText('Throughput')).toBeInTheDocument();
		expect(warn).toHaveBeenCalledTimes(2);
	});

	it('an absent list (a source not loaded yet) is an empty row: no alert, no warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = render(
			<>
				<FigureRow items={undefined as unknown as Figure[]} />
				<FigureRow items={null as unknown as Figure[]} />
			</>,
		);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(container.querySelectorAll('[data-figure-cell]')).toHaveLength(0);
		expect(warn).not.toHaveBeenCalled();
	});

	it('in a production build the alert still shows (it is UI) but the development warning is gone', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(<FigureRow items={[{ label: 'A' }] as unknown as Figure[]} />);
		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(warn).not.toHaveBeenCalled();
	});

	it('values JSON cannot print (circular, BigInt, Symbol) still give an alert, not a crash', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const circular: Record<string, unknown> = {};
		circular['self'] = circular;
		for (const item of [circular, 10n, Symbol('s')]) {
			const { unmount } = render(<FigureRow items={[item] as unknown as Figure[]} />);
			expect(screen.getByRole('alert')).toBeInTheDocument();
			unmount();
		}
	});
});
