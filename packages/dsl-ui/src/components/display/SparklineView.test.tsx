import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeScope } from '../layout/ThemeScope.js';
import { SparklineView } from './SparklineView.js';
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


// 7 points, the 4th is a gap.
const points: SparkPoint[] = Array.from({ length: 7 }, (_, i) => ({ label: `P${i + 1}`, value: 70 + i, measured: i !== 3 }));
const SVG = { left: 100, top: 300, width: 60, height: 14 };
const CELL = { left: 50, top: 280, right: 400, bottom: 340 };
const TIP = { width: 100, height: 30 };

const box = (left: number, top: number, width: number, height: number): DOMRect =>
	({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

/** jsdom has no layout: give the three measured elements fixed boxes. Restored by `restoreMocks`. */
function mockLayout(cell: { left: number; top: number; right: number; bottom: number } = CELL): void {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
		if (this.tagName.toLowerCase() === 'svg') {
			return box(SVG.left, SVG.top, SVG.width, SVG.height);
		}
		if (this.hasAttribute('data-figure-cell')) {
			return box(cell.left, cell.top, cell.right - cell.left, cell.bottom - cell.top);
		}
		if (this.hasAttribute('data-spark-tooltip')) {
			return box(0, 0, TIP.width, TIP.height);
		}
		return box(0, 0, 0, 0);
	});
}

function view(extra: Partial<React.ComponentProps<typeof SparklineView>> = {}) {
	return render(
		<div data-figure-cell>
			<SparklineView points={points} ariaLabel="Latency, 7 points" {...extra} />
		</div>,
	);
}

const slider = (): HTMLElement => screen.getByRole('slider');
const tooltip = (): HTMLElement | null => screen.queryByRole('tooltip');
const move = (clientX: number, pointerType = 'mouse'): void => {
	fireEvent.pointerMove(slider(), { clientX, clientY: 305, pointerType });
};
const markerIndex = (): string | null => document.querySelector('[data-spark-marker]')?.getAttribute('data-index') ?? null;

describe('SparklineView pointer', () => {
	it('moving over it shows the tooltip of the nearest point and follows the pointer', () => {
		mockLayout();
		view();
		expect(tooltip()).toBeNull();
		move(SVG.left);
		expect(tooltip()).toHaveTextContent('P1: 70');
		move(SVG.left + 60);
		expect(tooltip()).toHaveTextContent('P7: 76');
		// Centred on the pointer: x - width / 2.
		expect(tooltip()!.style.left).toBe(`${SVG.left + 60 - TIP.width / 2}px`);
		expect(markerIndex()).toBe('6');
		move(SVG.left + 30);
		expect(tooltip()!.style.left).toBe(`${SVG.left + 30 - TIP.width / 2}px`);
	});

	it('an absent point is announced as no data and its marker is flagged as not measured', () => {
		mockLayout();
		view();
		move(SVG.left + 30);
		expect(tooltip()).toHaveTextContent('P4: no data');
		expect(document.querySelector('[data-spark-marker]')).toHaveAttribute('data-measured', 'false');
		move(SVG.left);
		expect(document.querySelector('[data-spark-marker]')).toHaveAttribute('data-measured', 'true');
	});

	it('leaving hides the tooltip', () => {
		mockLayout();
		view();
		move(SVG.left);
		expect(tooltip()).not.toBeNull();
		fireEvent.pointerLeave(slider(), { pointerType: 'mouse' });
		expect(tooltip()).toBeNull();
	});

	it('shows the detail line only for a measured point', () => {
		mockLayout();
		view({ points: points.map(p => ({ ...p, detail: 'detail text' })) });
		move(SVG.left);
		expect(tooltip()).toHaveTextContent('detail text');
		move(SVG.left + 30);
		expect(tooltip()).not.toHaveTextContent('detail text');
	});

	it('uses the owner text of the point, not the default one', () => {
		mockLayout();
		view({ points: points.map(p => ({ ...p, text: `${p.label} custom` })) });
		move(SVG.left);
		expect(tooltip()).toHaveTextContent('P1 custom');
		expect(tooltip()).not.toHaveTextContent('P1: 70');
	});
});

