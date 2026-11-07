import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type AppShellProps, type ShellItem, type ShellMenuEntry } from './AppShell.js';
import { labelWithBadge, shellBadgeCount } from './ShellBadge.js';
import { menuFitKey } from './ShellSideMenu.js';

const KEY = 'app-shell.menu-width';
const MENU_VAR = '--app-shell-menu-width';

const menuOf = (...items: ShellMenuEntry[]) => ({ title: 'Queue', label: 'Queue pages', items });
const TABS: ShellItem[] = [{ id: 'queue', label: 'Queue', href: '/queue', current: 'true', badge: 7 }];

const shell = (props: Partial<AppShellProps> = {}) =>
	render(
		<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={menuOf({ id: 'jobs', label: 'Jobs', href: '/jobs', badge: 3 })} {...props}>
			<p>content</p>
		</AppShell>,
	);
const nav = () => screen.getByRole('navigation', { name: 'Queue pages' });
// jsdom has no inline/block distinction for a span (its display reads empty), so the name algorithm puts a space around
// every span: "Jobs , 3". Chrome's computed name has the same space (flex items), which is read the same.
const nameIs = (expected: string) => (name: string) => name.replace(/\s+,/g, ',') === expected;
const row = (name: string) => within(nav()).getByRole('link', { name: nameIs(name) });
const pillOf = (link: HTMLElement) => link.querySelector<HTMLElement>('[data-menu-badge]');
const classes = (el: Element) => el.className.split(/\s+/);

let frames: FrameRequestCallback[] = [];
beforeEach(() => {
	vi.stubGlobal('scrollY', 0);
	frames = [];
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal('cancelAnimationFrame', () => {});
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
	document.documentElement.style.fontSize = '16px';
});
afterEach(() => {
	document.documentElement.style.removeProperty('--app-shell-bar-height');
	document.documentElement.style.removeProperty(MENU_VAR);
});

describe('shellBadgeCount', () => {
	it.each([0, 1, 3, 99, 1234567, Number.MAX_SAFE_INTEGER])('keeps %s', (value) => {
		expect(shellBadgeCount(value)).toBe(value);
	});
	it('turns -0 into a plain zero', () => {
		expect(Object.is(shellBadgeCount(-0), -0)).toBe(true);
		expect(String(shellBadgeCount(-0))).toBe('0');
	});
	it.each([undefined, null, '3', '', NaN, Infinity, -Infinity, -1, 1.5, 2 ** 60, true, {}, [], [3]])('ignores %s', (value) => {
		expect(shellBadgeCount(value)).toBeUndefined();
	});
	it('labelWithBadge adds the count in parentheses, zero included, and nothing for an invalid one', () => {
		expect(labelWithBadge({ label: 'Jobs', badge: 3 })).toBe('Jobs (3)');
		expect(labelWithBadge({ label: 'Jobs', badge: 0 })).toBe('Jobs (0)');
		expect(labelWithBadge({ label: 'Jobs' })).toBe('Jobs');
		expect(labelWithBadge({ label: 'Jobs', badge: NaN })).toBe('Jobs');
	});
});

