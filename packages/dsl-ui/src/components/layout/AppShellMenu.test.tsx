import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, MENU_VARIANT_AB_OPTIONS, type AppShellProps, type ShellMenu, type ShellMenuVariant } from './AppShell.js';
import { normalizeMenuEntries } from './ShellSideMenu.js';

const TABS = [{ id: 'queue', label: 'Queue', href: '/queue', current: 'true' as const }];

const MENU: ShellMenu = {
	title: 'Queue',
	label: 'Queue pages',
	items: [
		{ id: 'overview', label: 'Overview', href: '/', icon: <i data-testid="icon-overview" />, current: 'page' },
		{ id: 'jobs', label: 'Jobs', href: '/jobs' },
		{ kind: 'separator', id: 's1', label: 'Admin' },
		{ id: 'workers', label: 'Workers', href: '/workers' },
	],
};

const shell = (props: Partial<AppShellProps> = {}) =>
	render(
		<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} {...props}>
			<p>content</p>
		</AppShell>,
	);

const VAR = '--app-shell-menu-width';
const menuWidth = () => document.documentElement.style.getPropertyValue(VAR);
const aside = () => screen.getByTestId('shell-menu');
const scroller = () => aside().querySelector<HTMLElement>('[data-menu-scroller]')!;
const nav = () => screen.getByRole('navigation', { name: 'Queue pages' });
const classes = (el: Element) => el.className.split(/\s+/);
const STORAGE_KEY = 'app-shell.menu-width';
const OLD_STORAGE_KEY = 'app-shell.menu';

const VARIANTS: readonly ShellMenuVariant[] = ['classic', 'narrow', 'wide', 'fluid', 'fit', 'resizable'];
// `fit` measures the DOM: with no layout (jsdom) the longest entry is 0px wide, so it sits on its 10rem minimum.
const WIDTHS: Record<ShellMenuVariant, string> = { classic: '15rem', narrow: '12rem', wide: '19rem', fluid: 'clamp(12rem, 16vw, 22rem)', fit: '10rem', resizable: '15rem' };
const RESIZE_LABEL = 'Resize the menu';

// jsdom has no PointerEvent: without one fireEvent.pointer* sends a plain Event with no pointerId, button or clientX.
class FakePointerEvent extends MouseEvent {
	readonly pointerId: number;
	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 0;
	}
}

beforeEach(() => {
	vi.stubGlobal('PointerEvent', FakePointerEvent);
	document.documentElement.style.fontSize = '16px';
	// jsdom has no pointer capture.
	Element.prototype.setPointerCapture = vi.fn();
	Element.prototype.releasePointerCapture = vi.fn();
	Element.prototype.hasPointerCapture = vi.fn(() => true);
});

afterEach(() => {
	document.documentElement.style.removeProperty(VAR);
	document.documentElement.style.removeProperty('--app-shell-bar-height');
	document.documentElement.style.removeProperty('font-size');
	for (const name of ['scrollIntoView', 'setPointerCapture', 'releasePointerCapture', 'hasPointerCapture']) {
		// @ts-expect-error removing the stub added by a test
		delete Element.prototype[name];
	}
	// @ts-expect-error removing the stub added by a test
	delete document.fonts;
});

describe('normalizeMenuEntries', () => {
	const link = (id: string) => ({ id, label: id, href: `/${id}` });
	const sep = (id: string, label?: string) => ({ kind: 'separator' as const, id, label });
	const ids = (entries: ReturnType<typeof normalizeMenuEntries>) => entries.map((e) => e.id);

	it('drops leading, trailing and consecutive separators', () => {
		expect(ids(normalizeMenuEntries([sep('s0'), link('a'), sep('s1'), sep('s2'), link('b'), sep('s3')]))).toEqual(['a', 's1', 'b']);
	});

	it('keeps the labelled one of two consecutive separators, whichever comes first', () => {
		expect(ids(normalizeMenuEntries([link('a'), sep('s1', 'Admin'), sep('s2'), link('b')]))).toEqual(['a', 's1', 'b']);
		expect(ids(normalizeMenuEntries([link('a'), sep('s1'), sep('s2', 'Admin'), link('b')]))).toEqual(['a', 's2', 'b']);
	});

	it('gives nothing but separators as an empty list, and an empty list as empty', () => {
		expect(normalizeMenuEntries([sep('s1'), sep('s2')])).toEqual([]);
		expect(normalizeMenuEntries([])).toEqual([]);
	});

	it('treats an entry with kind "link" like one without kind', () => {
		expect(ids(normalizeMenuEntries([{ ...link('a'), kind: 'link' as const }, sep('s1'), link('b')]))).toEqual(['a', 's1', 'b']);
	});

	it('does not mutate its input', () => {
		const input = [sep('s0'), link('a')];
		normalizeMenuEntries(input);
		expect(input).toHaveLength(2);
	});
});

describe('A/B options of the variants', () => {
	it('has a label and a one-line hint for exactly the allowed values', () => {
		expect(Object.keys(MENU_VARIANT_AB_OPTIONS).sort()).toEqual([...VARIANTS].sort());
		for (const variant of VARIANTS) {
			const { label, hint } = MENU_VARIANT_AB_OPTIONS[variant];
			expect(label.trim()).not.toBe('');
			expect(hint.trim()).not.toBe('');
			expect(hint).not.toContain('\n');
		}
	});

	it.each([
		['classic', ['15rem']],
		['narrow', ['12rem']],
		['wide', ['19rem']],
		['fluid', ['12rem', '16vw', '22rem']],
		['fit', ['10rem', '24rem']],
		['resizable', ['15rem', '3.5rem', '6rem', '60%', '20rem']],
	] as const)('the hint of %s states its width', (variant, parts) => {
		for (const part of parts) {
			expect(MENU_VARIANT_AB_OPTIONS[variant].hint).toContain(part);
		}
	});
});

