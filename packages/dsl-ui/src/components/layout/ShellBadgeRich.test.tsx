import { act, cleanup, render, screen, within } from '@testing-library/react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type AppShellProps, type ShellBadge, type ShellItem, type ShellMenuEntry } from './AppShell.js';
import { labelWithBadge, resolveShellBadge } from './ShellBadge.js';
import { menuFitKey } from './ShellSideMenu.js';

// `ShellItem.badge` as an object: tone, icon, label. The plain number is covered by ShellBadge.test.tsx.

const KEY = 'app-shell.menu-width';
const MENU_VAR = '--app-shell-menu-width';

const menuOf = (...items: ShellMenuEntry[]) => ({ title: 'Queue', label: 'Queue pages', items });
const jobs = (badge: unknown, extra: Partial<ShellItem> = {}): ShellItem => ({ id: 'jobs', label: 'Jobs', href: '/jobs', badge: badge as never, ...extra });
const shell = (props: Partial<AppShellProps> = {}) =>
	render(
		<AppShell brand="my-app" tabs={[]} tabsLabel="Modules" menu={menuOf(jobs(3))} {...props}>
			<p>content</p>
		</AppShell>,
	);
const nav = () => screen.getByRole('navigation', { name: 'Queue pages' });
// jsdom puts a space around every span: "Jobs , 3". Chrome's computed name has the same space.
const nameIs = (expected: string) => (name: string) => name.replace(/\s+,/g, ',') === expected;
const row = (name: string) => within(nav()).getByRole('link', { name: nameIs(name) });
const tabLink = (name: string) => within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: nameIs(name) });
const markOf = (link: HTMLElement) => link.querySelector<HTMLElement>('[data-menu-badge]');
const classes = (el: Element) => el.className.split(/\s+/);
const menuWith = (badge: unknown, extra: Partial<ShellItem> = {}) => shell({ menu: menuOf(jobs(badge, extra)) });

const TONE_CLASSES = {
	neutral: ['bg-muted-bg', 'text-muted', 'ring-border'],
	info: ['bg-info-bg', 'text-info-text', 'ring-info-text/30'],
	success: ['bg-success-bg', 'text-success-text', 'ring-success-text/30'],
	warning: ['bg-warning-bg', 'text-warning-text', 'ring-warning-text/30'],
	danger: ['bg-danger-bg', 'text-danger-text', 'ring-danger-text/30'],
} as const;
const TONES = Object.keys(TONE_CLASSES) as (keyof typeof TONE_CLASSES)[];
const ICONS = [
	['info', Info, 'info', 'Information'],
	['success', CheckCircle2, 'success', 'OK'],
	['warning', AlertTriangle, 'warning', 'Warning'],
	['error', XCircle, 'danger', 'Error'],
] as const;
const svgOf = (el: Element) => el.querySelector('svg')!;
const pathsOf = (svg: Element) => svg.innerHTML;
const lucidePaths = (Component: typeof Info) => {
	const { container, unmount } = render(<Component />);
	const html = container.querySelector('svg')!.innerHTML;
	unmount();
	return html;
};

beforeEach(() => {
	vi.stubGlobal('scrollY', 0);
	vi.stubGlobal('requestAnimationFrame', () => 1);
	vi.stubGlobal('cancelAnimationFrame', () => {});
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
	document.documentElement.style.fontSize = '16px';
});
afterEach(() => {
	document.documentElement.style.removeProperty('--app-shell-bar-height');
	document.documentElement.style.removeProperty(MENU_VAR);
});