describe('side menu badge', () => {
	it('draws the figure after the label, outside the truncating label', () => {
		shell();
		const link = row('Jobs, 3');
		const label = link.querySelector('[data-menu-label]')!;
		const pill = pillOf(link)!;
		expect(pill).toHaveTextContent('3');
		expect(label).toHaveTextContent(/^Jobs$/);
		expect(label.contains(pill)).toBe(false);
		expect(label.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('the accessible name is "Label, 3": the number is read once', () => {
		shell();
		const link = row('Jobs, 3');
		// A visually hidden ", " and the figure itself (not aria-hidden): no second copy of the number anywhere.
		expect(link.querySelector('.sr-only')!.textContent).toBe(', ');
		expect(pillOf(link)).not.toHaveAttribute('aria-hidden');
		expect(link.textContent).toBe('Jobs, 3');
		expect(within(nav()).queryByRole('link', { name: nameIs('Jobs, 3, 3') })).toBeNull();
	});

	it('shows 0', () => {
		shell({ menu: menuOf({ id: 'jobs', label: 'Jobs', href: '/jobs', badge: 0 }) });
		expect(pillOf(row('Jobs, 0'))).toHaveTextContent('0');
	});

	it('shows a large value as it is, without abbreviation', () => {
		shell({ menu: menuOf({ id: 'jobs', label: 'Jobs', href: '/jobs', badge: 1234567 }) });
		expect(pillOf(row('Jobs, 1234567'))).toHaveTextContent(/^1234567$/);
	});

	it('draws nothing when the badge is absent or null, and says nothing about it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		shell({ menu: menuOf({ id: 'jobs', label: 'Jobs', href: '/jobs' }, { id: 'null', label: 'Nothing', href: '/n', badge: null as never }) });
		for (const name of ['Jobs', 'Nothing']) {
			const link = row(name);
			expect(pillOf(link)).toBeNull();
			expect(link.querySelector('.sr-only')).toBeNull();
		}
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([
		['a string', '3', 'the string "3"'],
		['NaN', NaN, 'NaN'],
		['Infinity', Infinity, 'Infinity'],
		['a negative number', -2, '-2'],
		['a fractional number', 2.5, '2.5'],
		['an object', {}, 'a value of type object'],
	])('ignores %s: no pill, no "NaN" text, the row keeps working, one development report', (_name, value, received) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { rerender } = shell({ menu: menuOf({ id: 'jobs', label: 'Jobs', href: '/jobs', badge: value as never }) });
		const link = row('Jobs');
		expect(pillOf(link)).toBeNull();
		expect(link).toHaveAttribute('href', '/jobs');
		expect(link.textContent).toBe('Jobs');
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]![0]);
		expect(message).toContain('[AppShell]');
		expect(message).toContain('"Jobs"');
		expect(message).toContain('id "jobs"');
		expect(message).toContain(`received ${received}`);
		// Rendering again does not repeat the report.
		rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={menuOf({ id: 'jobs', label: 'Jobs', href: '/jobs', badge: value as never })}>
				<p>content</p>
			</AppShell>,
		);
		expect(warn.mock.calls.filter(([m]) => String(m).includes('"Jobs"'))).toHaveLength(1);
	});

	it('the pill never shrinks or wraps, and the label next to it still truncates', () => {
		shell();
		const link = row('Jobs, 3');
		expect(classes(pillOf(link)!)).toEqual(expect.arrayContaining(['shrink-0', 'whitespace-nowrap']));
		expect(classes(link.querySelector('[data-menu-label]')!)).toContain('truncate');
		expect(classes(pillOf(link)!)).not.toContain('truncate');
	});

	it('is muted on a row that is not current', () => {
		shell();
		const pill = pillOf(row('Jobs, 3'))!;
		expect(classes(pill)).toEqual(expect.arrayContaining(['bg-muted-bg', 'text-muted']));
		expect(classes(pill)).not.toContain('bg-primary-light');
		expect(classes(pill)).not.toContain('text-primary');
	});

	it('takes the primary tokens on the current row', () => {
		shell({ menu: menuOf({ id: 'jobs', label: 'Jobs', href: '/jobs', badge: 3, current: 'page' }) });
		const pill = pillOf(row('Jobs, 3'))!;
		expect(classes(pill)).toEqual(expect.arrayContaining(['bg-primary-light', 'text-primary']));
		expect(classes(pill)).not.toContain('bg-muted-bg');
		expect(classes(pill)).not.toContain('text-muted');
	});

	it('uses only semantic tokens: no raw palette class, no dark: variant, no uppercase', () => {
		shell({ menu: menuOf({ id: 'a', label: 'A', href: '/a', badge: 1 }, { id: 'b', label: 'B', href: '/b', badge: 2, current: 'page' }) });
		for (const name of ['A, 1', 'B, 2']) {
			const all = classes(pillOf(row(name))!).join(' ');
			expect(all).not.toMatch(/dark:|uppercase|\b(?:bg|text|ring|border)-(?:gray|slate|zinc|neutral|stone|red|blue|green|white|black)/);
		}
	});

	it('a label too long for the room keeps its title with the label only, the pill stays outside the title', () => {
		const long = 'Reconciliation of archived payment batches';
		vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
			return this.hasAttribute('data-menu-label') ? 500 : 0;
		});
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
			return this.hasAttribute('data-menu-label') ? 100 : 0;
		});
		shell({ menu: menuOf({ id: 'long', label: long, href: '/long', badge: 12 }) });
		const link = row(`${long}, 12`);
		expect(link.querySelector('[data-menu-label]')).toHaveAttribute('title', long);
		expect(pillOf(link)).not.toHaveAttribute('title');
	});

	it('another row without a badge is unchanged', () => {
		shell({ menu: menuOf({ id: 'jobs', label: 'Jobs', href: '/jobs', badge: 3 }, { id: 'w', label: 'Workers', href: '/w' }) });
		expect(row('Workers').textContent).toBe('Workers');
	});

	it('is part of what a fit menu depends on', () => {
		const base = menuOf({ id: 'a', label: 'A', href: '/a' });
		const one = menuOf({ id: 'a', label: 'A', href: '/a', badge: 1 });
		const many = menuOf({ id: 'a', label: 'A', href: '/a', badge: 1000 });
		expect(new Set([menuFitKey(base), menuFitKey(one), menuFitKey(many)]).size).toBe(3);
		expect(menuFitKey(menuOf({ id: 'a', label: 'A', href: '/a', badge: NaN }))).toBe(menuFitKey(base));
	});
});