describe('menuVariant (default and unknown values)', () => {
	it('is the same with no value and with "classic": 15rem, labels shown', () => {
		shell();
		expect(menuWidth()).toBe('15rem');
		expect(aside().style.width).toBe('var(--app-shell-menu-width)');
		expect(screen.getByRole('link', { name: 'Overview' })).toHaveTextContent('Overview');
	});

	it('an unknown value warns once with the allowed values and behaves as classic', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		shell({ menuVariant: 'sideways' as never });
		expect(menuWidth()).toBe('15rem');
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]![0]);
		expect(message).toContain('menuVariant');
		expect(message).toContain('sideways');
		expect(message).toContain('classic, narrow, wide, fluid, fit, resizable');
	});

	it.each(['compact', 'rail', 'toggle', 'drawer', 'accent', 'slim', 'cards', 'tiles', 'flyout', 'floating', 'tree', 'peek'])('the removed value "%s" warns once and behaves as classic', (old) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		shell({ menuVariant: old as never });
		expect(menuWidth()).toBe('15rem');
		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0]![0])).toContain(old);
		expect(screen.getByTestId('shell-menu')).toBeInTheDocument();
		expect(screen.queryByRole('separator', { name: RESIZE_LABEL })).toBeNull();
	});

	it('the removed "[" shortcut and "app-shell.menu" storage are neither read nor written, whatever the variant', () => {
		localStorage.setItem(OLD_STORAGE_KEY, 'folded');
		const getItem = vi.spyOn(Storage.prototype, 'getItem');
		const setItem = vi.spyOn(Storage.prototype, 'setItem');
		for (const menuVariant of VARIANTS) {
			const { unmount } = shell({ menuVariant, resizeLabel: RESIZE_LABEL });
			fireEvent.keyDown(document.body, { key: '[' });
			expect(menuWidth()).toBe(WIDTHS[menuVariant]);
			unmount();
		}
		expect(getItem).not.toHaveBeenCalledWith(OLD_STORAGE_KEY);
		expect(setItem).not.toHaveBeenCalledWith(OLD_STORAGE_KEY, expect.anything());
		expect(localStorage.getItem(OLD_STORAGE_KEY)).toBe('folded');
	});

	it('has no description line: ShellItem.description is gone', () => {
		shell({ menu: { ...MENU, items: [{ id: 'jobs', label: 'Jobs', href: '/jobs', description: 'Background jobs' } as never] } });
		expect(screen.getByRole('link', { name: 'Jobs' })).not.toHaveTextContent('Background jobs');
	});
});