describe('resolveShellBadge', () => {
	it('keeps a plain number as a neutral count, without label or icon', () => {
		expect(resolveShellBadge(3).badge).toStrictEqual({ count: 3, tone: 'neutral', icon: undefined, label: undefined, text: '3' });
		expect(resolveShellBadge(3).problems).toStrictEqual([]);
		expect(resolveShellBadge(0).badge?.count).toBe(0);
	});
	it('says nothing about an absent badge or null fields', () => {
		expect(resolveShellBadge(undefined)).toStrictEqual({ badge: undefined, problems: [] });
		expect(resolveShellBadge(null)).toStrictEqual({ badge: undefined, problems: [] });
		expect(resolveShellBadge({ count: 2, tone: null, icon: null, label: null }).problems).toStrictEqual([]);
	});
	it('defaults the tone from the icon, and an explicit tone wins', () => {
		expect(resolveShellBadge({ icon: 'error' }).badge?.tone).toBe('danger');
		expect(resolveShellBadge({ icon: 'error', tone: 'info' }).badge?.tone).toBe('info');
		expect(resolveShellBadge({ count: 1 }).badge?.tone).toBe('neutral');
	});
	it('the text is the label, else the default label of the icon, else the count', () => {
		expect(resolveShellBadge({ count: 3, label: '3 failures' }).badge?.text).toBe('3 failures');
		expect(resolveShellBadge({ count: 3, icon: 'warning' }).badge?.text).toBe('Warning');
		expect(resolveShellBadge({ count: 3 }).badge?.text).toBe('3');
	});
	it('labelWithBadge puts the text in parentheses', () => {
		expect(labelWithBadge({ label: 'Jobs', badge: { count: 3, label: '3 failures' } })).toBe('Jobs (3 failures)');
		expect(labelWithBadge({ label: 'Jobs', badge: { icon: 'error' } })).toBe('Jobs (Error)');
		expect(labelWithBadge({ label: 'Jobs', badge: { tone: 'danger' } })).toBe('Jobs');
	});
});

describe('type', () => {
	it('ShellBadge is exported by the package entry like ShellItem', () => {
		const badge: ShellBadge = { count: 1, tone: 'info', icon: 'info', label: 'x' };
		// A plain number stays assignable to the field.
		const item: ShellItem = { id: 'a', label: 'A', href: '/a', badge: badge };
		const plain: ShellItem = { id: 'a', label: 'A', href: '/a', badge: 3 };
		expect([item.badge, plain.badge]).toStrictEqual([badge, 3]);
	});
});

describe('pill with a tone (no icon)', () => {
	it.each(TONES)('tone %s: its fill, ink and edge tokens, and the count', (tone) => {
		menuWith({ count: 4, tone });
		const pill = markOf(row('Jobs, 4'))!;
		expect(pill).toHaveTextContent('4');
		expect(classes(pill)).toEqual(expect.arrayContaining([...TONE_CLASSES[tone], 'ring-1', 'ring-inset', 'shrink-0', 'whitespace-nowrap']));
		expect(pill.querySelector('svg')).toBeNull();
	});

	it.each(TONES)('tone %s: only semantic tokens, no raw palette class, no dark: variant', (tone) => {
		menuWith({ count: 4, tone });
		expect(classes(markOf(row('Jobs, 4'))!).join(' ')).not.toMatch(/dark:|uppercase|\b(?:bg|text|ring|border)-(?:gray|slate|zinc|neutral-|stone|red|blue|green|yellow|amber|white|black)/);
	});

	it('neutral and no tone are the same as a plain number (today\'s classes)', () => {
		menuWith({ count: 4, tone: 'neutral' });
		const explicit = markOf(row('Jobs, 4'))!.className;
		cleanup();
		menuWith(4);
		expect(markOf(row('Jobs, 4'))!.className).toBe(explicit);
	});

	it('without a label the number is announced once (not aria-hidden)', () => {
		menuWith({ count: 4, tone: 'danger' });
		const link = row('Jobs, 4');
		expect(markOf(link)).not.toHaveAttribute('aria-hidden');
		expect(markOf(link)).not.toHaveAttribute('title');
		expect(link.textContent).toBe('Jobs, 4');
	});

	it('shows 0', () => {
		menuWith({ count: 0, tone: 'warning' });
		expect(markOf(row('Jobs, 0'))).toHaveTextContent('0');
	});
});

