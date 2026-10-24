import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type ShellItem } from './AppShell.js';
import { scrollDeltaToReveal } from './ShellTabs.js';

describe('scrollDeltaToReveal', () => {
	it('is 0 when the tab is fully inside', () => {
		expect(scrollDeltaToReveal(0, 300, 100, 200)).toBe(0);
	});
	it('ignores a sub-pixel cut', () => {
		expect(scrollDeltaToReveal(0, 300, -0.5, 100)).toBe(0);
		expect(scrollDeltaToReveal(0, 300, 200, 300.5)).toBe(0);
	});
	it('scrolls right by exactly what is cut off at the right edge', () => {
		expect(scrollDeltaToReveal(0, 300, 250, 350)).toBe(50);
	});
	it('scrolls left by exactly what is cut off at the left edge', () => {
		expect(scrollDeltaToReveal(0, 300, -40, 60)).toBe(-40);
	});
	it('keeps the left edge visible when the tab is wider than the box', () => {
		expect(scrollDeltaToReveal(0, 100, 20, 220)).toBe(20);
	});
	it('works with a nav that does not start at 0', () => {
		expect(scrollDeltaToReveal(500, 300, 760, 860)).toBe(60);
	});
});

const TAB_WIDTH = 100;
const NAV_WIDTH = 300;
const scrollLefts = new WeakMap<Element, number>();
const originals: Record<string, PropertyDescriptor | undefined> = {};

// jsdom has no layout: fake a 300px nav holding 100px tabs, one after the other, shifted by the nav's scrollLeft.
function fakeLayout() {
	originals['clientWidth'] = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
	originals['scrollLeft'] = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft');
	originals['rect'] = Object.getOwnPropertyDescriptor(Element.prototype, 'getBoundingClientRect');
	Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
		configurable: true,
		get(this: HTMLElement) {
			return this.tagName === 'NAV' ? NAV_WIDTH : 0;
		},
	});
	Object.defineProperty(Element.prototype, 'scrollLeft', {
		configurable: true,
		get(this: Element) {
			return scrollLefts.get(this) ?? 0;
		},
		set(this: Element, value: number) {
			scrollLefts.set(this, value);
		},
	});
	Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
		configurable: true,
		value(this: Element) {
			const parent = this.parentElement;
			if (this.tagName === 'NAV') {
				return { left: 0, right: NAV_WIDTH, top: 0, bottom: 44, width: NAV_WIDTH, height: 44, x: 0, y: 0, toJSON: () => ({}) };
			}
			if (parent?.tagName === 'NAV' && parent.getAttribute('aria-label') === 'Sections') {
				const index = Array.from(parent.children).indexOf(this);
				const left = index * TAB_WIDTH - (scrollLefts.get(parent) ?? 0);
				return { left, right: left + TAB_WIDTH, top: 0, bottom: 44, width: TAB_WIDTH, height: 44, x: left, y: 0, toJSON: () => ({}) };
			}
			return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) };
		},
	});
}

function restoreLayout() {
	const restore = (target: object, key: string, original: PropertyDescriptor | undefined) => {
		if (original) {
			Object.defineProperty(target, key, original);
		} else {
			Reflect.deleteProperty(target, key);
		}
	};
	restore(HTMLElement.prototype, 'clientWidth', originals['clientWidth']);
	restore(Element.prototype, 'scrollLeft', originals['scrollLeft']);
	restore(Element.prototype, 'getBoundingClientRect', originals['rect']);
}

const MENU = { title: 'Home', label: 'Pages', items: [{ id: 'o', label: 'Overview', href: '/' }] };
const tabs = (count: number, currentIndex: number): ShellItem[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `t${i}`,
		label: `Tab ${i}`,
		href: `/t${i}`,
		current: i === currentIndex ? ('true' as const) : undefined,
	}));

const shell = (items: ShellItem[], moreLabel?: string) => (
	<AppShell brand="app" tabs={items} tabsLabel="Sections" menu={MENU} moreLabel={moreLabel}>
		<p>content</p>
	</AppShell>
);

