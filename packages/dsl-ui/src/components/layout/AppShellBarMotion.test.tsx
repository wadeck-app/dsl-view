import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, type AppShellProps } from './AppShell.js';
import { BAR_MOTION_MS } from './barHeightMotion.js';

const TABS = [{ id: 'queue', label: 'Queue', href: '/queue', current: 'true' as const }];
const MENU = { title: 'Queue', label: 'Queue pages', items: [{ id: 'a', label: 'Overview', href: '/', current: 'page' as const }] };

const shell = (props: Partial<AppShellProps> = {}) =>
	render(
		<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} {...props}>
			<p>content</p>
		</AppShell>,
	);

const bar = () => screen.getByRole('banner');
const shellRoot = () => bar().parentElement!;
const VAR = '--app-shell-bar-height';
const rootVar = () => document.documentElement.style.getPropertyValue(VAR);
const shellVar = () => shellRoot().style.getPropertyValue(VAR);
const rem = (value: string) => parseFloat(value);

function setReducedMotion(reduced: boolean): void {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: reduced && query.includes('prefers-reduced-motion'),
		media: query,
		addEventListener() {},
		removeEventListener() {},
	}));
}

// scrollY is read by the hook; the scroll event is coalesced to the next animation frame (fake clock).
function scrollTo(y: number): void {
	vi.stubGlobal('scrollY', y);
	act(() => {
		window.dispatchEvent(new Event('scroll'));
		vi.advanceTimersByTime(16);
	});
}

/** Advances the clock one frame at a time for `ms`, returning what every reader of the variable saw at each frame. */
function sample(ms: number) {
	const frames: { root: string; shell: string; transform: string }[] = [];
	for (let t = 0; t < ms; t += 16) {
		act(() => {
			vi.advanceTimersByTime(16);
		});
		frames.push({ root: rootVar(), shell: shellVar(), transform: bar().style.transform });
	}
	return frames;
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal('scrollY', 0);
});

afterEach(() => {
	document.documentElement.style.removeProperty(VAR);
	document.documentElement.style.removeProperty('--app-shell-menu-width');
});

describe('barOnScroll motion (no reduced-motion preference)', () => {
	beforeEach(() => setReducedMotion(false));

	it('does not animate on mount: the first paint already has the final height, page already scrolled included', () => {
		vi.stubGlobal('scrollY', 400);
		shell({ barOnScroll: 'shrink' });
		expect(rootVar()).toBe('1.5rem');
		expect(shellVar()).toBe('1.5rem');
	});

	it('shrink: the variable passes through the values in between, then lands exactly on 1.5rem', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		const frames = sample(BAR_MOTION_MS + 64);
		const values = frames.map((f) => rem(f.root));
		expect(values.some((v) => v < 2.75 && v > 1.5)).toBe(true);
		for (let i = 1; i < values.length; i += 1) {
			expect(values[i]!).toBeLessThanOrEqual(values[i - 1]!);
		}
		expect(rootVar()).toBe('1.5rem');
		expect(shellVar()).toBe('1.5rem');
	});

	it('every reader sees the same value at every frame: the document root and the shell root never differ', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		for (const frame of sample(BAR_MOTION_MS + 64)) {
			expect(frame.shell).toBe(frame.root);
		}
	});

	it('the bar reads the variable for its height and its margin, so the content never moves whatever the frame', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		sample(BAR_MOTION_MS / 2);
		expect(bar().style.height).toBe('var(--app-shell-bar-height)');
		expect(bar().style.marginBottom).toBe('calc(2.75rem - var(--app-shell-bar-height))');
	});

	it('is front-loaded like the CSS ease-out of the padding and text: more than half done at half the time', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		const frames = sample(BAR_MOTION_MS / 2 + 16);
		const done = (2.75 - rem(frames[frames.length - 1]!.root)) / (2.75 - 1.5);
		expect(done).toBeGreaterThan(0.5);
	});

	it('hide: the bar slides by exactly the share of its height the variable gave up, on the same frames', () => {
		shell({ barOnScroll: 'hide' });
		scrollTo(100);
		scrollTo(200);
		const frames = sample(BAR_MOTION_MS + 64);
		const slid = frames.filter((f) => f.transform !== '' && f.transform !== 'translateY(-100%)');
		expect(slid.length).toBeGreaterThan(0);
		for (const frame of frames) {
			const expected = -(1 - rem(frame.root) / 2.75) * 100;
			const actual = frame.transform === '' ? 0 : parseFloat(/translateY\((.+)%\)/.exec(frame.transform)![1]!);
			expect(actual).toBeCloseTo(expected, 6);
		}
		expect(rootVar()).toBe('0px');
		expect(bar().style.transform).toBe('translateY(-100%)');
	});

	it('shrink never slides the bar: only hide owns the transform', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		for (const frame of sample(BAR_MOTION_MS + 64)) {
			expect(frame.transform).toBe('');
		}
	});

	it('hide, coming back: the transform is removed once the bar is whole again', () => {
		shell({ barOnScroll: 'hide' });
		scrollTo(100);
		scrollTo(200);
		sample(BAR_MOTION_MS + 64);
		scrollTo(150);
		sample(BAR_MOTION_MS + 64);
		expect(rootVar()).toBe('2.75rem');
		expect(bar().style.transform).toBe('');
	});

	it('a change of mind mid-motion (pointer enters the bar) continues from the current height, with no jump', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		sample(BAR_MOTION_MS / 2);
		const mid = rem(rootVar());
		expect(mid).toBeLessThan(2.75);
		expect(mid).toBeGreaterThan(1.5);
		act(() => {
			fireEvent.mouseEnter(bar());
		});
		const next = rem(sample(16)[0]!.root);
		expect(Math.abs(next - mid)).toBeLessThan(0.3);
		sample(BAR_MOTION_MS + 64);
		expect(rootVar()).toBe('2.75rem');
	});

	it('unmounting mid-motion leaves no frame pending and no variable behind', () => {
		const { unmount } = shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		sample(32);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(1000);
		expect(rootVar()).toBe('');
	});

	it('steady never schedules a frame', () => {
		shell();
		expect(vi.getTimerCount()).toBe(0);
		scrollTo(500);
		expect(vi.getTimerCount()).toBe(0);
		expect(rootVar()).toBe('2.75rem');
	});
});

