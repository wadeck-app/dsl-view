import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type AppShellProps, type ShellMenu } from './AppShell.js';
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

const menuWidth = () => document.documentElement.style.getPropertyValue('--app-shell-menu-width');
const aside = () => screen.getByTestId('shell-menu');
const STORAGE_KEY = 'app-shell.menu';

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

describe('menu separators', () => {
	it('renders a labelled separator as a caption, named by its label, and it is not focusable', () => {
		shell();
		const separator = screen.getByRole('separator', { name: 'Admin' });
		expect(separator).toHaveTextContent('Admin');
		expect(separator.hasAttribute('tabindex')).toBe(false);
		expect(separator.querySelector('a, button')).toBeNull();
	});

	it('renders an unlabelled separator as a plain rule with no name', () => {
		shell({ menu: { ...MENU, items: [MENU.items[0]!, { kind: 'separator', id: 's' }, MENU.items[1]!] } });
		const separator = screen.getByRole('separator');
		expect(separator).not.toHaveAttribute('aria-label');
		expect(separator.textContent).toBe('');
	});

	it('skips leading, trailing and doubled separators from the data without a message', () => {
		const warn = vi.spyOn(console, 'warn');
		const error = vi.spyOn(console, 'error');
		shell({ menu: { ...MENU, items: [{ kind: 'separator', id: 'a' }, MENU.items[0]!, { kind: 'separator', id: 'b' }, { kind: 'separator', id: 'c' }, MENU.items[1]!, { kind: 'separator', id: 'd' }] } });
		expect(screen.getAllByRole('separator')).toHaveLength(1);
		expect(screen.getAllByRole('link')).toHaveLength(3);
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	});

	it('is left out of the arrow-key navigation', () => {
		shell();
		const nav = screen.getByRole('navigation', { name: 'Queue pages' });
		const links = within(nav).getAllByRole('link');
		links[1]!.focus();
		fireEvent.keyDown(links[1]!, { key: 'ArrowDown' });
		expect(document.activeElement).toBe(links[2]);
		expect(links[2]).toHaveTextContent('Workers');
	});

	it('is a rule only when the menu is collapsed (rail): no caption text', () => {
		shell({ menuVariant: 'rail' });
		const separator = screen.getByRole('separator', { name: 'Admin' });
		expect(separator.textContent).toBe('');
	});
});

describe('menu keyboard', () => {
	it('moves between links with the arrows, Home and End, and stops at the ends', () => {
		shell();
		const links = within(screen.getByRole('navigation', { name: 'Queue pages' })).getAllByRole('link');
		links[0]!.focus();
		fireEvent.keyDown(links[0]!, { key: 'ArrowUp' });
		expect(document.activeElement).toBe(links[0]);
		fireEvent.keyDown(links[0]!, { key: 'End' });
		expect(document.activeElement).toBe(links[2]);
		fireEvent.keyDown(links[2]!, { key: 'ArrowDown' });
		expect(document.activeElement).toBe(links[2]);
		fireEvent.keyDown(links[2]!, { key: 'Home' });
		expect(document.activeElement).toBe(links[0]);
		fireEvent.keyDown(links[0]!, { key: 'ArrowDown' });
		expect(document.activeElement).toBe(links[1]);
	});

	it('leaves other keys alone', () => {
		shell();
		const links = within(screen.getByRole('navigation', { name: 'Queue pages' })).getAllByRole('link');
		links[0]!.focus();
		const notCancelled = fireEvent.keyDown(links[0]!, { key: 'a' });
		expect(notCancelled).toBe(true);
		expect(document.activeElement).toBe(links[0]);
	});

	it('gives the links a visible focus ring', () => {
		shell();
		expect(screen.getByRole('link', { name: 'Jobs' }).className).toContain('focus-visible:outline');
	});

	it('brings the current entry into view', () => {
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		shell();
		expect(scrollIntoView).toHaveBeenCalledTimes(1);
		expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('link', { name: 'Overview' }));
		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
	});
});

describe('menuVariant classic (default)', () => {
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
		expect(message).toContain('classic, compact, rail, toggle, drawer, accent');
	});
});

describe('menuVariant compact', () => {
	it('is 11rem with denser rows', () => {
		shell({ menuVariant: 'compact' });
		expect(menuWidth()).toBe('11rem');
		const classes = screen.getByRole('link', { name: 'Jobs' }).className.split(/\s+/);
		expect(classes).toContain('text-xs');
		expect(classes).toContain('py-1');
		expect(screen.getByRole('link', { name: 'Jobs' })).toHaveTextContent('Jobs');
	});
});