describe.each(VARIANTS)('menuVariant %s (what every variant keeps)', (menuVariant) => {
	const mount = (props: Partial<AppShellProps> = {}) => shell({ menuVariant, resizeLabel: RESIZE_LABEL, ...props });

	it('publishes its width on the document root and on the shell root', () => {
		const { container } = mount();
		expect(menuWidth()).toBe(WIDTHS[menuVariant]);
		expect((container.firstElementChild as HTMLElement).style.getPropertyValue(VAR)).toBe(WIDTHS[menuVariant]);
		expect(aside().style.width).toBe('var(--app-shell-menu-width)');
	});

	it('removes the variable from the document root when the shell unmounts', () => {
		const { unmount } = mount();
		unmount();
		expect(menuWidth()).toBe('');
	});

	it('has no CSS transition on its width, on the variable, or on the shell root', () => {
		const { container } = mount();
		for (const el of [aside(), scroller(), container.firstElementChild!]) {
			expect(el.className, el.outerHTML.slice(0, 80)).not.toMatch(/transition-\[?[^ ]*width|transition-all|(^|\s)transition(\s|$)/);
			expect((el as HTMLElement).style.transition).toBe('');
		}
		expect(document.documentElement.style.transition).toBe('');
	});

	it('is sticky under the bar and scrolls on its own', () => {
		mount();
		expect(aside().style.top).toBe('var(--app-shell-bar-height)');
		expect(classes(aside())).toEqual(expect.arrayContaining(['sticky', 'self-start']));
		expect(classes(scroller())).toContain('overflow-y-auto');
		expect(scroller().contains(nav())).toBe(true);
	});

	it('names the menu: a heading and a navigation, links in DOM order, the current one marked', () => {
		mount();
		expect(screen.getByRole('heading', { name: 'Queue' })).toBeInTheDocument();
		const links = within(nav()).getAllByRole('link');
		expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/jobs', '/workers']);
		expect(links.map((l) => l.getAttribute('aria-current'))).toEqual(['page', null, null]);
		for (const name of ['Overview', 'Jobs', 'Workers']) {
			expect(screen.getByRole('link', { name })).toBeInTheDocument();
		}
		expect(screen.getByTestId('icon-overview')).toBeInTheDocument();
	});

	it('looks like classic: the same classes on the aside content, the nav, the links and the separators', () => {
		mount({ menu: { ...MENU, items: [...MENU.items, { kind: 'separator', id: 's2' }, { id: 'about', label: 'About', href: '/about' }] } });
		const mine = scroller();
		const html = (root: Element) => Array.from(root.querySelectorAll('a, nav, [role="separator"], [role="separator"] > div')).map((el) => `${el.tagName}.${el.className}`);
		const here = html(mine);
		const view = shell({ menuVariant: 'classic', menu: { ...MENU, items: [...MENU.items, { kind: 'separator', id: 's2' }, { id: 'about', label: 'About', href: '/about' }] } });
		const reference = html(view.container.querySelector('[data-menu-scroller]')!);
		expect(here).toEqual(reference);
		expect(classes(mine)).toEqual(classes(view.container.querySelector('[data-menu-scroller]')!));
	});

	it('draws a labelled and an unlabelled separator: named by its label or by nothing, never focusable', () => {
		mount({ menu: { ...MENU, items: [...MENU.items, { kind: 'separator', id: 's2' }, { id: 'about', label: 'About', href: '/about' }] } });
		const separators = within(nav()).getAllByRole('separator');
		expect(separators).toHaveLength(2);
		expect(separators[0]).toHaveAttribute('aria-label', 'Admin');
		expect(separators[0]).toHaveTextContent('Admin');
		expect(separators[1]).not.toHaveAttribute('aria-label');
		for (const separator of separators) {
			expect(separator.hasAttribute('tabindex')).toBe(false);
			expect(separator.querySelector('a, button')).toBeNull();
		}
		expect(separators[1]!.textContent).toBe('');
	});

	it('moves between links with the arrows, Home and End, skipping separators, and stops at the ends', () => {
		mount();
		const links = within(nav()).getAllByRole('link');
		links[0]!.focus();
		fireEvent.keyDown(links[0]!, { key: 'ArrowUp' });
		expect(document.activeElement).toBe(links[0]);
		fireEvent.keyDown(links[0]!, { key: 'End' });
		expect(document.activeElement).toBe(links[2]);
		fireEvent.keyDown(links[2]!, { key: 'ArrowDown' });
		expect(document.activeElement).toBe(links[2]);
		fireEvent.keyDown(links[2]!, { key: 'ArrowUp' });
		expect(document.activeElement).toBe(links[1]);
		fireEvent.keyDown(links[1]!, { key: 'ArrowDown' });
		expect(document.activeElement).toBe(links[2]);
		fireEvent.keyDown(links[2]!, { key: 'Home' });
		expect(document.activeElement).toBe(links[0]);
	});

	it('gives every link a visible focus ring and respects reduced motion on everything that transitions', () => {
		mount();
		for (const link of within(nav()).getAllByRole('link')) {
			expect(link.className).toContain('focus-visible:outline');
		}
		for (const el of Array.from(aside().querySelectorAll('[class*="transition"]'))) {
			expect(classes(el), el.outerHTML.slice(0, 120)).toContain('motion-reduce:transition-none');
		}
	});

	it('uses theme tokens only: no dark: variant anywhere in the menu', () => {
		mount();
		expect(aside().outerHTML).not.toMatch(/(^|[\s"'])dark:/);
	});

	it('brings the current entry into view', () => {
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		mount();
		expect(scrollIntoView).toHaveBeenCalledTimes(1);
		expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('link', { name: /Overview/ }));
		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
	});

	it('shows a handle only when it is the resizable one', () => {
		mount();
		expect(screen.queryByRole('separator', { name: RESIZE_LABEL }) !== null).toBe(menuVariant === 'resizable');
	});
});

describe('fixed widths', () => {
	it.each([
		['classic', '15rem'],
		['narrow', '12rem'],
		['wide', '19rem'],
		['fluid', 'clamp(12rem, 16vw, 22rem)'],
	] as const)('%s publishes %s and never reads or writes a width in storage', (menuVariant, width) => {
		const getItem = vi.spyOn(Storage.prototype, 'getItem');
		const setItem = vi.spyOn(Storage.prototype, 'setItem');
		localStorage.setItem(STORAGE_KEY, '20');
		setItem.mockClear();
		shell({ menuVariant });
		expect(menuWidth()).toBe(width);
		expect(getItem).not.toHaveBeenCalled();
		expect(setItem).not.toHaveBeenCalled();
		expect(localStorage.getItem(STORAGE_KEY)).toBe('20');
	});
});

describe('menuVariant fit', () => {
	// Fake layout: a label is 8px per character, starts 40px into its link (padding and icon), the link has 12px of right
	// padding, the menu chrome (border, padding) is 25px, plus 1px for rounding: 241px aside around a 216px nav.
	let pxPerChar = 8;
	beforeEach(() => {
		pxPerChar = 8;
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
			const left = this.hasAttribute('data-menu-label') ? 40 : 0;
			const width = this.tagName === 'NAV' ? 216 : 0;
			return { x: left, y: 0, left, top: 0, right: left + width, bottom: 0, width, height: 0, toJSON: () => ({}) };
		});
		vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
			return this.hasAttribute('data-menu-label') ? (this.textContent ?? '').length * pxPerChar : 0;
		});
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
			return this.dataset.testid === 'shell-menu' ? 241 : 0;
		});
		const real = window.getComputedStyle.bind(window);
		vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
			const style = real(el, pseudo);
			return el.tagName === 'A' ? ({ ...style, paddingRight: '12px', fontSize: '16px' } as CSSStyleDeclaration) : style;
		});
	});

	const menuOf = (...labels: string[]): ShellMenu => ({ title: 'Queue', label: 'Queue pages', items: labels.map((label, i) => ({ id: `e${i}`, label, href: `/e${i}`, ...(i === 0 ? { current: 'page' as const } : {}) })) });

	it('is as wide as the longest entry: label, icon and padding, plus the menu chrome (rounded up to 0.01rem)', () => {
		// 24 chars: 40 + 192 + 12 = 244, + 25 chrome + 1 rounding = 270px = 16.875rem.
		shell({ menuVariant: 'fit', menu: menuOf('Short', 'A rather long page title') });
		expect(menuWidth()).toBe('16.88rem');
	});

	it('sets the value on the shell root too, and the menu follows the variable', () => {
		const { container } = shell({ menuVariant: 'fit', menu: menuOf('Short', 'A rather long page title') });
		expect((container.firstElementChild as HTMLElement).style.getPropertyValue(VAR)).toBe('16.88rem');
		expect(aside().style.width).toBe('var(--app-shell-menu-width)');
	});

	it('never goes under 10rem', () => {
		// 5 chars: 40 + 40 + 12 + 25 = 117px.
		shell({ menuVariant: 'fit', menu: menuOf('Short') });
		expect(menuWidth()).toBe('10rem');
	});

	it('never goes over 24rem', () => {
		shell({ menuVariant: 'fit', menu: menuOf('x'.repeat(100), 'Short') });
		expect(menuWidth()).toBe('24rem');
	});

	it('keeps a width just above the minimum', () => {
		// 11 chars: 40 + 88 + 12 + 25 + 1 = 166px = 10.375rem.
		shell({ menuVariant: 'fit', menu: menuOf('x'.repeat(11)) });
		expect(menuWidth()).toBe('10.38rem');
	});

	it('is recomputed when the entries change', () => {
		const view = shell({ menuVariant: 'fit', menu: menuOf('Short', 'A rather long page title') });
		expect(menuWidth()).toBe('16.88rem');
		view.rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={menuOf('Short', 'A rather long page title, much longer than before') } menuVariant="fit">
				<p>content</p>
			</AppShell>,
		);
		// 50 chars: 40 + 400 + 12 + 25 = 477px = 29.8rem, capped.
		expect(menuWidth()).toBe('24rem');
		view.rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={menuOf('Short')} menuVariant="fit">
				<p>content</p>
			</AppShell>,
		);
		expect(menuWidth()).toBe('10rem');
	});

	it('is recomputed when only a label changes, and ignores separators', () => {
		const view = shell({ menuVariant: 'fit', menu: { ...menuOf('Short'), items: [{ id: 'a', label: 'Short', href: '/a' }, { kind: 'separator', id: 's', label: 'A caption that is longer than any entry of the menu' }, { id: 'b', label: 'Other', href: '/b' }] } });
		expect(menuWidth()).toBe('10rem');
		view.rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={menuOf('A rather long page title')} menuVariant="fit">
				<p>content</p>
			</AppShell>,
		);
		expect(menuWidth()).toBe('16.88rem');
	});

	it('is recomputed when the window is resized (zoom, root font size)', () => {
		shell({ menuVariant: 'fit', menu: menuOf('A rather long page title') });
		expect(menuWidth()).toBe('16.88rem');
		document.documentElement.style.fontSize = '20px';
		act(() => {
			window.dispatchEvent(new Event('resize'));
		});
		// 270px / 20px = 13.5rem.
		expect(menuWidth()).toBe('13.5rem');
	});

	it('is recomputed when a web font finishes loading, and when the fonts are ready', async () => {
		let onDone: (() => void) | undefined;
		let ready!: () => void;
		Object.defineProperty(document, 'fonts', {
			configurable: true,
			value: {
				ready: new Promise<void>((resolve) => {
					ready = resolve;
				}),
				addEventListener: (type: string, listener: () => void) => {
					if (type === 'loadingdone') onDone = listener;
				},
				removeEventListener: vi.fn(),
			},
		});
		shell({ menuVariant: 'fit', menu: menuOf('A rather long page title') });
		expect(menuWidth()).toBe('16.88rem');
		// The fallback font was narrower than the web font.
		pxPerChar = 10;
		act(() => onDone!());
		// 40 + 240 + 12 + 25 + 1 = 318px.
		expect(menuWidth()).toBe('19.88rem');
		pxPerChar = 6;
		await act(async () => {
			ready();
			await Promise.resolve();
		});
		// 40 + 144 + 12 + 25 + 1 = 222px.
		expect(menuWidth()).toBe('13.88rem');
	});

	it('stops listening when it unmounts: every listener added to the window is removed', () => {
		const add = vi.spyOn(window, 'addEventListener');
		const remove = vi.spyOn(window, 'removeEventListener');
		const view = shell({ menuVariant: 'fit', menu: menuOf('A rather long page title') });
		const added = add.mock.calls.filter(([type]) => type === 'resize').map(([, listener]) => listener);
		expect(added.length).toBeGreaterThanOrEqual(2);
		view.unmount();
		const removed = remove.mock.calls.filter(([type]) => type === 'resize').map(([, listener]) => listener);
		for (const listener of added) {
			expect(removed).toContain(listener);
		}
	});

	it('does not measure in the other variants: the width ignores the entries, whatever happens', () => {
		const view = shell({ menuVariant: 'wide', menu: menuOf('A rather long page title') });
		expect(menuWidth()).toBe('19rem');
		view.rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={menuOf('x'.repeat(100))} menuVariant="wide">
				<p>content</p>
			</AppShell>,
		);
		act(() => {
			window.dispatchEvent(new Event('resize'));
		});
		expect(menuWidth()).toBe('19rem');
	});

	it('switches to and from fit at run time', () => {
		const view = shell({ menuVariant: 'classic', menu: menuOf('A rather long page title') });
		expect(menuWidth()).toBe('15rem');
		view.rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={menuOf('A rather long page title')} menuVariant="fit">
				<p>content</p>
			</AppShell>,
		);
		expect(menuWidth()).toBe('16.88rem');
		view.rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={menuOf('A rather long page title')} menuVariant="wide">
				<p>content</p>
			</AppShell>,
		);
		expect(menuWidth()).toBe('19rem');
	});
});

