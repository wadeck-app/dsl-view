import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type AppShellProps } from './AppShell.js';

const TABS = [
	{ id: 'queue', label: 'Queue', href: '/queue', icon: <i data-testid="icon-queue" />, current: 'true' as const },
	{ id: 'audit', label: 'Audit log', href: '/audit' },
];
const MENU = { title: 'Queue', label: 'Queue pages', items: [{ id: 'a', label: 'Overview', href: '/', current: 'page' as const }] };

const shell = (props: Partial<AppShellProps> = {}) =>
	render(
		<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} {...props}>
			<p>content</p>
		</AppShell>,
	);

const bar = () => screen.getByRole('banner');
const menu = () => screen.getByTestId('shell-menu');
const rootVar = (name: string) => document.documentElement.style.getPropertyValue(name);
const barHeight = () => rootVar('--app-shell-bar-height');

// The offset is read from window.scrollY; vitest restores the stubbed global after each test (unstubGlobals).
function scrollTo(y: number): void {
	vi.stubGlobal('scrollY', y);
	act(() => {
		window.dispatchEvent(new Event('scroll'));
		// The animation frame the listener asked for runs now.
		const callbacks = frames.splice(0);
		for (const cb of callbacks) cb(0);
	});
}

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
	vi.stubGlobal('scrollY', 0);
	// Animation frames are queued and run by scrollTo(), like the browser would after the scroll event.
	frames = [];
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
	document.documentElement.style.removeProperty('--app-shell-bar-height');
	document.documentElement.style.removeProperty('--app-shell-menu-width');
});

describe('barOnScroll steady (default)', () => {
	it('never changes, whatever the scroll, and listens to nothing', () => {
		const add = vi.spyOn(window, 'addEventListener');
		shell();
		expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
		scrollTo(500);
		expect(barHeight()).toBe('2.75rem');
		expect(bar().style.height).toBe('var(--app-shell-bar-height)');
	});

	it('an explicit steady is the same', () => {
		shell({ barOnScroll: 'steady' });
		scrollTo(500);
		expect(barHeight()).toBe('2.75rem');
	});
});

describe('barOnScroll shrink', () => {
	it('keeps the full height at the top and within the threshold', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(8);
		expect(barHeight()).toBe('2.75rem');
	});

	it('shrinks to 1.5rem once scrolled, and every consumer of the variable follows', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		expect(barHeight()).toBe('1.5rem');
		expect(bar().style.height).toBe('var(--app-shell-bar-height)');
		expect(menu().style.top).toBe('var(--app-shell-bar-height)');
		// Declared on the shell too, not only on the document root.
		expect(menu().parentElement!.parentElement!.style.getPropertyValue('--app-shell-bar-height')).toBe('1.5rem');
	});

	it('does not move the content: the bar gives back the height it lost as a bottom margin', () => {
		shell({ barOnScroll: 'shrink' });
		expect(bar().style.marginBottom).toBe('');
		scrollTo(100);
		expect(bar().getAttribute('style')).toContain('margin-bottom: calc(2.75rem - var(--app-shell-bar-height))');
	});

	it('is full again at the top of the page', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		scrollTo(0);
		expect(barHeight()).toBe('2.75rem');
	});

	it('is full while the pointer is over the bar, and shrinks again when it leaves', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		fireEvent.mouseEnter(bar());
		expect(barHeight()).toBe('2.75rem');
		fireEvent.mouseLeave(bar());
		expect(barHeight()).toBe('1.5rem');
	});

	it('is full while the keyboard focus is inside the bar, and shrinks again when it leaves', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		const tab = screen.getByRole('link', { name: 'Audit log' });
		fireEvent.focus(tab);
		expect(barHeight()).toBe('2.75rem');
		fireEvent.blur(tab, { relatedTarget: document.body });
		expect(barHeight()).toBe('1.5rem');
	});

	it('stays full when the focus moves from one control of the bar to another', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		const first = screen.getByRole('link', { name: 'Queue' });
		const second = screen.getByRole('link', { name: 'Audit log' });
		fireEvent.focus(first);
		fireEvent.blur(first, { relatedTarget: second });
		expect(barHeight()).toBe('2.75rem');
	});

	it('keeps the text of the tabs, only smaller', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		expect(screen.getByRole('link', { name: 'Audit log' })).toHaveTextContent('Audit log');
	});

	it('animates, except under prefers-reduced-motion', () => {
		shell({ barOnScroll: 'shrink' });
		const classes = bar().className.split(/\s+/);
		expect(classes).toContain('transition-[height,transform,margin]');
		expect(classes).toContain('motion-reduce:transition-none');
		expect(menu().className.split(/\s+/)).toContain('motion-reduce:transition-none');
	});
});