describe('icon badge', () => {
	it.each(ICONS)('icon %s: the lucide component, no pill, coloured by the %s tone', (icon, Component, tone) => {
		menuWith({ icon });
		const mark = markOf(within(nav()).getByRole('link'))!;
		expect(mark).toHaveAttribute('data-badge-icon', icon);
		expect(pathsOf(svgOf(mark))).toBe(lucidePaths(Component));
		expect(svgOf(mark)).toHaveAttribute('aria-hidden', 'true');
		expect(classes(mark)).toContain(`text-${tone}-text`);
		// No pill: no fill and no ring.
		expect(classes(mark).filter((c) => /^(bg-|ring)/.test(c))).toEqual([]);
		expect(classes(mark)).toEqual(expect.arrayContaining(['shrink-0']));
	});

	it('an explicit tone recolours the icon', () => {
		menuWith({ icon: 'error', tone: 'warning' });
		expect(classes(markOf(row('Jobs, Error'))!)).toContain('text-warning-text');
	});

	it('an icon with a neutral tone is muted on a row, and content ink on the current row', () => {
		menuWith({ icon: 'info', tone: 'neutral' });
		expect(classes(markOf(row('Jobs, Information'))!)).toContain('text-muted');
		cleanup();
		menuWith({ icon: 'info', tone: 'neutral' }, { current: 'page' });
		expect(classes(markOf(row('Jobs, Information'))!)).toContain('text-content');
	});

	it('the icon replaces the number: the count is not drawn', () => {
		menuWith({ icon: 'warning', count: 3 });
		const link = within(nav()).getByRole('link');
		expect(markOf(link)!.textContent).toBe('');
		expect(link.textContent).toBe('Jobs, Warning');
		expect(link.textContent).not.toContain('3');
	});

	it.each(ICONS)('icon %s without a label: default label "%s"... as the name, once', (icon, _c, _t, defaultLabel) => {
		menuWith({ icon });
		const link = row(`Jobs, ${defaultLabel}`);
		expect(markOf(link)).toHaveAttribute('title', defaultLabel);
		expect(link.textContent).toBe(`Jobs, ${defaultLabel}`);
	});

	it('a label replaces the default label in the name and the tooltip', () => {
		menuWith({ icon: 'error', label: '3 failures' });
		const link = row('Jobs, 3 failures');
		expect(markOf(link)).toHaveAttribute('title', '3 failures');
		expect(link.textContent).toBe('Jobs, 3 failures');
	});

	it('the visible mark is hidden from assistive technology: the text is announced once', () => {
		menuWith({ icon: 'error', label: '3 failures' });
		expect(markOf(row('Jobs, 3 failures'))).toHaveAttribute('aria-hidden', 'true');
		expect(within(nav()).queryByRole('link', { name: nameIs('Jobs, 3 failures, 3 failures') })).toBeNull();
		expect(within(nav()).queryByRole('link', { name: nameIs('Jobs, 3 failures, Error') })).toBeNull();
	});
});

describe('label', () => {
	it('on a pill: the accessible text and the tooltip, the visible count is not announced twice', () => {
		menuWith({ count: 3, tone: 'danger', label: '3 failures' });
		const link = row('Jobs, 3 failures');
		const pill = markOf(link)!;
		expect(pill).toHaveAttribute('title', '3 failures');
		expect(pill).toHaveAttribute('aria-hidden', 'true');
		expect(pill).toHaveTextContent('3');
		expect(within(nav()).queryByRole('link', { name: nameIs('Jobs, 3') })).toBeNull();
		expect(within(nav()).queryByRole('link', { name: nameIs('Jobs, 3 failures, 3') })).toBeNull();
	});

	it('the accessible name is "Label, <label or count>" for every combination', () => {
		const cases: [unknown, string][] = [
			[5, 'Jobs, 5'],
			[{ count: 5 }, 'Jobs, 5'],
			[{ count: 5, label: 'five' }, 'Jobs, five'],
			[{ count: 0 }, 'Jobs, 0'],
			[{ icon: 'info' }, 'Jobs, Information'],
			[{ icon: 'info', label: 'Heads up' }, 'Jobs, Heads up'],
		];
		for (const [badge, name] of cases) {
			cleanup();
			menuWith(badge);
			expect(row(name)).toBeInTheDocument();
		}
	});
});