describe('barOnScroll motion (prefers-reduced-motion: reduce)', () => {
	beforeEach(() => setReducedMotion(true));

	it('shrink lands at once, on every reader, with no frame pending', () => {
		shell({ barOnScroll: 'shrink' });
		scrollTo(100);
		expect(rootVar()).toBe('1.5rem');
		expect(shellVar()).toBe('1.5rem');
		expect(vi.getTimerCount()).toBe(0);
	});

	it('hide jumps to the hidden position at once', () => {
		shell({ barOnScroll: 'hide' });
		scrollTo(100);
		scrollTo(200);
		expect(rootVar()).toBe('0px');
		expect(bar().style.transform).toBe('translateY(-100%)');
	});

	it('the CSS transitions of the bar are switched off by the same preference', () => {
		shell({ barOnScroll: 'shrink' });
		expect(bar().className.split(/\s+/)).toContain('motion-reduce:transition-none');
	});
});

describe('barOnScroll: icons, initials and text get smaller with the bar', () => {
	const WITH_ICONS = [
		{ id: 'queue', label: 'Queue', href: '/queue', icon: <i data-testid="logo" />, current: 'true' as const },
		{ id: 'audit', label: 'Audit log', href: '/audit' },
	];
	const link = (name: string) => screen.getByRole('link', { name });
	const zoomOf = (name: string) => parseFloat((link(name).firstElementChild as HTMLElement).style.zoom);

	beforeEach(() => setReducedMotion(true));

	it('shrink: the module logo is drawn at two thirds of its size (24px -> 16px), the label is still shown', () => {
		shell({ tabs: WITH_ICONS, barOnScroll: 'shrink' });
		expect(zoomOf('Queue')).toBe(1);
		scrollTo(100);
		expect(zoomOf('Queue')).toBeCloseTo(2 / 3, 6);
		expect(link('Queue')).toHaveTextContent('Queue');
		expect(link('Queue').firstElementChild).toContainElement(screen.getByTestId('logo'));
	});

	it('shrink: the logo is back to its size at the top of the page', () => {
		shell({ tabs: WITH_ICONS, barOnScroll: 'shrink' });
		scrollTo(100);
		scrollTo(0);
		expect(zoomOf('Queue')).toBe(1);
	});

	it('icons: the logo is scaled too, and the initials of a tab without icon stay (decorative, the name stays for assistive technology)', () => {
		shell({ tabs: WITH_ICONS, barOnScroll: 'icons' });
		scrollTo(100);
		expect(zoomOf('Queue')).toBeCloseTo(2 / 3, 6);
		const audit = link('Audit log');
		const initials = audit.querySelector('[aria-hidden="true"]')!;
		expect(initials).toHaveTextContent('AL');
		expect(audit).toHaveTextContent('Audit log');
	});

	it('a tab without icon gets no empty icon box', () => {
		shell({ tabs: WITH_ICONS, barOnScroll: 'shrink' });
		expect(link('Audit log').firstChild?.nodeType).toBe(Node.TEXT_NODE);
	});

	it('steady never scales anything', () => {
		shell({ tabs: WITH_ICONS });
		scrollTo(500);
		expect(zoomOf('Queue')).toBe(1);
	});

	it('the icon box animates with the bar, except under prefers-reduced-motion', () => {
		shell({ tabs: WITH_ICONS, barOnScroll: 'shrink' });
		const classes = (link('Queue').firstElementChild as HTMLElement).className.split(/\s+/);
		expect(classes).toContain('transition-[zoom]');
		expect(classes).toContain('duration-200');
		expect(classes).toContain('motion-reduce:transition-none');
	});
});

describe('consumers of --app-shell-bar-height do not add their own transition', () => {
	// The variable already moves frame by frame. A CSS transition on `top` / `height` of the menu chases the moving value
	// with its own clock and opens a gap under the bar (measured: 15px at 190ms with the 150ms transition).
	it('the side menu has no transition at all: not on top or height, and not on its width (it follows --app-shell-menu-width, also while dragged)', () => {
		shell({ barOnScroll: 'shrink' });
		const frame = screen.getByTestId('shell-menu');
		expect(frame.className.split(/\s+/).filter((c) => c.startsWith('transition'))).toEqual([]);
	});
});
