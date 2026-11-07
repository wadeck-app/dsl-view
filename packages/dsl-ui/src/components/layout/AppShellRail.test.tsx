import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type AppShellProps, type ShellItem, type ShellMenu } from './AppShell.js';

// The "rail" look: the current entry has neutral text on a grey fill and a 3px accent bar on its inner edge (under a tab,
// left of a row). jsdom computes no geometry or box-shadow, so these tests pin the classes that CARRY the look: they are
// the contract (semantic tokens, the arbitrary shadow written out in full).

const TAB_BAR = 'shadow-[inset_0_-3px_0_0_var(--color-primary)]';
const ROW_BAR = 'shadow-[inset_3px_0_0_0_var(--color-primary)]';

const TABS: ShellItem[] = [
	{ id: 'queue', label: 'Queue', href: '/queue', icon: <i data-testid="logo" />, current: 'true', accent: '#0d9488' },
	{ id: 'audit', label: 'Audit log', href: '/audit', accent: '#e11d48' },
];
const MENU: ShellMenu = {
	title: 'Queue',
	label: 'Queue pages',
	items: [
		{ id: 'overview', label: 'Overview', href: '/', current: 'page' },
		{ id: 'jobs', label: 'Jobs', href: '/jobs', badge: 3 },
	],
};

const shell = (props: Partial<AppShellProps> = {}) =>
	render(
		<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} {...props}>
			<p>content</p>
		</AppShell>,
	);

const classes = (el: Element): string[] => el.className.split(/\s+/).filter(Boolean);
// jsdom puts a space around every span, so a link with a pill is named "Jobs , 3" (Chrome reads it the same).
const nameIs = (expected: string) => (name: string) => name.replace(/\s+,/g, ',') === expected;
const tab = (name: string) => within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: nameIs(name) });
const row = (name: string) => within(screen.getByTestId('shell-menu')).getByRole('link', { name: nameIs(name) });

// A scroll moves the bar to its shrunk / icons state; the animation frame the listener asked for runs inside act.
let frames: FrameRequestCallback[] = [];
function scrollTo(y: number): void {
	vi.stubGlobal('scrollY', y);
	act(() => {
		window.dispatchEvent(new Event('scroll'));
		for (const cb of frames.splice(0)) cb(0);
	});
}

beforeEach(() => {
	frames = [];
	vi.stubGlobal('scrollY', 0);
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal('cancelAnimationFrame', () => {});
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
	document.documentElement.style.removeProperty('--app-shell-bar-height');
	document.documentElement.style.removeProperty('--app-shell-menu-width');
});

describe('rail look: top-bar tabs', () => {
	it('the current tab has neutral text, the grey fill, weight 500 and the bar under it in the primary colour', () => {
		shell();
		const current = classes(tab('Queue'));
		expect(current).toEqual(expect.arrayContaining(['text-content', 'bg-muted-bg', 'font-medium', TAB_BAR]));
		expect(current).not.toContain('font-semibold');
		expect(current).not.toContain('text-muted');
	});

	it('an inactive tab is unchanged: muted text, no fill, no bar, grey fill and dark text on hover', () => {
		shell();
		const other = classes(tab('Audit log'));
		expect(other).toEqual(expect.arrayContaining(['text-muted', 'font-medium', 'hover:bg-muted-bg', 'hover:text-content']));
		expect(other).not.toContain('bg-muted-bg');
		expect(other).not.toContain(TAB_BAR);
	});

	it('the current tab keeps its logo', () => {
		shell();
		expect(tab('Queue')).toContainElement(screen.getByTestId('logo'));
	});

	it('no glow: the current tab carries no inline style, whatever its accent', () => {
		shell();
		expect(tab('Queue')).not.toHaveAttribute('style');
		expect(tab('Audit log')).not.toHaveAttribute('style');
	});

	it('the item accent is accepted and no longer read: the bar is always the primary token', () => {
		shell({ tabs: [{ ...TABS[0]!, accent: '#e11d48' }, TABS[1]!] });
		const el = tab('Queue');
		expect(el.outerHTML).not.toContain('#e11d48');
		expect(classes(el)).toContain(TAB_BAR);
	});

	it('square corners, current or not', () => {
		shell();
		for (const name of ['Queue', 'Audit log']) {
			expect(classes(tab(name)).filter((c) => /(^|:)rounded/.test(c)), name).toEqual([]);
		}
	});

	it('uses no raw palette class, no dark: variant and no uppercase', () => {
		shell();
		for (const name of ['Queue', 'Audit log']) {
			expect(classes(tab(name)).filter((c) => c.startsWith('dark:') || c.includes('uppercase') || /(?:bg|text|ring)-(?:gray|slate|zinc|neutral|blue|white|black)/.test(c)), name).toEqual([]);
		}
	});
});

describe('rail look: side-menu rows', () => {
	it('the current row has neutral text, the grey fill, weight 500 and the bar on its left in the primary colour', () => {
		shell();
		const current = classes(row('Overview'));
		expect(current).toEqual(expect.arrayContaining(['text-content', 'bg-muted-bg', 'font-medium', ROW_BAR]));
		expect(current).not.toContain('bg-primary-light');
		expect(current).not.toContain('text-primary');
		expect(current).not.toContain('text-muted');
	});

	it('an inactive row is unchanged: muted text, no fill, no bar, grey fill and dark text on hover', () => {
		shell();
		const other = classes(row('Jobs, 3'));
		expect(other).toEqual(expect.arrayContaining(['text-muted', 'hover:bg-muted-bg', 'hover:text-content']));
		expect(other).not.toContain('bg-muted-bg');
		expect(other).not.toContain(ROW_BAR);
	});

	it('the bar of a row is on the left, the bar of a tab under it (never the other way round)', () => {
		shell();
		expect(classes(row('Overview'))).not.toContain(TAB_BAR);
		expect(classes(tab('Queue'))).not.toContain(ROW_BAR);
	});

	it('square corners, current or not', () => {
		shell();
		for (const name of ['Overview', 'Jobs, 3']) {
			expect(classes(row(name)).filter((c) => /(^|:)rounded/.test(c)), name).toEqual([]);
		}
	});

	it('no glow: a row carries no inline style', () => {
		shell();
		expect(row('Overview')).not.toHaveAttribute('style');
	});
});