describe('fit menu with a badge', () => {
	// Fake layout, like AppShellMenu.test.tsx: 8px per character, label 40px into its link, 12px right padding, 25px of
	// chrome + 1px rounding; the pill is 24px wide after an 8px gap.
	beforeEach(() => {
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
			const left = this.hasAttribute('data-menu-label') ? 40 : 0;
			const width = this.tagName === 'NAV' ? 216 : this.hasAttribute('data-menu-badge') ? 24 : 0;
			return { x: left, y: 0, left, top: 0, right: left + width, bottom: 0, width, height: 0, toJSON: () => ({}) };
		});
		vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
			return this.hasAttribute('data-menu-label') ? (this.textContent ?? '').length * 8 : 0;
		});
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
			return this.dataset['testid'] === 'shell-menu' ? 241 : 0;
		});
		const real = window.getComputedStyle.bind(window);
		vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
			const style = real(el, pseudo);
			return el.tagName === 'A' ? ({ ...style, paddingRight: '12px', columnGap: '8px', fontSize: '16px' } as CSSStyleDeclaration) : style;
		});
	});

	it('leaves room for the pill and the gap before it', () => {
		// 24 chars: 40 + 192 + 12 = 244; with the pill 244 + 24 + 8 = 276; + 25 chrome + 1 rounding = 302px = 18.875rem.
		shell({ menuVariant: 'fit', menu: menuOf({ id: 'a', label: 'A rather long page title', href: '/a', badge: 12 }) });
		expect(document.documentElement.style.getPropertyValue(MENU_VAR)).toBe('18.88rem');
	});

	it('without a badge the width is the one it had', () => {
		shell({ menuVariant: 'fit', menu: menuOf({ id: 'a', label: 'A rather long page title', href: '/a' }) });
		expect(document.documentElement.style.getPropertyValue(MENU_VAR)).toBe('16.88rem');
	});
});

