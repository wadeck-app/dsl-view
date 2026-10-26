import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell, MENU_VARIANT_AB_OPTIONS, type AppShellProps, type ShellMenu, type ShellMenuVariant } from './AppShell.js';
import { normalizeMenuEntries } from './ShellSideMenu.js';

const TABS = [{ id: 'queue', label: 'Queue', href: '/queue', current: 'true' as const }];

const MENU: ShellMenu = {
	title: 'Queue',
	label: 'Queue pages',
	items: [
		{ id: 'overview', label: 'Overview', href: '/', icon: <i data-testid="icon-overview" />, current: 'page' },
		{ id: 'jobs', label: 'Jobs', href: '/jobs', description: 'Background jobs' },
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

const menuWidth = () => document.documentElement.style.getPropertyValue('--app-shell-menu-width');
const aside = () => screen.getByTestId('shell-menu');
// The element that scrolls: the aside itself, or the panel inside it (floating, peek).
const scroller = () => (aside().hasAttribute('data-menu-scroller') ? aside() : aside().querySelector<HTMLElement>('[data-menu-scroller]')!);
const classes = (el: Element) => el.className.split(/\s+/);
const STORAGE_KEY = 'app-shell.menu';

const VARIANTS: readonly ShellMenuVariant[] = ['classic', 'slim', 'cards', 'tiles', 'flyout', 'floating', 'tree', 'peek'];
const WIDTHS: Record<ShellMenuVariant, string> = { classic: '15rem', slim: '13rem', cards: '18rem', tiles: '5rem', flyout: '3.5rem', floating: '15.5rem', tree: '14rem', peek: '15rem' };

afterEach(() => {
	document.documentElement.style.removeProperty('--app-shell-menu-width');
	document.documentElement.style.removeProperty('--app-shell-bar-height');
	// @ts-expect-error removing the stub added by a test
	delete Element.prototype.scrollIntoView;
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
		expect(message).toContain('classic, slim, cards, tiles, flyout, floating, tree, peek');
	});

	it.each(['compact', 'rail', 'toggle', 'drawer', 'accent'])('the removed value "%s" warns and behaves as classic', (old) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		shell({ menuVariant: old as never });
		expect(menuWidth()).toBe('15rem');
		expect(String(warn.mock.calls[0]![0])).toContain(old);
		expect(screen.getByTestId('shell-menu')).toBeInTheDocument();
	});
});

