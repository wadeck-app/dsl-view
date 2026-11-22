// `menuHidden`: the host (app-core) takes the side menu away for a page that opts in to a retractable menu, and brings it back.
// Controlled: the shell keeps no state of its own about it.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell, type AppShellProps, type ShellMenu } from './AppShell.js';

const TABS = [{ id: 'queue', label: 'Queue', href: '/queue', current: 'true' as const }];
const MENU: ShellMenu = {
	title: 'Queue',
	label: 'Queue pages',
	items: [
		{ id: 'overview', label: 'Overview', href: '/', current: 'page' },
		{ id: 'jobs', label: 'Jobs', href: '/jobs' },
	],
};
const VAR = '--app-shell-menu-width';
const STORAGE_KEY = 'app-shell.menu-width';

// jsdom has no PointerEvent: without one fireEvent.pointer* sends a plain Event with no pointerId, button or clientX.
class FakePointerEvent extends MouseEvent {
	readonly pointerId: number;
	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 0;
	}
}

const tree = (props: Partial<AppShellProps> = {}) => (
	<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} resizeLabel="Resize the menu" {...props}>
		<p>content</p>
	</AppShell>
);
const menuWidth = () => document.documentElement.style.getPropertyValue(VAR);
const shellRoot = (container: HTMLElement) => container.firstElementChild as HTMLElement;

beforeEach(() => {
	localStorage.clear();
	vi.stubGlobal('PointerEvent', FakePointerEvent);
	Element.prototype.setPointerCapture = () => undefined;
	Element.prototype.releasePointerCapture = () => undefined;
	Element.prototype.hasPointerCapture = () => false;
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('AppShell menuHidden', () => {
	it('is shown by default: the aside is there', () => {
		render(tree());
		expect(screen.getByTestId('shell-menu')).toBeInTheDocument();
		expect(screen.getByRole('navigation', { name: 'Queue pages' })).toBeInTheDocument();
	});

	it('renders no aside, no menu navigation and no backdrop when hidden', () => {
		render(tree({ menuHidden: true }));
		expect(screen.queryByTestId('shell-menu')).toBeNull();
		expect(screen.queryByRole('navigation', { name: 'Queue pages' })).toBeNull();
		expect(screen.queryByTestId('shell-menu-backdrop')).toBeNull();
		// The tabs of the top bar and the content stay.
		expect(screen.getByRole('navigation', { name: 'Modules' })).toBeInTheDocument();
		expect(screen.getByText('content')).toBeInTheDocument();
	});

	it('publishes a 0px menu width while hidden, on the document root and on the shell root', () => {
		const { container } = render(tree({ menuHidden: true }));
		expect(menuWidth()).toBe('0px');
		expect(shellRoot(container).style.getPropertyValue(VAR)).toBe('0px');
	});

	it('hides and shows again with the same props otherwise: the width comes back', () => {
		const { rerender } = render(tree());
		expect(menuWidth()).toBe('15rem');
		rerender(tree({ menuHidden: true }));
		expect(menuWidth()).toBe('0px');
		expect(screen.queryByTestId('shell-menu')).toBeNull();
		rerender(tree({ menuHidden: false }));
		expect(menuWidth()).toBe('15rem');
		expect(screen.getByTestId('shell-menu')).toBeInTheDocument();
	});

	it('keeps the width the user gave a resizable menu across a hide and a show, and does not touch the stored value', () => {
		localStorage.setItem(STORAGE_KEY, '20');
		const { rerender } = render(tree({ menuVariant: 'resizable' }));
		expect(menuWidth()).toBe('20rem');
		rerender(tree({ menuVariant: 'resizable', menuHidden: true }));
		expect(menuWidth()).toBe('0px');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('20');
		rerender(tree({ menuVariant: 'resizable', menuHidden: false }));
		expect(menuWidth()).toBe('20rem');
		expect(localStorage.getItem(STORAGE_KEY)).toBe('20');
	});

	it('keeps a width dragged in this session across a hide and a show', () => {
		const { rerender } = render(tree({ menuVariant: 'resizable' }));
		const handle = screen.getByRole('separator', { name: 'Resize the menu' });
		act(() => {
			fireEvent.keyDown(handle, { key: 'ArrowRight' });
		});
		const widened = menuWidth();
		expect(widened).toBe('16rem');
		rerender(tree({ menuVariant: 'resizable', menuHidden: true }));
		rerender(tree({ menuVariant: 'resizable', menuHidden: false }));
		expect(menuWidth()).toBe(widened);
	});

	it('renders no resize handle while hidden', () => {
		render(tree({ menuVariant: 'resizable', menuHidden: true }));
		expect(screen.queryByRole('separator', { name: 'Resize the menu' })).toBeNull();
	});

	it('works with the fit variant, which measures the menu: hidden then shown measures again', () => {
		const { rerender } = render(tree({ menuVariant: 'fit' }));
		expect(menuWidth()).toBe('10rem');
		rerender(tree({ menuVariant: 'fit', menuHidden: true }));
		expect(menuWidth()).toBe('0px');
		rerender(tree({ menuVariant: 'fit', menuHidden: false }));
		expect(menuWidth()).toBe('10rem');
	});

	it('does not read the resizable storage a second time or warn about a hidden menu', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(tree({ menuVariant: 'resizable', menuHidden: true }));
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	});
});