describe('icons-only side menu', () => {
	const iconsOnly = (badge: unknown, extra: Partial<ShellItem> = {}) => {
		localStorage.setItem(KEY, '4');
		return shell({ menuVariant: 'resizable', resizeLabel: 'Resize the menu', menu: menuOf({ id: 'jobs', label: 'Jobs', href: '/jobs', badge: badge as never, ...extra }) });
	};

	it('draws no pill, keeps the count in the accessible name and puts it in the tooltip', () => {
		iconsOnly(3);
		const link = row('Jobs, 3');
		expect(link.querySelector('[data-menu-badge]')).toBeNull();
		expect(link).toHaveAttribute('title', 'Jobs (3)');
		expect(link.textContent).toBe('JOJobs, 3');
	});

	it('keeps 0 in the name and the tooltip', () => {
		iconsOnly(0);
		const link = row('Jobs, 0');
		expect(link).toHaveAttribute('title', 'Jobs (0)');
	});

	it('an odd value leaves the tooltip and the name as they were, with one report', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		iconsOnly(NaN);
		const link = row('Jobs');
		expect(link).toHaveAttribute('title', 'Jobs');
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('no badge: the tooltip is the label alone', () => {
		iconsOnly(undefined);
		expect(row('Jobs')).toHaveAttribute('title', 'Jobs');
	});

	it('comes back as a pill when the menu is wide again', () => {
		iconsOnly(3);
		expect(pillOf(row('Jobs, 3'))).toBeNull();
		fireEvent.doubleClick(screen.getByRole('separator', { name: 'Resize the menu' }));
		const link = row('Jobs, 3');
		expect(pillOf(link)).toHaveTextContent('3');
		expect(link).not.toHaveAttribute('title');
	});
});

describe('tabs', () => {
	const tabLink = (name: string) => within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: nameIs(name) });

	it('draws the figure after the label, named "Label, 7", not primary even when current', () => {
		shell();
		const link = tabLink('Queue, 7');
		const pill = pillOf(link)!;
		expect(pill).toHaveTextContent('7');
		expect(link.textContent).toBe('Queue, 7');
		expect(classes(pill)).toEqual(expect.arrayContaining(['bg-muted-bg', 'text-muted', 'shrink-0']));
		expect(classes(pill)).not.toContain('text-primary');
	});

	it('shows 0 and ignores odd values with one report', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		shell({
			tabs: [
				{ id: 'zero', label: 'Zero', href: '/z', badge: 0 },
				{ id: 'bad', label: 'Bad', href: '/b', badge: -1 },
				{ id: 'none', label: 'None', href: '/n' },
			],
		});
		expect(pillOf(tabLink('Zero, 0'))).toHaveTextContent('0');
		expect(pillOf(tabLink('Bad'))).toBeNull();
		expect(pillOf(tabLink('None'))).toBeNull();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0]![0])).toContain('received -1');
	});

	it('is not drawn in the icons strip of barOnScroll icons: name and tooltip carry it', () => {
		shell({ barOnScroll: 'icons' });
		expect(pillOf(tabLink('Queue, 7'))).not.toBeNull();
		vi.stubGlobal('scrollY', 100);
		act(() => {
			window.dispatchEvent(new Event('scroll'));
			for (const cb of frames.splice(0)) cb(0);
		});
		const link = tabLink('Queue, 7');
		expect(pillOf(link)).toBeNull();
		expect(link).toHaveAttribute('title', 'Queue (7)');
		expect(link.textContent).toBe('QUQueue, 7');
	});

	it('keeps drawing it in the shrunk bar (barOnScroll shrink)', () => {
		shell({ barOnScroll: 'shrink' });
		vi.stubGlobal('scrollY', 100);
		act(() => {
			window.dispatchEvent(new Event('scroll'));
			for (const cb of frames.splice(0)) cb(0);
		});
		expect(pillOf(tabLink('Queue, 7'))).toHaveTextContent('7');
	});
});