describe.each(VARIANTS)('menuVariant %s (what every variant keeps)', (menuVariant) => {
	it('publishes its width on the document root and on the shell root', () => {
		const { container } = shell({ menuVariant });
		expect(menuWidth()).toBe(WIDTHS[menuVariant]);
		expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--app-shell-menu-width')).toBe(WIDTHS[menuVariant]);
		expect(aside().style.width).toBe('var(--app-shell-menu-width)');
	});

	it('is sticky under the bar and scrolls on its own', () => {
		shell({ menuVariant });
		expect(aside().style.top).toBe('var(--app-shell-bar-height)');
		expect(classes(aside())).toEqual(expect.arrayContaining(['sticky', 'self-start']));
		expect(classes(scroller())).toContain('overflow-y-auto');
		expect(scroller().contains(screen.getByRole('navigation', { name: 'Queue pages' }))).toBe(true);
	});

	it('names the menu: a heading and a navigation, links in DOM order, the current one marked', () => {
		shell({ menuVariant });
		expect(screen.getByRole('heading', { name: 'Queue' })).toBeInTheDocument();
		const links = within(screen.getByRole('navigation', { name: 'Queue pages' })).getAllByRole('link');
		expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/jobs', '/workers']);
		expect(links.map((l) => l.getAttribute('aria-current'))).toEqual(['page', null, null]);
		for (const name of ['Overview', 'Jobs', 'Workers']) {
			expect(screen.getByRole('link', { name: new RegExp(name) })).toBeInTheDocument();
		}
	});

	it('draws a labelled and an unlabelled separator: named by its label or by nothing, never focusable', () => {
		shell({ menuVariant, menu: { ...MENU, items: [...MENU.items, { kind: 'separator', id: 's2' }, { id: 'about', label: 'About', href: '/about' }] } });
		const separators = screen.getAllByRole('separator');
		expect(separators).toHaveLength(2);
		expect(separators[0]).toHaveAttribute('aria-label', 'Admin');
		expect(separators[1]).not.toHaveAttribute('aria-label');
		for (const separator of separators) {
			expect(separator.hasAttribute('tabindex')).toBe(false);
			expect(separator.querySelector('a, button')).toBeNull();
		}
		expect(separators[1]!.textContent).toBe('');
	});

	it('moves between links with the arrows, Home and End, skipping separators, and stops at the ends', () => {
		shell({ menuVariant });
		const links = within(screen.getByRole('navigation', { name: 'Queue pages' })).getAllByRole('link');
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
		shell({ menuVariant });
		for (const link of within(screen.getByRole('navigation', { name: 'Queue pages' })).getAllByRole('link')) {
			expect(link.className).toContain('focus-visible:outline');
		}
		for (const el of Array.from(aside().querySelectorAll('[class*="transition"]'))) {
			expect(classes(el), el.outerHTML.slice(0, 120)).toContain('motion-reduce:transition-none');
		}
	});

	it('uses theme tokens only: no dark: variant anywhere in the menu', () => {
		shell({ menuVariant });
		expect(aside().outerHTML).not.toMatch(/(^|[\s"'])dark:/);
	});

	it('does not touch localStorage unless it is the variant that folds', () => {
		localStorage.setItem(STORAGE_KEY, 'folded');
		shell({ menuVariant });
		if (menuVariant !== 'peek') {
			expect(menuWidth()).toBe(WIDTHS[menuVariant]);
		}
		expect(localStorage.getItem(STORAGE_KEY)).toBe('folded');
	});

	it('brings the current entry into view', () => {
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		shell({ menuVariant });
		expect(scrollIntoView).toHaveBeenCalledTimes(1);
		expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('link', { name: /Overview/ }));
		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
	});
});

describe('menuVariant slim', () => {
	it('draws one-line text rows with no icon, the current one bold with an accent line on the right edge', () => {
		shell({ menuVariant: 'slim' });
		expect(screen.queryByTestId('icon-overview')).toBeNull();
		const current = screen.getByRole('link', { name: 'Overview' });
		expect(classes(current)).toEqual(expect.arrayContaining(['font-semibold', 'after:right-0', 'after:w-0.5', 'after:bg-primary']));
		const other = screen.getByRole('link', { name: 'Jobs' });
		expect(classes(other)).not.toContain('after:bg-primary');
		expect(classes(other)).toContain('hover:bg-muted-bg');
		expect(other).not.toHaveTextContent('Background jobs');
	});
});

describe('menuVariant cards', () => {
	it('draws a card per entry with the icon, the label and the optional description', () => {
		shell({ menuVariant: 'cards' });
		const jobs = screen.getByRole('link', { name: /Jobs/ });
		expect(jobs).toHaveTextContent('Jobs');
		expect(jobs).toHaveTextContent('Background jobs');
		expect(classes(jobs)).toContain('rounded-xl');
		const overview = screen.getByRole('link', { name: 'Overview' });
		expect(overview.querySelector('[data-testid="icon-overview"]')).not.toBeNull();
		// No description given: no empty secondary line.
		expect(overview.querySelectorAll('[data-description]')).toHaveLength(0);
		expect(jobs.querySelectorAll('[data-description]')).toHaveLength(1);
	});

	it('lifts on hover, but not under reduced motion; the current card is tinted', () => {
		shell({ menuVariant: 'cards' });
		const jobs = screen.getByRole('link', { name: /Jobs/ });
		expect(classes(jobs)).toEqual(expect.arrayContaining(['hover:-translate-y-0.5', 'motion-reduce:hover:translate-y-0']));
		expect(classes(screen.getByRole('link', { name: 'Overview' }))).toContain('bg-primary-light');
	});

	it('an entry without icon gets its initials in the icon box, hidden from assistive technology', () => {
		shell({ menuVariant: 'cards' });
		const workers = screen.getByRole('link', { name: 'Workers' });
		expect(workers.querySelector('[aria-hidden="true"]')).toHaveTextContent('WO');
	});
});

describe('menuVariant tiles', () => {
	it('puts the icon above a small label; an entry without icon shows initials', () => {
		shell({ menuVariant: 'tiles' });
		const overview = screen.getByRole('link', { name: 'Overview' });
		expect(overview.firstElementChild!.querySelector('[data-testid="icon-overview"]')).not.toBeNull();
		expect(overview.lastElementChild).toHaveTextContent('Overview');
		expect(classes(overview)).toContain('flex-col');
		const workers = screen.getByRole('link', { name: 'Workers' });
		expect(workers.firstElementChild).toHaveTextContent('WO');
		expect(workers.firstElementChild).toHaveAttribute('aria-hidden', 'true');
	});

	it('fills the current tile with the accent and leaves the others plain', () => {
		shell({ menuVariant: 'tiles' });
		expect(classes(screen.getByRole('link', { name: 'Overview' }))).toEqual(expect.arrayContaining(['bg-primary-solid', 'text-on-solid']));
		expect(classes(screen.getByRole('link', { name: 'Jobs' }))).not.toContain('bg-primary-solid');
	});

	it('shows a caption as a small centred title', () => {
		shell({ menuVariant: 'tiles' });
		expect(screen.getByRole('separator', { name: 'Admin' })).toHaveTextContent('Admin');
	});
});

describe('menuVariant flyout', () => {
	const flyout = () => screen.queryByTestId('shell-menu-flyout');

	it('is icon-only: the name stays (hidden text), an entry without icon shows initials, no layout state', () => {
		shell({ menuVariant: 'flyout' });
		const jobs = screen.getByRole('link', { name: 'Jobs' });
		expect(jobs.querySelector('[aria-hidden="true"]')).toHaveTextContent('JO');
		expect(jobs.querySelector('.sr-only')).toHaveTextContent('Jobs');
		expect(screen.getByRole('link', { name: 'Overview' }).querySelector('[data-testid="icon-overview"]')).not.toBeNull();
		expect(aside()).not.toHaveAttribute('data-expanded');
	});

	it('shows the label to the right on hover and on keyboard focus, and hides it on leave and blur, width unchanged', () => {
		shell({ menuVariant: 'flyout' });
		expect(flyout()).toBeNull();
		const jobs = screen.getByRole('link', { name: 'Jobs' });
		fireEvent.mouseOver(jobs);
		expect(flyout()).toHaveTextContent('Jobs');
		expect(flyout()).toHaveAttribute('aria-hidden', 'true');
		expect(menuWidth()).toBe('3.5rem');
		fireEvent.mouseLeave(aside());
		expect(flyout()).toBeNull();
		fireEvent.focus(screen.getByRole('link', { name: 'Workers' }));
		expect(flyout()).toHaveTextContent('Workers');
		fireEvent.blur(screen.getByRole('link', { name: 'Workers' }));
		expect(flyout()).toBeNull();
	});

	it('takes the flyout out of the layout: it floats above the page, positioned right of the link', () => {
		shell({ menuVariant: 'flyout' });
		fireEvent.mouseOver(screen.getByRole('link', { name: 'Jobs' }));
		const tip = flyout()!;
		expect(classes(tip)).toEqual(expect.arrayContaining(['fixed', 'pointer-events-none']));
		expect(tip.style.left).not.toBe('');
		expect(tip.style.top).not.toBe('');
		expect(classes(tip)).toContain('motion-reduce:transition-none');
	});

	it('marks only the current entry with an accent dot', () => {
		shell({ menuVariant: 'flyout' });
		expect(within(screen.getByRole('link', { name: 'Overview' })).getByTestId('current-dot')).toHaveAttribute('aria-hidden', 'true');
		expect(within(screen.getByRole('link', { name: 'Jobs' })).queryByTestId('current-dot')).toBeNull();
	});

	it('draws a separator as a rule only, but a captioned one still shows its caption in a flyout', () => {
		shell({ menuVariant: 'flyout' });
		const separator = screen.getByRole('separator', { name: 'Admin' });
		expect(separator.textContent).toBe('');
		fireEvent.mouseOver(separator);
		expect(flyout()).toHaveTextContent('Admin');
	});

	it('hides the flyout when the menu scrolls', () => {
		shell({ menuVariant: 'flyout' });
		fireEvent.mouseOver(screen.getByRole('link', { name: 'Jobs' }));
		fireEvent.scroll(scroller());
		expect(flyout()).toBeNull();
	});

	it('shows nothing for the other variants', () => {
		shell({ menuVariant: 'classic' });
		fireEvent.mouseOver(screen.getByRole('link', { name: 'Jobs' }));
		expect(flyout()).toBeNull();
		expect(screen.getByRole('link', { name: 'Jobs' }).getAttribute('title')).toBeNull();
	});
});

describe('menuVariant floating', () => {
	it('floats a rounded, shadowed panel inside a margin that the width variable includes', () => {
		shell({ menuVariant: 'floating' });
		expect(menuWidth()).toBe('15.5rem');
		expect(classes(aside())).not.toContain('border-r');
		expect(classes(aside())).toContain('p-3');
		const panel = scroller();
		expect(classes(panel)).toEqual(expect.arrayContaining(['rounded-2xl', 'shadow-lg', 'overflow-y-auto']));
		expect(panel.parentElement).toBe(aside());
	});

	it('draws entries as pills, a caption for a labelled separator and a short rule for the other', () => {
		shell({ menuVariant: 'floating', menu: { ...MENU, items: [...MENU.items, { kind: 'separator', id: 's2' }, { id: 'about', label: 'About', href: '/about' }] } });
		expect(classes(screen.getByRole('link', { name: 'Jobs' }))).toContain('rounded-full');
		const [labelled, plain] = screen.getAllByRole('separator');
		expect(labelled).toHaveTextContent('Admin');
		expect(plain!.textContent).toBe('');
		expect(classes(plain!)).toContain('mx-3');
	});
});

describe('menuVariant tree', () => {
	it('joins the entries with a guide line and gives each a node, the current one filled', () => {
		shell({ menuVariant: 'tree' });
		const nodes = Array.from(aside().querySelectorAll('[data-node]'));
		expect(nodes).toHaveLength(3);
		for (const node of nodes) {
			expect(node).toHaveAttribute('aria-hidden', 'true');
		}
		expect(nodes.map((n) => n.getAttribute('data-node'))).toEqual(['current', 'other', 'other']);
		expect(classes(screen.getByRole('navigation', { name: 'Queue pages' }))).toEqual(expect.arrayContaining(['relative', 'before:w-px']));
		expect(screen.getByRole('link', { name: 'Overview' }).querySelector('[data-node]')).toBe(nodes[0]);
	});

	it('shows a separator as a group title (with a caption) or as a break in the line (without)', () => {
		shell({ menuVariant: 'tree', menu: { ...MENU, items: [...MENU.items, { kind: 'separator', id: 's2' }, { id: 'about', label: 'About', href: '/about' }] } });
		const [title, gap] = screen.getAllByRole('separator');
		expect(title).toHaveTextContent('Admin');
		expect(gap!.textContent).toBe('');
		// Both cover the guide line behind them.
		expect(classes(title!.firstElementChild!)).toEqual(expect.arrayContaining(['relative', 'bg-surface']));
		expect(classes(gap!)).toEqual(expect.arrayContaining(['relative', 'bg-surface']));
	});
});

describe('menuVariant peek', () => {
	const handle = () => screen.getByRole('button', { name: 'Queue pages' });
	const navWrapper = () => screen.getByRole('navigation', { name: 'Queue pages', hidden: true }).parentElement!;

	it('starts open (15rem) with a button that reports it, links reachable', () => {
		shell({ menuVariant: 'peek' });
		expect(menuWidth()).toBe('15rem');
		expect(handle()).toHaveAttribute('aria-expanded', 'true');
		expect(handle()).toHaveAttribute('aria-keyshortcuts', '[');
		expect(navWrapper()).not.toHaveAttribute('inert');
		expect(screen.getByRole('link', { name: 'Jobs' })).toHaveTextContent('Jobs');
	});

	it('folds to a 1rem sliver on click, remembers it, and unfolds on the next click', () => {
		const first = shell({ menuVariant: 'peek' });
		fireEvent.click(handle());
		expect(menuWidth()).toBe('1rem');
		expect(handle()).toHaveAttribute('aria-expanded', 'false');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('folded');
		first.unmount();
		shell({ menuVariant: 'peek' });
		expect(menuWidth()).toBe('1rem');
		fireEvent.click(handle());
		expect(menuWidth()).toBe('15rem');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('open');
	});

	it('folded: the links are out of the tab order and the accessibility tree until the menu is peeked', () => {
		localStorage.setItem(STORAGE_KEY, 'folded');
		shell({ menuVariant: 'peek' });
		expect(navWrapper()).toHaveAttribute('inert');
		expect(navWrapper()).toHaveAttribute('hidden');
		expect(screen.queryByRole('link', { name: 'Jobs' })).toBeNull();
		expect(aside()).toHaveAttribute('data-peeked', 'false');
	});

	it('peeks the whole menu on hover without moving the content, and folds back on leave', () => {
		localStorage.setItem(STORAGE_KEY, 'folded');
		shell({ menuVariant: 'peek' });
		fireEvent.mouseEnter(aside());
		expect(aside()).toHaveAttribute('data-peeked', 'true');
		expect(navWrapper()).not.toHaveAttribute('inert');
		expect(screen.getByRole('link', { name: 'Jobs' })).toHaveTextContent('Jobs');
		expect(screen.getByRole('separator', { name: 'Admin' })).toHaveTextContent('Admin');
		expect(menuWidth()).toBe('1rem');
		// The peeked panel overlays the page.
		expect(classes(scroller())).toEqual(expect.arrayContaining(['absolute', 'z-20', 'overflow-y-auto']));
		fireEvent.mouseLeave(aside());
		expect(aside()).toHaveAttribute('data-peeked', 'false');
		expect(menuWidth()).toBe('1rem');
	});

	it('peeks on keyboard focus of the handle and stays while the focus moves inside', () => {
		localStorage.setItem(STORAGE_KEY, 'folded');
		shell({ menuVariant: 'peek' });
		fireEvent.focus(handle());
		expect(aside()).toHaveAttribute('data-peeked', 'true');
		const jobs = screen.getByRole('link', { name: 'Jobs' });
		fireEvent.blur(handle(), { relatedTarget: jobs });
		expect(aside()).toHaveAttribute('data-peeked', 'true');
		fireEvent.blur(jobs, { relatedTarget: document.body });
		expect(aside()).toHaveAttribute('data-peeked', 'false');
	});

	it('open: it never peeks (nothing to reveal)', () => {
		shell({ menuVariant: 'peek' });
		fireEvent.mouseEnter(aside());
		expect(aside()).toHaveAttribute('data-peeked', 'false');
	});

	it('the "[" key toggles it when nothing is being typed in', () => {
		shell({ menuVariant: 'peek' });
		fireEvent.keyDown(document.body, { key: '[' });
		expect(menuWidth()).toBe('1rem');
		fireEvent.keyDown(document.body, { key: '[' });
		expect(menuWidth()).toBe('15rem');
	});

	it('ignores "[" typed in a field, with a modifier, or already handled', () => {
		render(<input aria-label="search" />);
		shell({ menuVariant: 'peek' });
		const input = screen.getByLabelText('search');
		fireEvent.keyDown(input, { key: '[' });
		fireEvent.keyDown(document.body, { key: '[', ctrlKey: true });
		fireEvent.keyDown(document.body, { key: '[', metaKey: true });
		fireEvent.keyDown(document.body, { key: '[', altKey: true });
		expect(menuWidth()).toBe('15rem');
	});

	it('ignores "[" in the other variants and writes nothing', () => {
		shell({ menuVariant: 'classic' });
		fireEvent.keyDown(document.body, { key: '[' });
		expect(menuWidth()).toBe('15rem');
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('an unknown stored value warns, naming the key and the values, and stays open', () => {
		localStorage.setItem(STORAGE_KEY, 'sideways');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		shell({ menuVariant: 'peek' });
		expect(menuWidth()).toBe('15rem');
		const message = String(warn.mock.calls[0]![0]);
		expect(message).toContain(STORAGE_KEY);
		expect(message).toContain('sideways');
		expect(message).toContain('open, folded');
	});

	it('says so, and still works for this page, when the storage refuses the write', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		shell({ menuVariant: 'peek' });
		fireEvent.click(handle());
		expect(menuWidth()).toBe('1rem');
		expect(String(error.mock.calls[0]![0])).toContain('QuotaExceededError');
		expect(String(error.mock.calls[0]![0])).toContain(STORAGE_KEY);
	});
});
