import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type AppShellProps, type ShellItem, type ShellLinkProps } from './AppShell.js';

// No router anywhere in this file: the shell renders plain data and plain links.

const asBackgroundImage = (css: string): string => {
	const probe = document.createElement('i');
	probe.style.backgroundImage = css;
	return probe.style.backgroundImage;
};
const mixed = (color: string, pct: number): string => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const upBlend = (color: string): string =>
	`radial-gradient(60% 90% at 50% 100%, ${mixed(color, 32)}, transparent 100%), linear-gradient(0deg, ${mixed(color, 14)}, transparent)`;

const TABS: ShellItem[] = [
	{ id: 'home', label: 'Home', href: '/', icon: <i data-testid="icon-home" />, current: 'page' },
	{ id: 'a', label: 'Alpha', href: '/a', icon: <i data-testid="icon-a" />, accent: '#e11d48' },
	{ id: 'b', label: 'Beta', href: '/b', icon: <i data-testid="icon-b" />, accent: '#0284c7' },
];
const MENU = {
	title: 'Home',
	label: 'Home pages',
	items: [
		{ id: 'overview', label: 'Overview', href: '/', current: 'page' as const },
		{ id: 'reports', label: 'Reports', href: '/reports', icon: <i data-testid="icon-reports" /> },
	],
};

const shell = (props: Partial<AppShellProps> = {}) =>
	render(
		<AppShell brand="my-app" tabs={TABS} tabsLabel="Sections" menu={MENU} actions={<button type="button">Actions</button>} {...props}>
			<p>page content</p>
		</AppShell>,
	);

describe('AppShell without any router', () => {
	it('renders plain links with the given hrefs', () => {
		shell();
		const tabs = within(screen.getByRole('navigation', { name: 'Sections' }));
		expect(tabs.getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
			['Home', '/'],
			['Alpha', '/a'],
			['Beta', '/b'],
		]);
		const menu = within(screen.getByRole('navigation', { name: 'Home pages' }));
		expect(menu.getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/', '/reports']);
	});

	it('puts the brand and the actions in the top bar and the children in the main area', () => {
		shell();
		const bar = within(screen.getByRole('banner'));
		expect(bar.getByText('my-app')).toBeInTheDocument();
		expect(bar.getByRole('button', { name: 'Actions' })).toBeInTheDocument();
		expect(within(screen.getByRole('main')).getByText('page content')).toBeInTheDocument();
	});

	it('works without actions', () => {
		shell({ actions: undefined });
		expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
	});
});

describe('AppShell top bar', () => {
	it('is 44px, borderless, and separated from the page by a soft shadow', () => {
		shell();
		const classes = screen.getByRole('banner').className.split(/\s+/);
		for (const c of ['shadow-sm', 'bg-surface']) expect(classes).toContain(c);
		expect(screen.getByRole('banner').style.height).toBe('var(--app-shell-bar-height)');
		expect(classes).not.toContain('border-b');
	});

	it('shows each tab icon before its label', () => {
		shell();
		const alpha = screen.getByRole('link', { name: 'Alpha' });
		expect(within(alpha).getByTestId('icon-a')).toBeInTheDocument();
		// The icon sits in a box of its own (it is scaled when the bar is scrolled): the box is first, the icon inside it.
		expect(alpha.firstElementChild).toContainElement(within(alpha).getByTestId('icon-a'));
		expect(alpha.firstElementChild).not.toHaveTextContent('Alpha');
	});
});

