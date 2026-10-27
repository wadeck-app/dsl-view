import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell, type AppShellProps, type BarOnScroll, type ShellMenuVariant } from './AppShell.js';

/*
 * The menu column's backdrop: a surface-coloured element from the top of the page, behind the bar and the sticky menu, so
 * the strip between a shorter bar and the menu (which starts at the column's top) never shows the page background.
 * jsdom has no layout and no paint: these tests pin the semantics (what exists, where, how it is wired, that it is inert).
 * That no pixel of the column shows the page background frame by frame is proved only in a browser:
 * the Storybook stories "Layout/AppShell / Leak probe light|dark|rail" ("Run the probe" button, report in the page).
 */

const TABS = [{ id: 'queue', label: 'Queue', href: '/queue', current: 'true' as const }];
const MENU = { title: 'Queue', label: 'Queue pages', items: [{ id: 'overview', label: 'Overview', href: '/', current: 'page' as const }] };
const EMPTY_MENU = { title: 'Queue', label: 'Queue pages', items: [] };

const shell = (props: Partial<AppShellProps> = {}) =>
	render(
		<AppShell brand="my-app" tabs={TABS} tabsLabel="Modules" menu={MENU} resizeLabel="Resize the menu" {...props}>
			<p>content</p>
		</AppShell>,
	);

const backdrop = () => screen.getByTestId('shell-menu-backdrop');
const MENU_VARIANTS: readonly ShellMenuVariant[] = ['classic', 'narrow', 'wide', 'fluid', 'fit', 'resizable'];
const BAR_MODES: readonly BarOnScroll[] = ['steady', 'shrink', 'hide', 'icons'];
const classes = (el: Element) => el.className.split(/\s+/);

describe('AppShell menu column backdrop', () => {
	it('exists exactly once, with the default props', () => {
		shell();
		expect(screen.getAllByTestId('shell-menu-backdrop')).toHaveLength(1);
	});

	it.each(MENU_VARIANTS)('exists with menuVariant %s, sized by the menu width variable (the one the menu itself reads)', (menuVariant) => {
		shell({ menuVariant });
		expect(backdrop().style.width).toBe('var(--app-shell-menu-width)');
		expect(screen.getByTestId('shell-menu').style.width).toBe(backdrop().style.width);
	});

	it.each(BAR_MODES)('exists with barOnScroll %s', (barOnScroll) => {
		shell({ barOnScroll });
		expect(backdrop()).toBeInTheDocument();
	});

	it('exists when the menu holds no entry', () => {
		shell({ menu: EMPTY_MENU });
		expect(backdrop()).toBeInTheDocument();
	});

	it('spans from the top of the shell to its bottom, at its left edge (it reaches y=0 behind the bar)', () => {
		shell();
		// These utility classes ARE the contract here: top and bottom of the shell, left edge, nothing relative to the bar.
		expect(classes(backdrop())).toEqual(expect.arrayContaining(['absolute', 'inset-y-0', 'left-0']));
		expect(classes(backdrop())).not.toContain('top-shell-bar');
		expect(backdrop().style.top).toBe('');
		// Positioned against the shell's root, which is `relative`.
		expect(backdrop().parentElement).toBe(screen.getByRole('banner').parentElement);
		expect(classes(backdrop().parentElement!)).toContain('relative');
	});

	it('is decoration: hidden from assistive technology, inert to the pointer, not focusable, no text', () => {
		shell();
		expect(backdrop()).toHaveAttribute('aria-hidden', 'true');
		expect(classes(backdrop())).toContain('pointer-events-none');
		expect(backdrop().hasAttribute('tabindex')).toBe(false);
		expect(backdrop().querySelector('a, button, input, [tabindex]')).toBeNull();
		expect(backdrop()).toBeEmptyDOMElement();
		expect(backdrop()).not.toHaveAttribute('role');
	});

	it('is painted below the bar and the menu: first in the DOM among the positioned children, no z-index of its own', () => {
		shell();
		const bar = screen.getByRole('banner');
		const menu = screen.getByTestId('shell-menu');
		expect(backdrop().compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(backdrop().compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		// The bar keeps its own z-30; the backdrop must not get one that could rise above it.
		expect(classes(bar)).toContain('z-30');
		expect(classes(backdrop()).some((c) => /^-?z-/.test(c))).toBe(false);
	});

	it('is neither inside the menu nor in the content, so the menu keeps its own landmarks and the content its structure', () => {
		shell();
		expect(screen.getByTestId('shell-menu').contains(backdrop())).toBe(false);
		expect(screen.getByRole('main').contains(backdrop())).toBe(false);
		expect(screen.getAllByRole('navigation', { name: 'Queue pages' })).toHaveLength(1);
	});

	it('paints the same surface and right border as the menu, so the strip it fills looks like the menu', () => {
		shell();
		const menu = screen.getByTestId('shell-menu');
		for (const token of ['bg-surface', 'border-r', 'border-border']) {
			expect(classes(menu)).toContain(token);
			expect(classes(backdrop())).toContain(token);
		}
	});

	it('follows the live width of a resizable menu: it reads the variable, which the drag moves', () => {
		shell({ menuVariant: 'resizable' });
		const handle = screen.getByRole('separator', { name: 'Resize the menu' });
		const before = document.documentElement.style.getPropertyValue('--app-shell-menu-width');
		fireEvent.keyDown(handle, { key: 'ArrowRight' });
		const after = document.documentElement.style.getPropertyValue('--app-shell-menu-width');
		expect(before).toBe('15rem');
		expect(after).toBe('16rem');
		// Not a copy of the value: the same variable, so the same frame.
		expect(backdrop().style.width).toBe('var(--app-shell-menu-width)');
		expect(backdrop().parentElement!.style.getPropertyValue('--app-shell-menu-width')).toBe('16rem');
	});

	it('does not touch the contracts: bar height variable on the root, no top/height written on the backdrop', () => {
		shell({ barOnScroll: 'shrink' });
		expect(backdrop().style.height).toBe('');
		expect(backdrop().style.transition).toBe('');
		expect(backdrop().parentElement!.style.getPropertyValue('--app-shell-bar-height')).toBe('2.75rem');
		expect(screen.getByTestId('shell-menu').style.top).toBe('var(--app-shell-bar-height)');
	});
});