describe('menuVariant accent', () => {
	it('keeps the classic width, marks the current entry with a 3px bar and enlarges the hit area', () => {
		shell({ menuVariant: 'accent' });
		expect(menuWidth()).toBe('15rem');
		const current = screen.getByRole('link', { name: 'Overview' }).className.split(/\s+/);
		expect(current).toContain('before:w-[3px]');
		expect(current).toContain('before:bg-primary');
		expect(current).toContain('bg-primary-light');
		const other = screen.getByRole('link', { name: 'Jobs' }).className.split(/\s+/);
		expect(other).not.toContain('before:bg-primary');
		expect(other).toContain('py-2.5');
	});

	it('draws a labelled separator as a small-caps group caption', () => {
		shell({ menuVariant: 'accent' });
		expect(screen.getByRole('separator', { name: 'Admin' }).firstElementChild!.getAttribute('style')).toContain('font-variant-caps: all-small-caps');
	});
});

describe('menuVariant rail', () => {
	it('is 3.5rem wide, icon only: the name stays (tooltip, hidden text), an entry without icon shows initials', () => {
		shell({ menuVariant: 'rail' });
		expect(menuWidth()).toBe('3.5rem');
		const overview = screen.getByRole('link', { name: 'Overview' });
		expect(overview.getAttribute('title')).toBe('Overview');
		expect(overview.querySelector('[data-testid="icon-overview"]')).not.toBeNull();
		const jobs = screen.getByRole('link', { name: 'Jobs' });
		expect(jobs.querySelector('[aria-hidden="true"]')).toHaveTextContent('JO');
		expect(jobs.querySelector('.sr-only')).toHaveTextContent('Jobs');
	});

	it('expands over the content on hover without moving it: the width variable stays', () => {
		shell({ menuVariant: 'rail' });
		expect(aside()).toHaveAttribute('data-expanded', 'false');
		fireEvent.mouseEnter(aside());
		expect(aside()).toHaveAttribute('data-expanded', 'true');
		expect(menuWidth()).toBe('3.5rem');
		expect(screen.getByRole('link', { name: 'Jobs' })).toHaveTextContent('Jobs');
		expect(screen.getByRole('link', { name: 'Jobs' }).getAttribute('title')).toBeNull();
		expect(screen.getByRole('separator', { name: 'Admin' })).toHaveTextContent('Admin');
		fireEvent.mouseLeave(aside());
		expect(aside()).toHaveAttribute('data-expanded', 'false');
	});

	it('expands on keyboard focus too, and folds back when the focus leaves, not when it moves inside', () => {
		shell({ menuVariant: 'rail' });
		const links = screen.getAllByRole('link', { name: /Overview|Jobs|Workers/ });
		fireEvent.focus(links[0]!);
		expect(aside()).toHaveAttribute('data-expanded', 'true');
		fireEvent.blur(links[0]!, { relatedTarget: links[1] });
		expect(aside()).toHaveAttribute('data-expanded', 'true');
		fireEvent.blur(links[1]!, { relatedTarget: document.body });
		expect(aside()).toHaveAttribute('data-expanded', 'false');
	});

	it('overlays: the expanded panel is out of the flow, absolutely positioned, above the content', () => {
		shell({ menuVariant: 'rail' });
		const panel = screen.getByRole('navigation', { name: 'Queue pages' }).parentElement!;
		const classes = panel.className.split(/\s+/);
		expect(classes).toEqual(expect.arrayContaining(['absolute', 'z-20', 'overflow-y-auto']));
		expect(classes).toContain('motion-reduce:transition-none');
	});
});