describe('SparklineView touch', () => {
	it('a touch tooltip stays after the finger lifts; a tap elsewhere hides it', () => {
		mockLayout();
		view();
		fireEvent.pointerDown(slider(), { clientX: SVG.left + 60, pointerType: 'touch' });
		expect(tooltip()).toHaveTextContent('P7');
		fireEvent.pointerLeave(slider(), { pointerType: 'touch' });
		expect(tooltip(), 'a touch leave must not hide').not.toBeNull();
		fireEvent.pointerDown(slider(), { clientX: SVG.left, pointerType: 'touch' });
		expect(tooltip(), 'a tap on the sparkline moves the marker').toHaveTextContent('P1');
		fireEvent.pointerDown(document.body, { clientX: 5, pointerType: 'touch' });
		expect(tooltip()).toBeNull();
	});

	it('a scroll hides a touch tooltip', () => {
		mockLayout();
		view();
		fireEvent.pointerDown(slider(), { clientX: SVG.left, pointerType: 'touch' });
		expect(tooltip()).not.toBeNull();
		fireEvent.scroll(window);
		expect(tooltip()).toBeNull();
	});

	it('removes its document and window listeners when it unmounts with a tooltip shown', () => {
		mockLayout();
		const docRemove = vi.spyOn(document, 'removeEventListener');
		const winRemove = vi.spyOn(window, 'removeEventListener');
		const { unmount } = view();
		fireEvent.pointerDown(slider(), { clientX: SVG.left, pointerType: 'touch' });
		unmount();
		expect(docRemove.mock.calls.map(c => c[0])).toContain('pointerdown');
		expect(winRemove.mock.calls.map(c => c[0])).toContain('scroll');
		expect(tooltip()).toBeNull();
	});

	it('does not listen on the document while no tooltip is shown', () => {
		mockLayout();
		const docAdd = vi.spyOn(document, 'addEventListener');
		view();
		expect(docAdd.mock.calls.filter(c => c[0] === 'pointerdown')).toHaveLength(0);
	});
});

describe('SparklineView keyboard', () => {
	it('is a named slider reachable with Tab; focus shows the latest point', async () => {
		mockLayout();
		const user = userEvent.setup();
		view();
		expect(slider()).toHaveAccessibleName('Latency, 7 points');
		expect(slider()).toHaveAttribute('aria-valuemin', '0');
		expect(slider()).toHaveAttribute('aria-valuemax', '6');
		expect(slider()).toHaveAttribute('aria-valuenow', '6');
		expect(slider()).toHaveAttribute('aria-valuetext', 'P7: 76');
		await user.tab();
		expect(slider()).toHaveFocus();
		expect(tooltip()).toHaveTextContent('P7: 76');
	});

	it('Left/Right/Home/End move the marker and update aria-valuetext', async () => {
		mockLayout();
		const user = userEvent.setup();
		view();
		await user.tab();
		await user.keyboard('{ArrowLeft}');
		expect(markerIndex()).toBe('5');
		expect(slider()).toHaveAttribute('aria-valuetext', 'P6: 75');
		await user.keyboard('{Home}');
		expect(markerIndex()).toBe('0');
		expect(slider()).toHaveAttribute('aria-valuenow', '0');
		expect(slider()).toHaveAttribute('aria-valuetext', 'P1: 70');
		await user.keyboard('{ArrowRight}');
		expect(markerIndex()).toBe('1');
		await user.keyboard('{End}');
		expect(markerIndex()).toBe('6');
		// Up and Down mirror Right and Left.
		await user.keyboard('{ArrowDown}');
		expect(markerIndex()).toBe('5');
		await user.keyboard('{ArrowUp}');
		expect(markerIndex()).toBe('6');
	});

	it('an absent point is announced as no data', async () => {
		mockLayout();
		const user = userEvent.setup();
		view();
		await user.tab();
		await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
		expect(slider()).toHaveAttribute('aria-valuetext', 'P4: no data');
		expect(tooltip()).toHaveTextContent('P4: no data');
	});

	it('aria-valuetext joins the owner text and detail', () => {
		mockLayout();
		view({ points: points.map(p => ({ ...p, text: `${p.label} text`, detail: `${p.label} detail` })) });
		expect(slider()).toHaveAttribute('aria-valuetext', 'P7 text, P7 detail');
	});

	it('at an end the key is still swallowed (no page scroll)', async () => {
		mockLayout();
		const user = userEvent.setup();
		view();
		await user.tab();
		// fireEvent returns false when the default was prevented.
		expect(fireEvent.keyDown(slider(), { key: 'ArrowRight' })).toBe(false);
		expect(slider()).toHaveAttribute('aria-valuenow', '6');
		expect(fireEvent.keyDown(slider(), { key: 'a' }), 'a key that is not ours is left alone').toBe(true);
	});

	it('Escape hides the tooltip and keeps the key from an enclosing dialog; with nothing shown it passes through', async () => {
		mockLayout();
		const user = userEvent.setup();
		const outer = vi.fn();
		document.addEventListener('keydown', outer);
		try {
			view();
			await user.tab();
			expect(tooltip()).not.toBeNull();
			outer.mockClear();
			expect(fireEvent.keyDown(slider(), { key: 'Escape' })).toBe(false);
			expect(tooltip()).toBeNull();
			expect(outer, 'the shown tooltip took the key').not.toHaveBeenCalled();
			expect(fireEvent.keyDown(slider(), { key: 'Escape' }), 'nothing shown: not prevented').toBe(true);
			expect(outer, 'nothing shown: the dialog still gets it').toHaveBeenCalledTimes(1);
		} finally {
			document.removeEventListener('keydown', outer);
		}
	});

	it('blur hides the tooltip', async () => {
		mockLayout();
		const user = userEvent.setup();
		view();
		await user.tab();
		expect(tooltip()).not.toBeNull();
		await user.tab();
		expect(tooltip()).toBeNull();
	});
});