describe('rail look: the icons-only side menu (resizable under 6rem)', () => {
	beforeEach(() => localStorage.setItem('app-shell.menu-width', '4'));

	it('the current row keeps the fill and the bar on the left, square', () => {
		shell({ menuVariant: 'resizable', resizeLabel: 'Resize the menu' });
		const current = classes(row('Overview'));
		expect(current).toEqual(expect.arrayContaining(['text-content', 'bg-muted-bg', 'font-medium', ROW_BAR]));
		expect(current.filter((c) => /(^|:)rounded/.test(c))).toEqual([]);
		expect(classes(row('Jobs, 3'))).not.toContain(ROW_BAR);
	});
});

describe('rail look: barOnScroll states keep the bar', () => {
	it.each(['shrink', 'icons'] as const)('%s: once scrolled, the current tab has its fill and the bar, the other tab has neither', (barOnScroll) => {
		shell({ barOnScroll });
		scrollTo(100);
		const current = classes(tab('Queue'));
		expect(current).toEqual(expect.arrayContaining(['text-content', 'bg-muted-bg', 'font-medium', TAB_BAR]));
		expect(classes(tab('Audit log'))).not.toContain(TAB_BAR);
		expect(tab('Queue')).not.toHaveAttribute('style', expect.stringContaining('gradient'));
	});

	it('shrink: the tab is the small density and still has the bar', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		expect(classes(tab('Queue'))).toEqual(expect.arrayContaining(['text-xs', TAB_BAR]));
	});

	it('icons: the current tab is an icon with the bar; the name stays for assistive technology', () => {
		shell({ barOnScroll: 'icons' });
		scrollTo(100);
		const current = tab('Queue');
		expect(current).toHaveAttribute('aria-current', 'true');
		expect(current).toContainElement(screen.getByTestId('logo'));
		expect(classes(current)).toContain(TAB_BAR);
	});

	it('icons: a current tab without icon shows its initials and still has the bar', () => {
		shell({ barOnScroll: 'icons', tabs: [{ id: 'audit', label: 'Audit log', href: '/audit', current: 'true' }] });
		scrollTo(100);
		expect(tab('Audit log').querySelector('[aria-hidden="true"]')).toHaveTextContent('AL');
		expect(classes(tab('Audit log'))).toContain(TAB_BAR);
	});

	it('the bar is back at the top of the page with the same classes (no state-dependent look)', () => {
		shell({ barOnScroll: 'shrink' });
		const before = classes(tab('Queue')).filter((c) => c === TAB_BAR || c === 'bg-muted-bg');
		scrollTo(100);
		scrollTo(0);
		expect(classes(tab('Queue')).filter((c) => c === TAB_BAR || c === 'bg-muted-bg')).toEqual(before);
	});
});

describe('rail look: the badge pill on a current entry', () => {
	// The row is bg-muted-bg now: the pill must not be the same fill with a border that blends in. Surface fill, primary ink.
	it('a current row pill is drawn on the surface with the primary ink and edge, not on the grey of its row', () => {
		shell({ menu: { ...MENU, items: [{ id: 'jobs', label: 'Jobs', href: '/jobs', badge: 3, current: 'page' }] } });
		const pill = row('Jobs, 3').querySelector('[data-menu-badge]')!;
		expect(classes(pill)).toEqual(expect.arrayContaining(['bg-surface', 'text-primary', 'ring-primary/30', 'ring-1', 'ring-inset', 'shrink-0']));
		expect(classes(pill)).not.toContain('bg-muted-bg');
		expect(classes(pill)).not.toContain('bg-primary-light');
		expect(pill).toHaveTextContent('3');
	});

	it('a current tab pill gets the same treatment (muted-on-muted was under 4.5:1 in light and dark)', () => {
		shell({ tabs: [{ id: 'queue', label: 'Queue', href: '/queue', current: 'true', badge: 7 }, { id: 'audit', label: 'Audit log', href: '/audit', badge: 2 }] });
		const current = tab('Queue, 7').querySelector('[data-menu-badge]')!;
		expect(classes(current)).toEqual(expect.arrayContaining(['bg-surface', 'text-primary']));
		expect(classes(current)).not.toContain('bg-muted-bg');
		const other = tab('Audit log, 2').querySelector('[data-menu-badge]')!;
		expect(classes(other)).toEqual(expect.arrayContaining(['bg-muted-bg', 'text-muted']));
	});

	it('the pill of a current icons-only entry is not drawn; the count stays in the name and the tooltip', () => {
		shell({ barOnScroll: 'icons', tabs: [{ id: 'queue', label: 'Queue', href: '/queue', current: 'true', badge: 7 }] });
		scrollTo(100);
		expect(tab('Queue, 7').querySelector('[data-menu-badge]')).toBeNull();
		expect(tab('Queue, 7')).toHaveAttribute('title', 'Queue (7)');
	});
});