describe('truncated labels', () => {
	const LONG = 'A rather long page title';
	const longMenu: ShellMenu = { title: 'Queue', label: 'Queue pages', items: [{ id: 'a', label: LONG, href: '/a', current: 'page' }, { id: 'b', label: 'Short', href: '/b' }] };

	// A label is 10px per character; the room it has is the menu width in rem (16px) minus 90px of padding and icon.
	// `room` replaces the computed room when a test sets it (a window resize changes it with no render).
	let room: number | undefined;
	beforeEach(() => {
		room = undefined;
		vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
			return this.hasAttribute('data-menu-label') ? (this.textContent ?? '').length * 10 : 0;
		});
		vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
			if (!this.hasAttribute('data-menu-label')) return 0;
			if (room !== undefined) return room;
			// The variable as CSS would inherit it: from the nearest ancestor that declares it.
			let node: HTMLElement | null = this as HTMLElement;
			while (node && node.style.getPropertyValue(VAR) === '') node = node.parentElement;
			return parseFloat(node?.style.getPropertyValue(VAR) ?? '') * 16 - 90;
		});
	});

	const labelOf = (name: string) => screen.getByRole('link', { name }).querySelector('[data-menu-label]')!;

	it('gives an entry wider than the menu a title with its whole label, and the others none', () => {
		// 15rem: 150px of room, the long label needs 240.
		shell({ menu: longMenu });
		expect(labelOf(LONG)).toHaveAttribute('title', LONG);
		expect(labelOf('Short')).not.toHaveAttribute('title');
		expect(classes(labelOf(LONG))).toContain('truncate');
	});

	it('is exactly at the limit when the label fills the room: no title', () => {
		// 150px of room, 15 chars = 150px.
		shell({ menu: { ...longMenu, items: [{ id: 'a', label: 'x'.repeat(15), href: '/a' }] } });
		expect(labelOf('x'.repeat(15))).not.toHaveAttribute('title');
	});

	it('tolerates 1px of rounding (scrollWidth and clientWidth are rounded apart) but not 2px', () => {
		const label = 'x'.repeat(16);
		room = 159;
		const first = shell({ menu: { ...longMenu, items: [{ id: 'a', label, href: '/a' }] } });
		expect(labelOf(label)).not.toHaveAttribute('title');
		first.unmount();
		room = 158;
		shell({ menu: { ...longMenu, items: [{ id: 'a', label, href: '/a' }] } });
		expect(labelOf(label)).toHaveAttribute('title', label);
	});

	it('follows the width: a wider menu removes the title, a narrower one adds it', () => {
		const view = shell({ menu: longMenu, menuVariant: 'narrow' });
		expect(labelOf(LONG)).toHaveAttribute('title', LONG);
		view.rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={longMenu} menuVariant="wide">
				<p>content</p>
			</AppShell>,
		);
		// 19rem: 214px of room, still short of 240.
		expect(labelOf(LONG)).toHaveAttribute('title', LONG);
		view.rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={{ ...longMenu, items: [{ id: 'a', label: 'x'.repeat(21), href: '/a' }] }} menuVariant="wide">
				<p>content</p>
			</AppShell>,
		);
		expect(labelOf('x'.repeat(21))).not.toHaveAttribute('title');
	});

	it('is re-evaluated when the window is resized (a fluid menu changes width without any render)', () => {
		room = 100;
		shell({ menu: longMenu, menuVariant: 'fluid' });
		expect(labelOf(LONG)).toHaveAttribute('title', LONG);
		room = 300;
		act(() => {
			window.dispatchEvent(new Event('resize'));
		});
		expect(labelOf(LONG)).not.toHaveAttribute('title');
		room = 100;
		act(() => {
			window.dispatchEvent(new Event('resize'));
		});
		expect(labelOf(LONG)).toHaveAttribute('title', LONG);
	});

	it('stops listening to the window when it unmounts', () => {
		const remove = vi.spyOn(window, 'removeEventListener');
		shell({ menu: longMenu }).unmount();
		expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
	});
});