describe('menuVariant toggle', () => {
	const toggleButton = () => screen.getByRole('button', { name: 'Queue pages' });

	it('starts open (15rem) with a button that reports it', () => {
		shell({ menuVariant: 'toggle' });
		expect(menuWidth()).toBe('15rem');
		expect(toggleButton()).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('link', { name: 'Jobs' })).toHaveTextContent('Jobs');
	});

	it('folds to the rail on click, remembers it, and unfolds on the next click', () => {
		const first = shell({ menuVariant: 'toggle' });
		fireEvent.click(toggleButton());
		expect(menuWidth()).toBe('3.5rem');
		expect(toggleButton()).toHaveAttribute('aria-expanded', 'false');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('folded');
		expect(screen.getByRole('link', { name: 'Jobs' }).getAttribute('title')).toBe('Jobs');
		first.unmount();
		shell({ menuVariant: 'toggle' });
		expect(menuWidth()).toBe('3.5rem');
		fireEvent.click(toggleButton());
		expect(menuWidth()).toBe('15rem');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('open');
	});

	it('does not expand over the content on hover once folded (the button does)', () => {
		localStorage.setItem(STORAGE_KEY, 'folded');
		shell({ menuVariant: 'toggle' });
		fireEvent.mouseEnter(aside());
		expect(screen.getByRole('link', { name: 'Jobs' }).getAttribute('title')).toBe('Jobs');
	});

	it('the "[" key toggles it when nothing is being typed in', () => {
		shell({ menuVariant: 'toggle' });
		fireEvent.keyDown(document.body, { key: '[' });
		expect(menuWidth()).toBe('3.5rem');
		fireEvent.keyDown(document.body, { key: '[' });
		expect(menuWidth()).toBe('15rem');
	});

	it('ignores "[" typed in a field, with a modifier, or already handled', () => {
		render(<input aria-label="search" />);
		shell({ menuVariant: 'toggle' });
		const input = screen.getByLabelText('search');
		fireEvent.keyDown(input, { key: '[' });
		fireEvent.keyDown(document.body, { key: '[', ctrlKey: true });
		fireEvent.keyDown(document.body, { key: '[', metaKey: true });
		fireEvent.keyDown(document.body, { key: '[', altKey: true });
		expect(menuWidth()).toBe('15rem');
	});

	it('ignores "[" in the other variants', () => {
		shell({ menuVariant: 'classic' });
		fireEvent.keyDown(document.body, { key: '[' });
		expect(menuWidth()).toBe('15rem');
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('reads and writes nothing in the other variants', () => {
		localStorage.setItem(STORAGE_KEY, 'folded');
		shell({ menuVariant: 'classic' });
		expect(menuWidth()).toBe('15rem');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('folded');
	});

	it('an unknown stored value warns, naming the key and the values, and stays open', () => {
		localStorage.setItem(STORAGE_KEY, 'sideways');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		shell({ menuVariant: 'toggle' });
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
		shell({ menuVariant: 'toggle' });
		fireEvent.click(toggleButton());
		expect(menuWidth()).toBe('3.5rem');
		expect(String(error.mock.calls[0]![0])).toContain('QuotaExceededError');
		expect(String(error.mock.calls[0]![0])).toContain(STORAGE_KEY);
	});
});

describe('menuVariant drawer', () => {
	const opener = () => screen.getByRole('button', { name: 'Queue pages' });

	it('has no permanent column: no aside, width 0', () => {
		shell({ menuVariant: 'drawer' });
		expect(screen.queryByTestId('shell-menu')).not.toBeInTheDocument();
		expect(menuWidth()).toBe('0px');
		expect(opener()).toHaveAttribute('aria-expanded', 'false');
		expect(opener()).toHaveAttribute('aria-haspopup', 'dialog');
		// The menu button comes first in the bar.
		expect(screen.getByRole('banner').querySelector('button')).toBe(opener());
	});

	it('opens the menu as a dialog over the content, with the same links and separators', () => {
		shell({ menuVariant: 'drawer' });
		fireEvent.click(opener());
		const dialog = screen.getByRole('dialog');
		expect(opener()).toHaveAttribute('aria-expanded', 'true');
		expect(within(dialog).getAllByRole('link').map((l) => l.textContent)).toEqual(['Overview', 'Jobs', 'Workers']);
		expect(within(dialog).getByRole('separator', { name: 'Admin' })).toBeInTheDocument();
	});

	it('closes on Escape', () => {
		shell({ menuVariant: 'drawer' });
		fireEvent.click(opener());
		fireEvent.keyDown(document, { key: 'Escape' });
		act(() => {});
		expect(opener()).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes after a link was used (the host navigates)', () => {
		shell({ menuVariant: 'drawer', renderLink: ({ href, children, ...rest }) => <a href={href} onClick={(e) => e.preventDefault()} {...rest}>{children}</a> });
		fireEvent.click(opener());
		fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Jobs' }));
		expect(opener()).toHaveAttribute('aria-expanded', 'false');
	});

	it('keeps the bar, the tabs and the content as usual', () => {
		shell({ menuVariant: 'drawer' });
		expect(screen.getByRole('navigation', { name: 'Modules' })).toBeInTheDocument();
		expect(screen.getByText('content')).toBeInTheDocument();
	});
});

describe('menu variants and the sticky frame', () => {
	it('every variant with a column stays sticky under the bar with its own scrollbar', () => {
		for (const menuVariant of ['classic', 'compact', 'toggle', 'accent', 'rail'] as const) {
			const { unmount } = shell({ menuVariant });
			expect(aside().style.top).toBe('var(--app-shell-bar-height)');
			expect(aside().className.split(/\s+/)).toEqual(expect.arrayContaining(['sticky', 'self-start']));
			// The scroller is the aside, or the panel inside it for the rail (so the expanded panel can overflow sideways).
			const scroller = menuVariant === 'rail' ? screen.getByRole('navigation', { name: 'Queue pages' }).parentElement! : aside();
			expect(scroller.className.split(/\s+/)).toContain('overflow-y-auto');
			unmount();
		}
	});
});