describe('current row and current tab', () => {
	it('a toned pill keeps its tone on the current row, with its edge', () => {
		for (const tone of TONES.filter((t) => t !== 'neutral')) {
			cleanup();
			menuWith({ count: 2, tone }, { current: 'page' });
			const pill = markOf(row('Jobs, 2'))!;
			expect(classes(pill)).toEqual(expect.arrayContaining([...TONE_CLASSES[tone], 'ring-1']));
			expect(classes(pill)).not.toContain('bg-surface');
		}
	});

	it('a neutral pill on the current row is the surface with the content ink and the border edge, no accent', () => {
		menuWith({ count: 2, tone: 'neutral' }, { current: 'page' });
		const pill = markOf(row('Jobs, 2'))!;
		expect(classes(pill)).toEqual(expect.arrayContaining(['bg-surface', 'text-content', 'ring-border']));
		expect(classes(pill).filter((c) => /primary/.test(c))).toEqual([]);
	});

	it('same on tabs: neutral on the surface, toned keeps its tone', () => {
		shell({
			tabs: [
				{ id: 'a', label: 'Alpha', href: '/a', current: 'true', badge: { count: 1 } },
				{ id: 'b', label: 'Beta', href: '/b', current: undefined, badge: { count: 2, tone: 'warning' } },
				{ id: 'c', label: 'Gamma', href: '/c', current: undefined, badge: { icon: 'error' } },
			],
		});
		expect(classes(markOf(tabLink('Alpha, 1'))!)).toEqual(expect.arrayContaining(['bg-surface', 'text-content', 'ring-border']));
		expect(classes(markOf(tabLink('Beta, 2'))!)).toEqual(expect.arrayContaining(TONE_CLASSES.warning as unknown as string[]));
		const icon = markOf(tabLink('Gamma, Error'))!;
		expect(icon).toHaveAttribute('data-badge-icon', 'error');
		expect(classes(icon)).toContain('text-danger-text');
	});

	it('a toned pill on a current tab keeps its tone', () => {
		shell({ tabs: [{ id: 'a', label: 'Alpha', href: '/a', current: 'true', badge: { count: 1, tone: 'danger' } }] });
		expect(classes(markOf(tabLink('Alpha, 1'))!)).toEqual(expect.arrayContaining(TONE_CLASSES.danger as unknown as string[]));
	});
});

describe('where only icons are drawn', () => {
	const iconsOnly = (badge: unknown) => {
		localStorage.setItem(KEY, '4');
		return shell({ menuVariant: 'resizable', resizeLabel: 'Resize the menu', menu: menuOf(jobs(badge)) });
	};

	it('no mark, the text stays in the name and the tooltip says "Label (label)"', () => {
		iconsOnly({ count: 3, tone: 'danger', label: '3 failures' });
		const link = row('Jobs, 3 failures');
		expect(markOf(link)).toBeNull();
		expect(link).toHaveAttribute('title', 'Jobs (3 failures)');
	});

	it('an icon badge: the default label is the text', () => {
		iconsOnly({ icon: 'warning' });
		const link = row('Jobs, Warning');
		expect(markOf(link)).toBeNull();
		expect(link).toHaveAttribute('title', 'Jobs (Warning)');
	});

	it('a plain object with a count and no label: the count', () => {
		iconsOnly({ count: 3, tone: 'info' });
		expect(row('Jobs, 3')).toHaveAttribute('title', 'Jobs (3)');
	});

	it('a badge with nothing to show leaves the label alone', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		iconsOnly({ tone: 'danger' });
		expect(row('Jobs')).toHaveAttribute('title', 'Jobs');
	});

	it('the top bar icons strip keeps the text in the name and the tooltip', () => {
		const frames: FrameRequestCallback[] = [];
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
		shell({ barOnScroll: 'icons', tabs: [{ id: 'q', label: 'Queue', href: '/q', current: 'true', badge: { icon: 'error', label: 'Down' } }] });
		vi.stubGlobal('scrollY', 100);
		act(() => {
			window.dispatchEvent(new Event('scroll'));
			for (const cb of frames.splice(0)) cb(0);
		});
		const link = tabLink('Queue, Down');
		expect(markOf(link)).toBeNull();
		expect(link).toHaveAttribute('title', 'Queue (Down)');
	});
});