describe('AppShell tabs overflow', () => {
	beforeEach(fakeLayout);
	afterEach(restoreLayout);

	const nav = () => screen.getByRole('navigation', { name: 'Sections' });

	it('keeps the brand on one line and never squeezed by the tabs', () => {
		render(shell(tabs(3, 0)));
		const classes = screen.getByText('app').className.split(/\s+/);
		expect(classes).toContain('whitespace-nowrap');
		expect(classes).toContain('shrink-0');
	});

	it('does not scroll when the current tab is already visible', () => {
		render(shell(tabs(8, 1)));
		expect(nav().scrollLeft).toBe(0);
	});

	it('brings a current tab that is cut off at the right edge into view on mount', () => {
		render(shell(tabs(8, 7)));
		// Tab 7 spans 700..800 and the box is 300 wide: the nav must be shifted so that its right edge is the box's.
		expect(nav().scrollLeft).toBe(500);
	});

	it('follows the current tab when it changes', () => {
		const { rerender } = render(shell(tabs(8, 0)));
		expect(nav().scrollLeft).toBe(0);
		rerender(shell(tabs(8, 5)));
		expect(nav().scrollLeft).toBe(300);
		rerender(shell(tabs(8, 0)));
		expect(nav().scrollLeft).toBe(0);
	});

	it('does not re-scroll when the host re-creates an equal tabs array', () => {
		const { rerender } = render(shell(tabs(8, 7)));
		nav().scrollLeft = 200;
		rerender(shell(tabs(8, 7)));
		expect(nav().scrollLeft).toBe(200);
	});

	it('does not render the overflow control without moreLabel, even when tabs are cut off', () => {
		render(shell(tabs(8, 0)));
		expect(screen.queryByRole('button', { name: /more/i })).toBeNull();
	});

	it('does not render the overflow control when every tab fits', () => {
		render(shell(tabs(3, 0), 'More'));
		expect(screen.queryByRole('button', { name: /more/i })).toBeNull();
	});

	describe('with moreLabel', () => {
		it('lists exactly the tabs that are cut off, with their count', () => {
			render(shell(tabs(8, 0), 'More'));
			const button = screen.getByRole('button', { name: /more/i });
			expect(button.getAttribute('aria-expanded')).toBe('false');
			expect(button.textContent).toBe('More(5)');
			fireEvent.click(button);
			expect(button.getAttribute('aria-expanded')).toBe('true');
			const panel = within(screen.getByRole('navigation', { name: 'More' }));
			expect(panel.getAllByRole('link').map((a) => a.textContent)).toEqual(['Tab 3', 'Tab 4', 'Tab 5', 'Tab 6', 'Tab 7']);
			expect(panel.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/t3', '/t4', '/t5', '/t6', '/t7']);
		});

		it('updates the list when the nav scrolls', () => {
			render(shell(tabs(8, 0), 'More'));
			nav().scrollLeft = 500;
			act(() => {
				fireEvent.scroll(nav());
			});
			const button = screen.getByRole('button', { name: /more/i });
			// Scrolled to the end: tabs 0..4 are now cut off at the left, 5..7 are visible.
			expect(button.textContent).toBe('More(5)');
			fireEvent.click(button);
			const links = within(screen.getByRole('navigation', { name: 'More' })).getAllByRole('link');
			expect(links.map((a) => a.textContent)).toEqual(['Tab 0', 'Tab 1', 'Tab 2', 'Tab 3', 'Tab 4']);
		});

		it('closes on Escape and gives the focus back to the button', () => {
			render(shell(tabs(8, 0), 'More'));
			const button = screen.getByRole('button', { name: /more/i });
			fireEvent.click(button);
			fireEvent.keyDown(document, { key: 'Escape' });
			expect(button.getAttribute('aria-expanded')).toBe('false');
			expect(screen.queryByRole('navigation', { name: 'More' })).toBeNull();
			expect(document.activeElement).toBe(button);
		});

		it('closes on a press outside, not on a press inside', () => {
			render(shell(tabs(8, 0), 'More'));
			const button = screen.getByRole('button', { name: /more/i });
			fireEvent.click(button);
			fireEvent.pointerDown(button);
			expect(button.getAttribute('aria-expanded')).toBe('true');
			fireEvent.pointerDown(screen.getByText('content'));
			expect(button.getAttribute('aria-expanded')).toBe('false');
		});

		it('closes when one of its links is used', () => {
			render(shell(tabs(8, 0), 'More'));
			const button = screen.getByRole('button', { name: /more/i });
			fireEvent.click(button);
			// A real <a href> click would make jsdom log "navigation not implemented": the host would navigate here.
			const keepPage = (event: Event) => event.preventDefault();
			document.addEventListener('click', keepPage);
			fireEvent.click(within(screen.getByRole('navigation', { name: 'More' })).getByRole('link', { name: 'Tab 4' }));
			document.removeEventListener('click', keepPage);
			expect(button.getAttribute('aria-expanded')).toBe('false');
		});
	});
});

describe('scrollDeltaToReveal boundaries', () => {
	it('tolerates a cut of exactly one pixel at either edge, and no more', () => {
		expect(scrollDeltaToReveal(0, 300, -1, 100)).toBe(0);
		expect(scrollDeltaToReveal(0, 300, -1.5, 100)).toBe(-1.5);
		expect(scrollDeltaToReveal(0, 300, 200, 301)).toBe(0);
		expect(scrollDeltaToReveal(0, 300, 200, 302)).toBe(2);
	});
	it('measures both edges from the nav, wherever the nav starts', () => {
		// Nav spans 500..800; a tab at 460..560 is cut by 40 at the left, one at 760..860 by 60 at the right.
		expect(scrollDeltaToReveal(500, 300, 460, 560)).toBe(-40);
		expect(scrollDeltaToReveal(500, 300, 760, 860)).toBe(60);
		expect(scrollDeltaToReveal(500, 300, 600, 700)).toBe(0);
	});
	it('shows the left edge of a tab wider than the box that starts inside it', () => {
		expect(scrollDeltaToReveal(0, 100, 30, 230)).toBe(30);
	});
});

describe('AppShell tabs observers and edge cases', () => {
	beforeEach(fakeLayout);
	afterEach(() => {
		restoreLayout();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	const nav = () => screen.getByRole('navigation', { name: 'Sections' });

	// A ResizeObserver the test drives by hand.
	function stubResizeObserver() {
		const instances: Array<{ observed: Element[]; disconnected: boolean; callback: () => void }> = [];
		class FakeResizeObserver {
			observed: Element[] = [];
			disconnected = false;
			constructor(public callback: () => void) {
				instances.push(this);
			}
			observe(element: Element) {
				this.observed.push(element);
			}
			unobserve() {}
			disconnect() {
				this.disconnected = true;
			}
		}
		vi.stubGlobal('ResizeObserver', FakeResizeObserver);
		return instances;
	}

	it('observes the nav box, and stops observing when unmounted', () => {
		const instances = stubResizeObserver();
		const { unmount } = render(shell(tabs(8, 0), 'More'));
		expect(instances).toHaveLength(1);
		expect(instances[0]!.observed).toEqual([nav()]);
		unmount();
		expect(instances[0]!.disconnected).toBe(true);
	});

	it('reveals the current tab and refreshes the overflow list when the nav box is resized', () => {
		const instances = stubResizeObserver();
		render(shell(tabs(8, 7), 'More'));
		// Something moved the nav back to the start (e.g. the overflow control appeared next to it).
		nav().scrollLeft = 0;
		act(() => instances[0]!.callback());
		expect(nav().scrollLeft).toBe(500);
		expect(screen.getByRole('button', { name: /more/i }).textContent).toBe('More(5)');
	});

	it('measures the cut-off tabs again when the nav box is resized, without any scroll event', () => {
		const instances = stubResizeObserver();
		render(shell(tabs(8, -1), 'More'));
		fireEvent.click(screen.getByRole('button', { name: /more/i }));
		expect(within(screen.getByRole('navigation', { name: 'More' })).getAllByRole('link').map((a) => a.textContent)).toEqual(['Tab 3', 'Tab 4', 'Tab 5', 'Tab 6', 'Tab 7']);

		// No tab is current, so nothing is revealed again: the list can only change if the resize re-measures.
		nav().scrollLeft = 500;
		act(() => instances[0]!.callback());
		expect(within(screen.getByRole('navigation', { name: 'More' })).getAllByRole('link').map((a) => a.textContent)).toEqual(['Tab 0', 'Tab 1', 'Tab 2', 'Tab 3', 'Tab 4']);
	});

	it('still works where ResizeObserver does not exist', () => {
		vi.stubGlobal('ResizeObserver', undefined);
		render(shell(tabs(8, 7), 'More'));
		expect(nav().scrollLeft).toBe(500);
	});

	it('listens to the scroll of the nav passively, and stops when unmounted', () => {
		stubResizeObserver();
		const add = vi.spyOn(HTMLElement.prototype, 'addEventListener');
		const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
		const { unmount } = render(shell(tabs(8, 0), 'More'));
		// React also attaches its own scroll listeners to elements; the one of the tabs is the passive one.
		const scrollAdds = add.mock.calls.filter(([type, , options]) => type === 'scroll' && typeof options === 'object' && (options as AddEventListenerOptions).passive === true);
		expect(scrollAdds).toHaveLength(1);
		unmount();
		const removed = remove.mock.calls.filter(([type]) => type === 'scroll').map(([, handler]) => handler);
		expect(removed).toContain(scrollAdds[0]![1]);
	});

	it('offers the overflow control for a single cut-off tab', () => {
		// 4 tabs of 100px in a 300px box: only the last one is cut off.
		render(shell(tabs(4, 0), 'More'));
		const button = screen.getByRole('button', { name: /more/i });
		expect(button.textContent).toBe('More(1)');
		fireEvent.click(button);
		expect(within(screen.getByRole('navigation', { name: 'More' })).getAllByRole('link').map((a) => a.textContent)).toEqual(['Tab 3']);
	});

	it('hides the count of cut-off tabs from assistive technology (the label carries the meaning)', () => {
		render(shell(tabs(8, 0), 'More'));
		expect(screen.getByText('(5)')).toHaveAttribute('aria-hidden', 'true');
	});

	it('uses the accent of a current tab, the theme accent when it has none', () => {
		const items: ShellItem[] = [
			{ id: 'a', label: 'A', href: '/a', current: 'true', accent: '#e11d48' },
			{ id: 'b', label: 'B', href: '/b', current: 'true' },
			{ id: 'c', label: 'C', href: '/c' },
		];
		render(shell(items));
		const style = (name: string) => screen.getByRole('link', { name }).getAttribute('style') ?? '';
		expect(style('A')).toContain('#e11d48');
		expect(style('B')).toContain('var(--color-primary-solid)');
		expect(style('C')).toBe('');
	});

	it('does not throw when no tab is current, nor when a link renders more than one element', () => {
		expect(() => render(shell(tabs(4, -1), 'More'))).not.toThrow();
	});

	it('shows no overflow control when the host renders several elements per tab (tabs cannot be matched to boxes)', () => {
		const items = tabs(8, 0);
		render(
			<AppShell
				brand="app"
				tabs={items}
				tabsLabel="Sections"
				menu={MENU}
				moreLabel="More"
				renderLink={(props) => (
					<>
						<a href={props.href} className={props.className}>
							{props.children}
						</a>
						<span>extra</span>
					</>
				)}
			>
				<p>content</p>
			</AppShell>,
		);
		expect(screen.queryByRole('button', { name: /more/i })).toBeNull();
	});

	it('closes the panel when the control goes away, and does not reopen it when it comes back', () => {
		const { rerender } = render(shell(tabs(8, 0), 'More'));
		fireEvent.click(screen.getByRole('button', { name: /more/i }));
		expect(screen.getByRole('navigation', { name: 'More' })).toBeInTheDocument();

		rerender(shell(tabs(2, 0), 'More'));
		expect(screen.queryByRole('button', { name: /more/i })).toBeNull();

		rerender(shell(tabs(8, 0), 'More'));
		const button = screen.getByRole('button', { name: /more/i });
		expect(button.getAttribute('aria-expanded')).toBe('false');
		expect(screen.queryByRole('navigation', { name: 'More' })).toBeNull();
	});

	it('listens to the document only while the panel is open', () => {
		const add = vi.spyOn(document, 'addEventListener');
		const remove = vi.spyOn(document, 'removeEventListener');
		render(shell(tabs(8, 0), 'More'));
		const countOf = (spy: typeof add, type: string) => spy.mock.calls.filter(([t]) => t === type).length;
		expect(countOf(add, 'keydown')).toBe(0);

		fireEvent.click(screen.getByRole('button', { name: /more/i }));
		expect(countOf(add, 'keydown')).toBe(1);
		expect(countOf(add, 'pointerdown')).toBe(1);

		fireEvent.keyDown(document, { key: 'Escape' });
		expect(countOf(remove, 'keydown')).toBe(1);
		expect(countOf(remove, 'pointerdown')).toBe(1);
	});

	it('ignores other keys while the panel is open', () => {
		render(shell(tabs(8, 0), 'More'));
		const button = screen.getByRole('button', { name: /more/i });
		fireEvent.click(button);
		fireEvent.keyDown(document, { key: 'a' });
		expect(button.getAttribute('aria-expanded')).toBe('true');
	});
});