describe('AppShell tabs: the current one is highlighted', () => {
	it('marks the current tab with the aria-current the host chose, and only that one', () => {
		shell({ tabs: [{ ...TABS[0], current: undefined }, { ...TABS[1], current: 'true' }, TABS[2]] });
		const tabs = within(screen.getByRole('navigation', { name: 'Sections' }));
		expect(tabs.getByRole('link', { name: 'Alpha' })).toHaveAttribute('aria-current', 'true');
		expect(tabs.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
		expect(tabs.getByRole('link', { name: 'Beta' })).not.toHaveAttribute('aria-current');
	});

	it('paints the current tab with Up blend in its own accent', () => {
		shell({ tabs: [{ ...TABS[1], current: 'true' }] });
		expect(screen.getByRole('link', { name: 'Alpha' }).style.backgroundImage).toBe(asBackgroundImage(upBlend('#e11d48')));
	});

	it('falls back to the theme accent for a current tab without an accent', () => {
		shell();
		expect(screen.getByRole('link', { name: 'Home' }).style.backgroundImage).toBe(asBackgroundImage(upBlend('var(--color-primary-solid)')));
	});

	it('leaves the other tabs plain', () => {
		shell();
		for (const name of ['Alpha', 'Beta']) {
			const tab = screen.getByRole('link', { name });
			expect(tab.style.backgroundImage, name).toBe('');
			expect(tab.className, name).toContain('text-muted');
			expect(tab.className, name).toContain('font-medium');
		}
	});

	it('gives the current tab a bolder, darker label', () => {
		shell();
		const current = screen.getByRole('link', { name: 'Home' });
		expect(current.className).toContain('font-semibold');
		expect(current.className).toContain('text-content');
	});

	it('makes every tab as tall as the top bar, so the highlight fills it', () => {
		shell();
		const nav = screen.getByRole('navigation', { name: 'Sections' });
		expect(nav.className).toContain('self-stretch');
		for (const tab of within(nav).getAllByRole('link')) {
			expect(tab.className).toContain('self-stretch');
			expect(tab.className).not.toMatch(/\bpy-/);
		}
	});

	it('keeps the same tab shape current or not', () => {
		shell();
		const shape = (el: HTMLElement) => el.className.split(/\s+/).filter((c) => /^(self-stretch|px-|gap-|flex|items-)/.test(c)).sort();
		expect(shape(screen.getByRole('link', { name: 'Home' }))).toEqual(shape(screen.getByRole('link', { name: 'Alpha' })));
	});
});

describe('AppShell side menu', () => {
	const menu = () => screen.getByTestId('shell-menu');

	it('has no visible header: the title is a hidden heading and the entries start at the top', () => {
		shell();
		const heading = within(menu()).getByRole('heading', { name: 'Home' });
		expect(heading.className).toContain('sr-only');
		const scroller = menu().querySelector('[data-menu-scroller]')!;
		expect(scroller.firstElementChild).toBe(heading);
		expect(scroller.children[1]).toBe(screen.getByRole('navigation', { name: 'Home pages' }));
	});

	it('marks the current entry', () => {
		shell();
		const m = within(menu());
		expect(m.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
		expect(m.getByRole('link', { name: 'Reports' })).not.toHaveAttribute('aria-current');
	});

	it('shows an entry icon only where the host gave one', () => {
		shell();
		expect(within(screen.getByRole('link', { name: 'Reports' })).getByTestId('icon-reports')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Overview' }).querySelector('i')).toBeNull();
	});

	it('is painted with theme tokens only, so it follows the theme and nests in a ThemeScope', () => {
		shell();
		const every = [screen.getByRole('banner'), menu(), screen.getByRole('navigation', { name: 'Sections' }), ...screen.getAllByRole('link')];
		for (const el of every) {
			const classes = el.className.split(/\s+/);
			expect(classes.filter((c) => c.startsWith('dark:') || /-(slate|gray|zinc|neutral)-\d/.test(c)), el.textContent ?? el.tagName).toEqual([]);
		}
		expect(menu().className.split(/\s+/)).toContain('bg-surface');
		expect(menu().className.split(/\s+/)).toContain('border-border');
	});

	it('highlights the current entry with the accent tokens', () => {
		shell();
		const current = screen.getByRole('link', { name: 'Overview' }).className.split(/\s+/);
		expect(current).toContain('bg-primary-light');
		expect(current).toContain('text-primary');
		const other = screen.getByRole('link', { name: 'Reports' }).className.split(/\s+/);
		expect(other).toContain('text-muted');
		expect(other).not.toContain('bg-primary-light');
	});
});

describe('AppShell skip link', () => {
	it('renders no skip link unless the host gives its text', () => {
		shell();
		expect(screen.queryByRole('link', { name: /skip/i })).not.toBeInTheDocument();
	});

	it('links to the main area, which can take focus', () => {
		shell({ skipLabel: 'Skip to content' });
		const skip = screen.getByRole('link', { name: 'Skip to content' });
		const main = screen.getByRole('main');
		expect(main.id).not.toBe('');
		expect(skip.getAttribute('href')).toBe(`#${main.id}`);
		expect(main).toHaveAttribute('tabindex', '-1');
		// Hidden until it has keyboard focus.
		expect(skip.className.split(/\s+/)).toContain('sr-only');
		expect(skip.className.split(/\s+/)).toContain('focus:not-sr-only');
	});

	it('comes before the top bar in tab order', () => {
		shell({ skipLabel: 'Skip to content' });
		const skip = screen.getByRole('link', { name: 'Skip to content' });
		expect(skip.compareDocumentPosition(screen.getByRole('banner')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('gives two shells on one page distinct targets', () => {
		render(
			<>
				<AppShell brand="a" tabs={[]} tabsLabel="A tabs" menu={{ ...MENU, label: 'A menu' }} skipLabel="Skip A">
					x
				</AppShell>
				<AppShell brand="b" tabs={[]} tabsLabel="B tabs" menu={{ ...MENU, label: 'B menu' }} skipLabel="Skip B">
					y
				</AppShell>
			</>,
		);
		expect(screen.getByRole('link', { name: 'Skip A' }).getAttribute('href')).not.toBe(screen.getByRole('link', { name: 'Skip B' }).getAttribute('href'));
	});
});

describe('AppShell renderLink slot', () => {
	it('lets the host render every link (routers) and receives the same props the default link would', () => {
		const seen: ShellLinkProps[] = [];
		shell({
			renderLink: (props) => {
				seen.push(props);
				const { href, children, ...rest } = props;
				return (
					<a data-custom="yes" href={`#${href}`} {...rest}>
						{children}
					</a>
				);
			},
		});
		// Every tab and every menu entry went through the slot.
		expect(seen).toHaveLength(TABS.length + MENU.items.length);
		expect(document.querySelectorAll('a[data-custom="yes"]')).toHaveLength(seen.length);
		expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('href', '#/a');
		// The host gets what it needs to render the link correctly.
		const home = seen.find((p) => p.href === '/' && p['aria-current'] === 'page' && p.className.includes('self-stretch'))!;
		expect(home.className).toContain('font-semibold');
		expect(home.style?.backgroundImage).toContain('radial-gradient');
		const reports = seen.find((p) => p.href === '/reports')!;
		expect(reports['aria-current']).toBeUndefined();
	});

	it('calls the slot once per item and render', () => {
		const renderLink = vi.fn((props: ShellLinkProps) => <a href={props.href}>{props.children}</a>);
		shell({ renderLink });
		expect(renderLink).toHaveBeenCalledTimes(TABS.length + MENU.items.length);
	});
});

describe('AppShell publishes the width of its side menu', () => {
	const VAR = '--app-shell-menu-width';
	const published = () => document.documentElement.style.getPropertyValue(VAR);

	afterEach(() => {
		document.documentElement.style.removeProperty(VAR);
		document.documentElement.style.removeProperty('--app-shell-bar-height');
	});

	// On <html>, not on the shell: the A/B dock is mounted outside the shell and a custom property only inherits downwards.
	it('sets the variable on the document root, equal to the width of the menu', () => {
		shell();
		expect(published()).toBe('15rem');
		expect(screen.getByTestId('shell-menu').style.width).toBe('var(--app-shell-menu-width)');
	});

	it('publishes the bar height next to it, on the document root', () => {
		shell();
		expect(document.documentElement.style.getPropertyValue('--app-shell-bar-height')).toBe('2.75rem');
	});

	it('declares both variables on the shell itself too, so the first paint already has them', () => {
		const { container } = shell();
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue('--app-shell-menu-width')).toBe('15rem');
		expect(root.style.getPropertyValue('--app-shell-bar-height')).toBe('2.75rem');
	});

	it('removes it when the shell unmounts, so a page without a shell has no inset', () => {
		const { unmount } = shell();
		unmount();
		expect(published()).toBe('');
	});

	it('keeps it until the last of several mounted shells unmounts, whatever the unmount order', () => {
		const first = shell();
		const second = shell();
		first.unmount();
		expect(published()).toBe('15rem');
		second.unmount();
		expect(published()).toBe('');
	});
});

describe('AppShell stays in place while the page scrolls', () => {
	const classesOf = (el: HTMLElement) => el.className.split(/\s+/);

	it('keeps the top bar stuck to the top, above the content and below dialogs, drawers and toasts', () => {
		shell();
		const bar = screen.getByRole('banner');
		expect(classesOf(bar)).toEqual(expect.arrayContaining(['sticky', 'top-0']));
		// Content stickies (back link, table header) are z-10; dialogs, toasts and popovers are z-50, the drawer overlay z-40.
		expect(classesOf(bar)).toContain('z-30');
	});

	it('keeps the side menu stuck right under the bar, as tall as the rest of the window, with its own scrollbar', () => {
		shell();
		const menu = screen.getByTestId('shell-menu');
		expect(menu.style.top).toBe('var(--app-shell-bar-height)');
		const classes = classesOf(menu);
		// self-start: a stretched flex item is as tall as the page and has nothing to stick against.
		expect(classes).toEqual(expect.arrayContaining(['sticky', 'self-start']));
		// The scroll box is inside the frame (the resize handle of the `resizable` menu sits outside it).
		expect(classesOf(menu.querySelector('[data-menu-scroller]')!)).toContain('overflow-y-auto');
		expect(classes).toContain('h-[calc(100vh-var(--app-shell-bar-height))]');
		expect(classes).toContain('supports-[height:100dvh]:h-[calc(100dvh-var(--app-shell-bar-height))]');
	});

	it('draws the skip link above the sticky bar when it has the focus', () => {
		shell({ skipLabel: 'Skip to content' });
		expect(classesOf(screen.getByRole('link', { name: 'Skip to content' }))).toContain('focus:z-40');
	});
});