describe('menuVariant resizable', () => {
	const handle = () => screen.getByRole('separator', { name: RESIZE_LABEL });
	const mount = (props: Partial<AppShellProps> = {}) => shell({ menuVariant: 'resizable', resizeLabel: RESIZE_LABEL, ...props });
	const shellRoot = (container: HTMLElement) => container.firstElementChild as HTMLElement;
	// 16px per rem.
	const drag = (from: number, to: number, pointerId = 7) => {
		fireEvent.pointerDown(handle(), { pointerId, clientX: from, button: 0 });
		fireEvent.pointerMove(handle(), { pointerId, clientX: to });
	};

	describe('the handle', () => {
		it('is a focusable vertical separator with its value, bounds and the host label', () => {
			mount();
			expect(menuWidth()).toBe('15rem');
			expect(handle()).toHaveAttribute('aria-orientation', 'vertical');
			expect(handle()).toHaveAttribute('aria-valuenow', '15');
			expect(handle()).toHaveAttribute('aria-valuemin', '3.5');
			// 1024px window: 60% is 38.4rem, the window minus 20rem of content is 44rem.
			expect(handle()).toHaveAttribute('aria-valuemax', '38.4');
			expect(handle()).toHaveAttribute('aria-valuetext', '15rem');
			expect(handle()).toHaveAttribute('tabindex', '0');
		});

		it('sits outside the entries, on the right edge, with a col-resize cursor and a 6px hit area', () => {
			mount();
			expect(nav().contains(handle())).toBe(false);
			expect(aside().contains(handle())).toBe(true);
			expect(scroller().contains(handle())).toBe(false);
			expect(classes(handle())).toEqual(expect.arrayContaining(['cursor-col-resize', 'right-0', 'w-1.5', 'touch-none']));
			// Not an entry separator: the entries' separators stay inside the nav.
			expect(within(nav()).getAllByRole('separator')).toHaveLength(1);
		});

		it('shows a line on hover and on focus only', () => {
			mount();
			const line = handle().firstElementChild!;
			expect(classes(line)).toEqual(expect.arrayContaining(['group-hover:bg-primary', 'group-focus-visible:bg-primary']));
			expect(classes(line)).not.toContain('bg-primary');
			expect(line).toHaveAttribute('aria-hidden', 'true');
		});

		it('is accessible by the host label; without it, it takes the menu label and says what to add', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			shell({ menuVariant: 'resizable' });
			expect(screen.getByRole('separator', { name: 'Queue pages' })).toHaveAttribute('aria-valuenow', '15');
			expect(warn).toHaveBeenCalledTimes(1);
			const message = String(warn.mock.calls[0]![0]);
			expect(message).toContain('resizeLabel');
			expect(message).toContain('menuVariant');
		});

		it('says nothing about the label when it is given, nor when the variant has no handle', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			mount();
			shell({ menuVariant: 'classic' });
			expect(warn).not.toHaveBeenCalled();
		});

		it('does not take an empty label for a label', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			shell({ menuVariant: 'resizable', resizeLabel: '' });
			expect(warn).toHaveBeenCalledTimes(1);
			expect(screen.getByRole('separator', { name: 'Queue pages' })).toBeInTheDocument();
		});
	});

	describe('dragging with the mouse', () => {
		it('captures the pointer on press, and follows it live on the document root and on the shell root', () => {
			const { container } = mount();
			fireEvent.pointerDown(handle(), { pointerId: 7, clientX: 240, button: 0 });
			expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(7);
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 320 });
			expect(menuWidth()).toBe('20rem');
			expect(shellRoot(container).style.getPropertyValue(VAR)).toBe('20rem');
			expect(aside().style.width).toBe('var(--app-shell-menu-width)');
			expect(handle()).toHaveAttribute('aria-valuenow', '20');
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 176 });
			expect(menuWidth()).toBe('11rem');
		});

		it('measures from where it was pressed, not from the pointer position: no jump on press', () => {
			mount();
			fireEvent.pointerDown(handle(), { pointerId: 7, clientX: 500, button: 0 });
			expect(menuWidth()).toBe('15rem');
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 516 });
			expect(menuWidth()).toBe('16rem');
		});

		it('uses the root font size for the rem', () => {
			document.documentElement.style.fontSize = '20px';
			mount();
			drag(300, 340);
			expect(menuWidth()).toBe('17rem');
		});

		it('stays between 3.5rem and 38.4rem (1024px window), exactly at the bounds', () => {
			mount();
			fireEvent.pointerDown(handle(), { pointerId: 7, clientX: 240, button: 0 });
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 240 + 23.4 * 16 });
			expect(menuWidth()).toBe('38.4rem');
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 240 + 23.4 * 16 + 500 });
			expect(menuWidth()).toBe('38.4rem');
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 240 - 11.5 * 16 });
			expect(menuWidth()).toBe('3.5rem');
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: -900 });
			expect(menuWidth()).toBe('3.5rem');
		});

		it('writes the storage once, when the drag ends, not on every move', () => {
			const setItem = vi.spyOn(Storage.prototype, 'setItem');
			mount();
			drag(240, 320);
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 336 });
			expect(setItem).not.toHaveBeenCalled();
			fireEvent.pointerUp(handle(), { pointerId: 7, clientX: 336 });
			expect(setItem).toHaveBeenCalledTimes(1);
			expect(localStorage.getItem(STORAGE_KEY)).toBe('21');
			expect(menuWidth()).toBe('21rem');
		});

		it('ignores moves once released, and moves of another pointer', () => {
			mount();
			drag(240, 320);
			fireEvent.pointerMove(handle(), { pointerId: 99, clientX: 700 });
			expect(menuWidth()).toBe('20rem');
			fireEvent.pointerUp(handle(), { pointerId: 7, clientX: 320 });
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 700 });
			expect(menuWidth()).toBe('20rem');
		});

		it('ignores moves that were never preceded by a press', () => {
			mount();
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 700 });
			expect(menuWidth()).toBe('15rem');
		});

		it('ignores a press with another button than the main one, and does not capture', () => {
			mount();
			fireEvent.pointerDown(handle(), { pointerId: 7, clientX: 240, button: 2 });
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 400 });
			expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();
			expect(menuWidth()).toBe('15rem');
		});

		it('ends and keeps the width when the browser cancels the pointer or takes the capture away', () => {
			mount();
			drag(240, 320);
			fireEvent.pointerCancel(handle(), { pointerId: 7 });
			expect(localStorage.getItem(STORAGE_KEY)).toBe('20');
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 700 });
			expect(menuWidth()).toBe('20rem');
			drag(320, 352);
			fireEvent.lostPointerCapture(handle(), { pointerId: 7 });
			expect(localStorage.getItem(STORAGE_KEY)).toBe('22');
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 700 });
			expect(menuWidth()).toBe('22rem');
		});

		it('releases the capture on release', () => {
			mount();
			drag(240, 320);
			fireEvent.pointerUp(handle(), { pointerId: 7 });
			expect(Element.prototype.releasePointerCapture).toHaveBeenCalledWith(7);
		});

		it('marks the handle while dragging, for the line to stay visible under the pointer', () => {
			mount();
			expect(handle()).not.toHaveAttribute('data-dragging');
			drag(240, 320);
			expect(handle()).toHaveAttribute('data-dragging', 'true');
			fireEvent.pointerUp(handle(), { pointerId: 7 });
			expect(handle()).not.toHaveAttribute('data-dragging');
		});
	});

	describe('double-click', () => {
		it('resets to 15rem and forgets the stored width', () => {
			localStorage.setItem(STORAGE_KEY, '22');
			mount();
			expect(menuWidth()).toBe('22rem');
			fireEvent.doubleClick(handle());
			expect(menuWidth()).toBe('15rem');
			expect(handle()).toHaveAttribute('aria-valuenow', '15');
			expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		});
	});

	describe('keyboard', () => {
		const press = (key: string, init: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(handle(), { key, ...init });

		it('Left and Right move by 1rem, and the width is remembered each time', () => {
			mount();
			press('ArrowRight');
			expect(menuWidth()).toBe('16rem');
			expect(handle()).toHaveAttribute('aria-valuenow', '16');
			expect(localStorage.getItem(STORAGE_KEY)).toBe('16');
			press('ArrowLeft');
			press('ArrowLeft');
			expect(menuWidth()).toBe('14rem');
			expect(handle()).toHaveAttribute('aria-valuetext', '14rem');
			expect(localStorage.getItem(STORAGE_KEY)).toBe('14');
		});

		it('Home goes to 3.5rem and End to 38.4rem; the arrows stop there', () => {
			mount();
			press('Home');
			expect(menuWidth()).toBe('3.5rem');
			press('ArrowLeft');
			expect(menuWidth()).toBe('3.5rem');
			press('End');
			expect(menuWidth()).toBe('38.4rem');
			press('ArrowRight');
			expect(menuWidth()).toBe('38.4rem');
			expect(handle()).toHaveAttribute('aria-valuenow', '38.4');
		});

		it('steps from a fractional width and clamps instead of overshooting', () => {
			localStorage.setItem(STORAGE_KEY, '38');
			mount();
			press('ArrowRight');
			expect(menuWidth()).toBe('38.4rem');
		});

		it('prevents the default of the keys it handles only, and ignores them with a modifier', () => {
			mount();
			expect(press('ArrowRight')).toBe(false);
			expect(press('Home')).toBe(false);
			expect(press('End')).toBe(false);
			expect(press('a')).toBe(true);
			expect(press('ArrowUp')).toBe(true);
			expect(press('ArrowRight', { ctrlKey: true })).toBe(true);
			expect(press('ArrowRight', { altKey: true })).toBe(true);
			expect(press('ArrowRight', { metaKey: true })).toBe(true);
			// Only the Home and End before them moved it (End last, to 38.4rem): none of the ignored presses did.
			expect(menuWidth()).toBe('38.4rem');
		});

		it('is reachable with Tab: a tab stop, not inside the entries', () => {
			mount();
			handle().focus();
			expect(document.activeElement).toBe(handle());
			// An arrow in the list of links is not caught by the handle.
			const links = within(nav()).getAllByRole('link');
			links[0]!.focus();
			fireEvent.keyDown(links[0]!, { key: 'ArrowRight' });
			expect(menuWidth()).toBe('15rem');
		});
	});

	describe('remembered width', () => {
		it('starts at the stored width and survives a reload', () => {
			const first = mount();
			drag(240, 336);
			fireEvent.pointerUp(handle(), { pointerId: 7 });
			first.unmount();
			mount();
			expect(menuWidth()).toBe('21rem');
			expect(handle()).toHaveAttribute('aria-valuenow', '21');
		});

		it.each(['15', '10', '28', '17.5', '0010', '12.25', '3.5', '9.99', '28.01'])('accepts "%s"', (stored) => {
			localStorage.setItem(STORAGE_KEY, stored);
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			mount();
			expect(menuWidth()).toBe(`${Number(stored)}rem`);
			expect(warn).not.toHaveBeenCalled();
		});

		it.each(['abc', '', ' ', '0', '-12', 'NaN', 'Infinity', '15rem', '1e1', '15px', '0x10', '[15]', ' 15', '15 '])('ignores the garbage "%s" with a warning that names the key and the fix, and uses 15rem', (stored) => {
			localStorage.setItem(STORAGE_KEY, stored);
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			mount();
			expect(menuWidth()).toBe('15rem');
			expect(warn).toHaveBeenCalledTimes(1);
			const message = String(warn.mock.calls[0]![0]);
			expect(message).toContain(STORAGE_KEY);
			expect(message).toContain(`"${stored}"`);
			expect(message).toContain('number of rem');
			expect(message).toContain('17.5');
			// The bad value is left alone until the user changes the width.
			expect(localStorage.getItem(STORAGE_KEY)).toBe(stored);
		});

		it('replaces a garbage value as soon as the user sets a width', () => {
			localStorage.setItem(STORAGE_KEY, 'abc');
			vi.spyOn(console, 'warn').mockImplementation(() => {});
			mount();
			fireEvent.keyDown(handle(), { key: 'ArrowRight' });
			expect(localStorage.getItem(STORAGE_KEY)).toBe('16');
		});

		it('says so, and still works for this page, when the storage refuses the write', () => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new Error('QuotaExceededError');
			});
			mount();
			fireEvent.keyDown(handle(), { key: 'ArrowRight' });
			expect(menuWidth()).toBe('16rem');
			const message = String(error.mock.calls[0]![0]);
			expect(message).toContain('QuotaExceededError');
			expect(message).toContain(STORAGE_KEY);
		});

		it('says so, and still works, when the storage refuses the reset', () => {
			localStorage.setItem(STORAGE_KEY, '22');
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
				throw new Error('SecurityError');
			});
			mount();
			fireEvent.doubleClick(handle());
			expect(menuWidth()).toBe('15rem');
			expect(String(error.mock.calls[0]![0])).toContain('SecurityError');
		});

		it('says so, and starts at 15rem, when the storage cannot be read', () => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new Error('SecurityError');
			});
			mount();
			expect(menuWidth()).toBe('15rem');
			const message = String(error.mock.calls[0]![0]);
			expect(message).toContain('SecurityError');
			expect(message).toContain(STORAGE_KEY);
		});
	});

	describe('bounds follow the window', () => {
		const press = (key: string) => fireEvent.keyDown(handle(), { key });
		// innerWidth is read from the window object: set it, then tell the page with a resize event.
		const resizeWindow = (width: number) => {
			vi.stubGlobal('innerWidth', width);
			act(() => {
				window.dispatchEvent(new Event('resize'));
			});
		};

		// width px / 16 = rem; max = min(60% of the window, window - 20rem), never under 3.5rem (min wins).
		it.each([
			[1024, '38.4'],
			[900, '33.75'],
			[700, '23.75'],
			[400, '5'],
			[336, '3.5'],
			[320, '3.5'],
			[100, '3.5'],
		])('window of %ipx: the maximum is %srem', (width, max) => {
			vi.stubGlobal('innerWidth', width);
			mount();
			expect(handle()).toHaveAttribute('aria-valuemin', '3.5');
			expect(handle()).toHaveAttribute('aria-valuemax', max);
			press('End');
			expect(menuWidth()).toBe(`${max}rem`);
			press('Home');
			expect(menuWidth()).toBe('3.5rem');
		});

		it('uses the root font size to turn the window into rem: 20px per rem, 1024px is 51.2rem', () => {
			document.documentElement.style.fontSize = '20px';
			mount();
			// 60% of 51.2 is 30.72, 51.2 - 20 is 31.2.
			expect(handle()).toHaveAttribute('aria-valuemax', '30.72');
		});

		it('updates aria-valuemin/max/now and the variable when the window is resized, and restores the preference when it grows back', () => {
			localStorage.setItem(STORAGE_KEY, '30');
			mount();
			expect(menuWidth()).toBe('30rem');
			resizeWindow(700);
			expect(handle()).toHaveAttribute('aria-valuemax', '23.75');
			expect(handle()).toHaveAttribute('aria-valuenow', '23.75');
			expect(handle()).toHaveAttribute('aria-valuetext', '23.75rem');
			expect(menuWidth()).toBe('23.75rem');
			resizeWindow(400);
			expect(menuWidth()).toBe('5rem');
			expect(handle()).toHaveAttribute('aria-valuenow', '5');
			resizeWindow(1024);
			expect(handle()).toHaveAttribute('aria-valuemax', '38.4');
			expect(menuWidth()).toBe('30rem');
			expect(handle()).toHaveAttribute('aria-valuenow', '30');
		});

		it('never writes the storage when the window is resized: the preference stays as the user left it', () => {
			localStorage.setItem(STORAGE_KEY, '30');
			const setItem = vi.spyOn(Storage.prototype, 'setItem');
			const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
			mount();
			resizeWindow(400);
			expect(menuWidth()).toBe('5rem');
			expect(localStorage.getItem(STORAGE_KEY)).toBe('30');
			resizeWindow(1024);
			expect(setItem).not.toHaveBeenCalled();
			expect(removeItem).not.toHaveBeenCalled();
		});

		it('clamps a stored value to the bounds on load, silently, and leaves it stored', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			localStorage.setItem(STORAGE_KEY, '50');
			const first = mount();
			expect(menuWidth()).toBe('38.4rem');
			expect(localStorage.getItem(STORAGE_KEY)).toBe('50');
			first.unmount();
			localStorage.setItem(STORAGE_KEY, '1');
			mount();
			expect(menuWidth()).toBe('3.5rem');
			expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
			expect(warn).not.toHaveBeenCalled();
		});

		it('stores a new value only when the user acts: a key press stores the (clamped) result', () => {
			localStorage.setItem(STORAGE_KEY, '30');
			vi.stubGlobal('innerWidth', 700);
			mount();
			expect(menuWidth()).toBe('23.75rem');
			expect(localStorage.getItem(STORAGE_KEY)).toBe('30');
			press('ArrowLeft');
			expect(menuWidth()).toBe('22.75rem');
			expect(localStorage.getItem(STORAGE_KEY)).toBe('22.75');
			resizeWindow(1024);
			expect(menuWidth()).toBe('22.75rem');
		});

		it('a drag is limited by the current bounds, and the window can change under it', () => {
			vi.stubGlobal('innerWidth', 700);
			mount();
			drag(240, 240 + 400);
			expect(menuWidth()).toBe('23.75rem');
			resizeWindow(400);
			expect(menuWidth()).toBe('5rem');
			expect(handle()).toHaveAttribute('aria-valuenow', '5');
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 240 - 100 * 16 });
			expect(menuWidth()).toBe('3.5rem');
		});

		it('double-click goes back to 15rem, held between the current bounds', () => {
			localStorage.setItem(STORAGE_KEY, '22');
			vi.stubGlobal('innerWidth', 400);
			mount();
			fireEvent.doubleClick(handle());
			expect(menuWidth()).toBe('5rem');
			expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
			resizeWindow(1024);
			expect(menuWidth()).toBe('15rem');
			resizeWindow(320);
			expect(menuWidth()).toBe('3.5rem');
		});

		it('removes its window listener on unmount, and has none when the variant is not resizable', () => {
			const add = vi.spyOn(window, 'addEventListener');
			const other = shell({ menuVariant: 'classic' });
			const others = add.mock.calls.filter(([type]) => type === 'resize').length;
			other.unmount();
			add.mockClear();
			const view = mount();
			const resizeListeners = add.mock.calls.filter(([type]) => type === 'resize').map(([, listener]) => listener);
			// One more than a variant that is not resizable (the bounds).
			expect(resizeListeners).toHaveLength(others + 1);
			const remove = vi.spyOn(window, 'removeEventListener');
			view.unmount();
			const removed = remove.mock.calls.filter(([type]) => type === 'resize').map(([, listener]) => listener);
			for (const listener of resizeListeners) {
				expect(removed).toContain(listener);
			}
		});
	});

	describe('icons only under 6rem', () => {
		const iconsOnlyAt = (stored: string) => {
			localStorage.setItem(STORAGE_KEY, stored);
			mount();
		};

		it('shows the labels at 6rem and at 15rem: icon, label text, no tooltip on the link', () => {
			iconsOnlyAt('6');
			const link = screen.getByRole('link', { name: 'Overview' });
			expect(link).toHaveTextContent('Overview');
			expect(link).not.toHaveAttribute('title');
			expect(within(link).getByText('Overview').className).not.toContain('sr-only');
			expect(screen.getByText('Admin')).toBeInTheDocument();
		});

		it('shows icons only just under 6rem: the icon, a title on the link, the label kept for assistive technology', () => {
			iconsOnlyAt('5.99');
			const link = screen.getByRole('link', { name: 'Overview' });
			expect(link).toHaveAttribute('title', 'Overview');
			expect(within(link).getByTestId('icon-overview')).toBeInTheDocument();
			expect(classes(within(link).getByText('Overview'))).toContain('sr-only');
			expect(link.querySelector('[data-menu-label]')).toBeNull();
		});

		it('uses initials for an entry with no icon, hidden from assistive technology', () => {
			iconsOnlyAt('3.5');
			const link = screen.getByRole('link', { name: 'Jobs' });
			expect(link).toHaveAttribute('title', 'Jobs');
			const initials = within(link).getByText('JO');
			expect(initials).toHaveAttribute('aria-hidden', 'true');
			expect(classes(within(link).getByText('Jobs'))).toContain('sr-only');
			// An entry with an icon does not get initials.
			expect(within(screen.getByRole('link', { name: 'Overview' })).queryByText('OV')).toBeNull();
		});

		it('keeps the separators as a rule with their caption as the accessible name only', () => {
			iconsOnlyAt('3.5');
			const separator = screen.getByRole('separator', { name: 'Admin' });
			expect(separator).toBeInTheDocument();
			expect(separator).toHaveTextContent('');
			expect(screen.queryByText('Admin')).toBeNull();
		});

		it('follows the width live: a drag under 6rem switches to icons and back', () => {
			mount();
			expect(screen.getByRole('link', { name: 'Jobs' })).not.toHaveAttribute('title');
			drag(240, 240 - 10 * 16);
			expect(menuWidth()).toBe('5rem');
			expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('title', 'Jobs');
			fireEvent.pointerMove(handle(), { pointerId: 7, clientX: 240 - 9 * 16 });
			expect(menuWidth()).toBe('6rem');
			expect(screen.getByRole('link', { name: 'Jobs' })).not.toHaveAttribute('title');
		});

		it('is decided by the width shown, not the stored one: a small window gives icons, a big one gives the labels back', () => {
			localStorage.setItem(STORAGE_KEY, '30');
			mount();
			expect(screen.getByRole('link', { name: 'Jobs' })).not.toHaveAttribute('title');
			vi.stubGlobal('innerWidth', 400);
			act(() => {
				window.dispatchEvent(new Event('resize'));
			});
			expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('title', 'Jobs');
			vi.stubGlobal('innerWidth', 1024);
			act(() => {
				window.dispatchEvent(new Event('resize'));
			});
			expect(screen.getByRole('link', { name: 'Jobs' })).not.toHaveAttribute('title');
		});

		it('keeps the arrow keys between the links', () => {
			iconsOnlyAt('3.5');
			const links = within(nav()).getAllByRole('link');
			links[0]!.focus();
			fireEvent.keyDown(links[0]!, { key: 'ArrowDown' });
			expect(document.activeElement).toBe(links[1]);
		});

		it('the other variants never show icons only', () => {
			for (const menuVariant of ['classic', 'narrow', 'wide', 'fluid', 'fit'] as const) {
				const { unmount } = shell({ menuVariant });
				expect(screen.getByRole('link', { name: 'Jobs' })).not.toHaveAttribute('title');
				unmount();
			}
		});
	});

	describe('an excerpt, never a scrollbar', () => {
		const LONG = 'A rather long page title';
		const LONG_CAPTION = 'A rather long group caption';
		const longMenu: ShellMenu = {
			title: 'Queue',
			label: 'Queue pages',
			items: [
				{ id: 'a', label: LONG, href: '/a', current: 'page' },
				{ kind: 'separator', id: 's', label: LONG_CAPTION },
				{ id: 'b', label: 'Ok', href: '/b' },
			],
		};

		// 10px per character; 90px of padding and icon around a label, 24px around a caption (px-3).
		beforeEach(() => {
			vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
				return this.hasAttribute('data-menu-label') ? (this.textContent ?? '').length * 10 : 0;
			});
			vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
				if (!this.hasAttribute('data-menu-label')) return 0;
				// The variable as CSS would inherit it: from the nearest ancestor that declares it.
				let node: HTMLElement | null = this as HTMLElement;
				while (node && node.style.getPropertyValue(VAR) === '') node = node.parentElement;
				return parseFloat(node?.style.getPropertyValue(VAR) ?? '') * 16 - (this.closest('a') ? 90 : 24);
			});
		});

		it('cuts a long label with an ellipsis (no wrapping) and gives the whole text as title', () => {
			localStorage.setItem(STORAGE_KEY, '8');
			mount({ menu: longMenu });
			const label = screen.getByRole('link', { name: LONG }).querySelector('[data-menu-label]')!;
			expect(classes(label)).toContain('truncate');
			expect(label).toHaveAttribute('title', LONG);
			expect(screen.getByRole('link', { name: 'Ok' }).querySelector('[data-menu-label]')).not.toHaveAttribute('title');
		});

		it('cuts a long separator caption the same way', () => {
			localStorage.setItem(STORAGE_KEY, '8');
			mount({ menu: longMenu });
			const caption = screen.getByText(LONG_CAPTION);
			expect(classes(caption)).toContain('truncate');
			expect(caption).toHaveAttribute('title', LONG_CAPTION);
		});

		it('takes the title away when the menu is wide enough again, and from a caption that fits', () => {
			localStorage.setItem(STORAGE_KEY, '8');
			mount({ menu: longMenu });
			fireEvent.keyDown(handle(), { key: 'End' });
			expect(screen.getByText(LONG_CAPTION)).not.toHaveAttribute('title');
			expect(screen.getByRole('link', { name: LONG }).querySelector('[data-menu-label]')).not.toHaveAttribute('title');
		});

		it('has no horizontal scroll: the scrolling box scrolls vertically only', () => {
			mount({ menu: longMenu });
			expect(classes(scroller())).toEqual(expect.arrayContaining(['overflow-y-auto', 'overflow-x-hidden']));
			expect(classes(scroller())).not.toContain('overflow-x-auto');
			expect(classes(scroller())).not.toContain('overflow-x-scroll');
		});
	});

	describe('switching variant at run time', () => {
		it('reads the stored width when it becomes resizable, and stops publishing it when it is not', () => {
			localStorage.setItem(STORAGE_KEY, '22');
			const view = shell({ menuVariant: 'wide', resizeLabel: RESIZE_LABEL });
			expect(menuWidth()).toBe('19rem');
			expect(screen.queryByRole('separator', { name: RESIZE_LABEL })).toBeNull();
			view.rerender(
				<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} menuVariant="resizable" resizeLabel={RESIZE_LABEL}>
					<p>content</p>
				</AppShell>,
			);
			expect(menuWidth()).toBe('22rem');
			fireEvent.keyDown(handle(), { key: 'ArrowRight' });
			expect(menuWidth()).toBe('23rem');
			view.rerender(
				<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} menuVariant="classic" resizeLabel={RESIZE_LABEL}>
					<p>content</p>
				</AppShell>,
			);
			expect(menuWidth()).toBe('15rem');
			expect(screen.queryByRole('separator', { name: RESIZE_LABEL })).toBeNull();
		});

		it('ends a drag in progress without writing when the variant changes', () => {
			const view = mount();
			drag(240, 320);
			view.rerender(
				<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} menuVariant="classic" resizeLabel={RESIZE_LABEL}>
					<p>content</p>
				</AppShell>,
			);
			expect(menuWidth()).toBe('15rem');
			expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		});
	});
});