describe('invalid values: nothing for the offending part, one report naming the item', () => {
	const reportsFor = (warn: { mock: { calls: unknown[][] } }) => warn.mock.calls.map(([m]) => String(m)).filter((m) => m.includes('"Jobs"'));

	it.each([
		['unknown icon', { icon: 'bell', count: 2 }, 'icon must be one of', 'received the string "bell"'],
		['non-string icon', { icon: 3, count: 2 }, 'icon must be one of', 'received 3'],
		['non-string label', { count: 2, label: 3 }, 'label must be a non-empty text', 'received 3'],
		['empty label', { count: 2, label: '' }, 'label must be a non-empty text', 'received the string ""'],
		['bad count', { count: -1, icon: 'info' }, 'count must be a non-negative whole number', 'received -1'],
		['string count', { count: '3', icon: 'info' }, 'count must be a non-negative whole number', 'received the string "3"'],
		['NaN count', { count: NaN, icon: 'info' }, 'count must be a non-negative whole number', 'received NaN'],
		['fractional count', { count: 1.5, icon: 'info' }, 'count must be a non-negative whole number', 'received 1.5'],
		['non-string tone', { count: 2, tone: 4 }, 'tone must be one of', 'received 4'],
		['unknown key', { count: 2, colour: 'red' }, '"colour" is not a badge key', 'allowed: count, tone, icon, label'],
	])('%s: one report that names the item, the rest is drawn', (_name, badge, part, received) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { rerender } = menuWith(badge);
		const reports = reportsFor(warn);
		expect(reports).toHaveLength(1);
		expect(reports[0]).toContain('[AppShell]');
		expect(reports[0]).toContain('id "jobs"');
		expect(reports[0]).toContain(part);
		expect(reports[0]).toContain(received);
		// The link keeps working.
		expect(within(nav()).getByRole('link', { name: /Jobs/ })).toHaveAttribute('href', '/jobs');
		rerender(
			<AppShell brand="my-app" tabs={[]} tabsLabel="Modules" menu={menuOf(jobs(badge))}>
				<p>content</p>
			</AppShell>,
		);
		expect(reportsFor(warn)).toHaveLength(1);
	});

	it('an unknown tone falls back to the default tone and still draws the count', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		menuWith({ count: 2, tone: 'purple' });
		const pill = markOf(row('Jobs, 2'))!;
		expect(pill).toHaveTextContent('2');
		expect(classes(pill)).toEqual(expect.arrayContaining(TONE_CLASSES.neutral as unknown as string[]));
		expect(reportsFor(warn)[0]).toContain('the default tone is used instead');
	});

	it('an unknown tone on an icon falls back to the tone of the icon', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		menuWith({ icon: 'error', tone: 'purple' });
		expect(classes(markOf(row('Jobs, Error'))!)).toContain('text-danger-text');
	});

	it('an unknown icon draws no icon but still the count pill', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		menuWith({ icon: 'bell', count: 2, tone: 'info' });
		const pill = markOf(row('Jobs, 2'))!;
		expect(pill).toHaveTextContent('2');
		expect(pill.querySelector('svg')).toBeNull();
	});

	it('a non-string label is ignored: the count is the name', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		menuWith({ count: 2, label: { text: 'x' } });
		expect(row('Jobs, 2')).toBeInTheDocument();
	});

	it('several mistakes in one badge make one report listing all of them', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		menuWith({ count: 2, tone: 'purple', icon: 'bell', label: 7 });
		const reports = reportsFor(warn);
		expect(reports).toHaveLength(1);
		for (const part of ['tone must be', 'icon must be', 'label must be']) expect(reports[0]).toContain(part);
	});

	it.each([
		['only a tone', { tone: 'danger' }],
		['only a label', { label: 'x' }],
		['an empty object', {}],
		['a count that is not valid and nothing else', { count: NaN }],
	])('%s: nothing to show, nothing drawn, one report', (_name, badge) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		menuWith(badge);
		const link = within(nav()).getByRole('link');
		expect(markOf(link)).toBeNull();
		expect(link.textContent).toBe('Jobs');
		expect(link.querySelector('.sr-only')).toBeNull();
		const reports = reportsFor(warn);
		expect(reports).toHaveLength(1);
		expect(reports[0]).toContain('nothing to show');
	});

	it.each([
		['an array', [3], 'an array'],
		['a string', '3', 'the string "3"'],
		['a boolean', false, 'a value of type boolean'],
	])('%s as the badge: no mark, one report', (_name, badge, received) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		menuWith(badge);
		expect(markOf(row('Jobs'))).toBeNull();
		const reports = reportsFor(warn);
		expect(reports).toHaveLength(1);
		expect(reports[0]).toContain(`received ${received}`);
	});

	it('a valid object says nothing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		menuWith({ count: 0, tone: 'info', icon: 'info', label: 'ok' });
		expect(warn).not.toHaveBeenCalled();
	});

	it('the same mistake on a tab is reported once, naming the tab', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		shell({ tabs: [{ id: 'q', label: 'Queue', href: '/q', badge: { count: 2, tone: 'purple' } as never }] });
		const reports = warn.mock.calls.map(([m]) => String(m)).filter((m) => m.includes('"Queue"'));
		expect(reports).toHaveLength(1);
		expect(reports[0]).toContain('id "q"');
		expect(markOf(tabLink('Queue, 2'))).toHaveTextContent('2');
	});
});