describe('barOnScroll hide', () => {
	it('slides away after scrolling down, and the menu sticks to the top', () => {
		shell({ barOnScroll: 'hide' });
		scrollTo(100);
		scrollTo(200);
		expect(barHeight()).toBe('0px');
		expect(bar().style.transform).toBe('translateY(-100%)');
		// The bar keeps its place in the flow: nothing under it moves.
		expect(bar().getAttribute('style')).toContain('height: 2.75rem');
		expect(bar().style.marginBottom).toBe('');
	});

	it('returns after scrolling back up a little', () => {
		shell({ barOnScroll: 'hide' });
		scrollTo(100);
		scrollTo(200);
		scrollTo(195);
		expect(barHeight()).toBe('0px');
		scrollTo(191);
		expect(barHeight()).toBe('2.75rem');
		expect(bar().style.transform).toBe('');
	});

	it('returns at the top of the page', () => {
		shell({ barOnScroll: 'hide' });
		scrollTo(100);
		scrollTo(200);
		scrollTo(0);
		expect(barHeight()).toBe('2.75rem');
	});

	it('returns when the keyboard focus reaches a control inside it', () => {
		shell({ barOnScroll: 'hide' });
		scrollTo(100);
		scrollTo(200);
		fireEvent.focus(screen.getByRole('link', { name: 'Audit log' }));
		expect(barHeight()).toBe('2.75rem');
		expect(bar().style.transform).toBe('');
	});
});

describe('barOnScroll icons', () => {
	it('is a 2rem strip of icons once scrolled, every tab still named', () => {
		shell({ barOnScroll: 'icons' });
		scrollTo(100);
		expect(barHeight()).toBe('2rem');
		const queue = screen.getByRole('link', { name: 'Queue' });
		expect(queue.getAttribute('title')).toBe('Queue');
		expect(queue.querySelector('[data-testid="icon-queue"]')).not.toBeNull();
		// The label is still in the DOM for assistive technology but not shown.
		expect(queue.querySelector('.sr-only')).toHaveTextContent('Queue');
	});

	it('a tab without icon shows its initials', () => {
		shell({ barOnScroll: 'icons' });
		scrollTo(100);
		const audit = screen.getByRole('link', { name: 'Audit log' });
		expect(audit.querySelector('[aria-hidden="true"]')).toHaveTextContent('AL');
		expect(audit.getAttribute('title')).toBe('Audit log');
	});

	it('shows the text again at the top, with no title that would repeat it', () => {
		shell({ barOnScroll: 'icons' });
		expect(screen.getByRole('link', { name: 'Audit log' }).querySelector('.sr-only')).toBeNull();
		expect(screen.getByRole('link', { name: 'Audit log' }).getAttribute('title')).toBeNull();
	});

	it('expands on hover', () => {
		shell({ barOnScroll: 'icons' });
		scrollTo(100);
		fireEvent.mouseEnter(bar());
		expect(barHeight()).toBe('2.75rem');
		expect(screen.getByRole('link', { name: 'Audit log' }).querySelector('.sr-only')).toBeNull();
	});
});

describe('barOnScroll unknown value', () => {
	it('warns once, naming the prop and the allowed values, and behaves as steady', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { rerender } = shell({ barOnScroll: 'sideways' as never });
		rerender(
			<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} barOnScroll={'sideways' as never}>
				<p>content</p>
			</AppShell>,
		);
		scrollTo(500);
		expect(barHeight()).toBe('2.75rem');
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0][0]);
		expect(message).toContain('barOnScroll');
		expect(message).toContain('sideways');
		expect(message).toContain('steady, shrink, hide, icons');
	});
});

describe('barOnScroll cleanup', () => {
	it('removes the scroll listener on unmount', () => {
		const remove = vi.spyOn(window, 'removeEventListener');
		const { unmount } = shell({ barOnScroll: 'shrink' });
		unmount();
		expect(remove.mock.calls.some(([type]) => type === 'scroll')).toBe(true);
	});

	it('starts compact when the page is already scrolled at mount', () => {
		vi.stubGlobal('scrollY', 400);
		shell({ barOnScroll: 'shrink' });
		expect(barHeight()).toBe('1.5rem');
	});
});