describe('SparklineView tooltip placement', () => {
	it('goes above the tile when there is room', () => {
		mockLayout();
		view();
		move(SVG.left);
		expect(tooltip()!.style.top).toBe(`${CELL.top - 6 - TIP.height}px`);
	});

	it('goes below the tile only when there is no room above', () => {
		mockLayout({ left: 50, top: 10, right: 400, bottom: 70 });
		view();
		move(SVG.left);
		expect(tooltip()!.style.top).toBe(`${70 + 6}px`);
	});

	it('is clamped horizontally inside the viewport', () => {
		mockLayout();
		view();
		move(2);
		expect(tooltip()!.style.left).toBe('4px');
	});

	it('without a figure cell around it, the sparkline itself is what the tooltip stays clear of', () => {
		mockLayout();
		render(<SparklineView points={points} ariaLabel="x" />);
		move(SVG.left);
		expect(tooltip()!.style.top).toBe(`${SVG.top - 6 - TIP.height}px`);
	});
});

describe('SparklineView theme scope', () => {
	it('the tooltip lives in the nearest ThemeScope, so it is painted in that palette', () => {
		mockLayout();
		render(
			<ThemeScope theme="dark" surface="panel">
				<SparklineView points={points} ariaLabel="x" />
			</ThemeScope>,
		);
		move(SVG.left);
		const scope = document.querySelector('[data-theme-scope="dark"]');
		expect(scope).not.toBeNull();
		expect(scope!.contains(tooltip())).toBe(true);
	});

	it('with no scope it goes to the body', () => {
		mockLayout();
		view();
		move(SVG.left);
		expect(tooltip()!.parentElement).toBe(document.body);
	});
});

describe('SparklineView styling contract', () => {
	it('no inline colour: the only inline style is the tooltip position, colours are token classes', () => {
		mockLayout();
		const { container } = view();
		move(SVG.left);
		expect(container.querySelectorAll('[style]')).toHaveLength(0);
		expect(tooltip()!.getAttribute('style')).toMatch(/^left: -?\d+(\.\d+)?px; top: -?\d+(\.\d+)?px;?$/);
		expect(container.querySelector('svg')!.outerHTML).not.toMatch(/var\(--|#[0-9a-f]{3,6}|rgb/i);
	});

	it('keeps the caller className next to its own', () => {
		mockLayout();
		view({ className: 'relative z-10' });
		expect(slider()).toHaveClass('relative', 'z-10');
		expect(slider().className).toContain('cursor-crosshair');
	});
});

describe('SparklineView odd input', () => {
	it.each([
		['one point', [points[0]!]],
		['no point', []],
		['only gaps', [{ label: 'a', value: null, measured: false }, { label: 'b', value: null, measured: false }]],
	])('%s draws nothing and says nothing (not a mistake)', (_name, value) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = view({ points: value });
		expect(container.querySelector('[role="slider"]')).toBeNull();
		expect(warn).not.toHaveBeenCalled();
	});

	it('points of the wrong shape draw nothing and warn exactly once, naming the prop', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const bad = [{ label: 'a' }] as unknown as SparkPoint[];
		const { rerender } = view({ points: bad });
		expect(screen.queryByRole('slider')).toBeNull();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain('[SparklineView] points must be a list of');
		rerender(
			<div data-figure-cell>
				<SparklineView points={bad} ariaLabel="x" />
				<SparklineView points={bad} ariaLabel="y" />
			</div>,
		);
		expect(warn, 'same mistake, re-render and a second instance: still one report').toHaveBeenCalledTimes(1);
	});

	it('points that are not a list at all do not throw', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		for (const value of [undefined, null, 'text', 42, {}, true]) {
			expect(() => view({ points: value as unknown as SparkPoint[] })).not.toThrow();
		}
		expect(warn).toHaveBeenCalled();
	});

	it('without an ariaLabel it keeps a name, and says once why', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		view({ ariaLabel: '' });
		expect(slider()).toHaveAccessibleName('Sparkline');
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain('"ariaLabel" is required');
	});

	it('a given ariaLabel is used and nothing is reported', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		view({ ariaLabel: 'Errors' });
		expect(slider()).toHaveAccessibleName('Errors');
		expect(warn).not.toHaveBeenCalled();
	});

	it('does not report in a production build, and still draws nothing', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		view({ points: [{ label: 'a' }] as unknown as SparkPoint[] });
		expect(screen.queryByRole('slider')).toBeNull();
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('SparklineView pointer event without coordinates', () => {
	it('selects the first point instead of a NaN index', () => {
		mockLayout();
		view();
		act(() => {
			slider().dispatchEvent(new Event('pointermove', { bubbles: true }));
		});
		expect(markerIndex()).toBe('0');
	});
});