describe('tabs', () => {
	it('draws a toned pill and an icon after the label, named "Label, <text>"', () => {
		shell({
			tabs: [
				{ id: 'a', label: 'Alpha', href: '/a', badge: { count: 5, tone: 'danger', label: '5 failures' } },
				{ id: 'b', label: 'Beta', href: '/b', badge: { icon: 'success' } },
			],
		});
		const alpha = tabLink('Alpha, 5 failures');
		expect(classes(markOf(alpha)!)).toEqual(expect.arrayContaining(TONE_CLASSES.danger as unknown as string[]));
		expect(markOf(alpha)).toHaveAttribute('title', '5 failures');
		const beta = tabLink('Beta, OK');
		expect(pathsOf(svgOf(markOf(beta)!))).toBe(lucidePaths(CheckCircle2));
		expect(classes(markOf(beta)!)).toContain('text-success-text');
	});
});

describe('fit menu with an icon badge', () => {
	// Fake layout as in ShellBadge.test.tsx: 8px per character, label 40px into its link, 12px right padding, 25px of
	// chrome + 1px rounding; the badge mark is 24px wide after an 8px gap, whatever it holds.
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

	it('leaves room for the icon and the gap before it, as for a pill', () => {
		// 24 chars: 40 + 192 + 12 = 244; with the mark 244 + 24 + 8 = 276; + 25 + 1 = 302px = 18.875rem.
		shell({ menuVariant: 'fit', menu: menuOf({ id: 'a', label: 'A rather long page title', href: '/a', badge: { icon: 'warning' } }) });
		expect(document.documentElement.style.getPropertyValue(MENU_VAR)).toBe('18.88rem');
	});

	it('a badge with nothing to show adds no room', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		shell({ menuVariant: 'fit', menu: menuOf({ id: 'a', label: 'A rather long page title', href: '/a', badge: { tone: 'danger' } }) });
		expect(document.documentElement.style.getPropertyValue(MENU_VAR)).toBe('16.88rem');
	});

	it('menuFitKey tells a number, an icon and none apart, and ignores what does not change the width', () => {
		const at = (badge: unknown) => menuFitKey(menuOf({ id: 'a', label: 'A', href: '/a', badge: badge as never }));
		expect(new Set([at(undefined), at(1), at(1000), at({ icon: 'info' })]).size).toBe(4);
		// Every icon is the same size.
		expect(at({ icon: 'error' })).toBe(at({ icon: 'info' }));
		expect(at({ count: 1 })).toBe(at(1));
		expect(at({ count: 1, tone: 'danger', label: 'x' })).toBe(at(1));
		expect(at({ tone: 'danger' })).toBe(at(undefined));
	});
});
