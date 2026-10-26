import { Menu } from 'lucide-react';
import React, { useEffect, useId, useState } from 'react';
import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';
import { Drawer } from '../overlay/Drawer.js';
import {
	APP_SHELL_BAR_HEIGHT,
	APP_SHELL_BAR_HEIGHT_VAR,
	APP_SHELL_MENU_WIDTH,
	APP_SHELL_MENU_WIDTH_COMPACT,
	APP_SHELL_MENU_WIDTH_NONE,
	APP_SHELL_MENU_WIDTH_RAIL,
	APP_SHELL_MENU_WIDTH_VAR,
} from './shellMenuWidth.js';
import { isShortcutTarget, MENU_VARIANTS, ShellMenuNav, ShellSideMenu, useFoldedMenu } from './ShellSideMenu.js';
import { ShellTabs } from './ShellTabs.js';
import { BAR_ON_SCROLL_MODES, useBarOnScroll, type BarOnScroll } from './useBarOnScroll.js';

export type { BarOnScroll } from './useBarOnScroll.js';

/** The look and behaviour of the side menu. Default `classic`. See the component doc. */
export type ShellMenuVariant = 'classic' | 'compact' | 'rail' | 'toggle' | 'drawer' | 'accent';

/**
 * A generic application frame: a top bar (brand, tabs, actions), an always-visible side menu and the content.
 *
 * It knows nothing about routing, modules or extension points: it renders plain data, the host decides what is
 * current, and `renderLink` decides how a link navigates (a router `Link`). Without `renderLink` it renders plain
 * `<a href>`. Routing stays in the host (see out-of-scope.md).
 *
 * The look is fixed: a 44px borderless top bar with a soft shadow, tabs as tall as the bar whose current one gets an
 * accent glow, and a 15rem side menu. All colors are theme tokens, so it follows the theme and nests in a
 * `ThemeScope`; the accent of the current tab follows `AccentScope` / `useRootAccent` unless the item has its own.
 *
 * The tabs never wrap: when the bar cannot hold them they scroll, the current tab is brought into view, and with
 * `moreLabel` an overflow control lists the tabs that are cut off.
 *
 * Scrolling: the page scrolls, the frame does not. The top bar is sticky at the top, and the side menu is sticky right
 * under it, as tall as the rest of the window, with its own scrollbar when it holds more than fits. Anything sticky in
 * the content must stick below the bar: use `top: var(--app-shell-bar-height, 0px)` (the `0px` is for pages with no
 * shell), not `top-0`. A sticky element inside its own scroll box (a filling DataTable header) is not concerned.
 *
 * CSS custom properties, declared on the shell's root and published on the document root while mounted (removed when the
 * last mounted shell unmounts). The document root, not just the shell, because floating tools such as the A/B dock are
 * mounted outside the shell and a custom property only inherits downwards:
 * - `--app-shell-menu-width`: 15rem. The A/B dock uses it to stay in the content area.
 * - `--app-shell-bar-height`: 2.75rem. The side menu and sticky content stick below it. With `barOnScroll` it follows the
 *   CURRENT state of the bar (the target value: the bar and the menu animate to it over 150ms, not under
 *   prefers-reduced-motion).
 *
 * `barOnScroll` (default `steady`) is what the top bar does once the page is scrolled more than 8px:
 * - `steady`: nothing, always 2.75rem.
 * - `shrink`: 1.5rem, smaller brand and tab text.
 * - `hide`: slides away when scrolling down, comes back after scrolling up a little (variable: 0px).
 * - `icons`: a 2rem strip of module icons (initials when a tab has no icon), the name as tooltip.
 * In every mode the bar is full again at the top of the page, while the pointer is over it, and while the keyboard focus
 * is inside it. The content never moves: a shrunk bar keeps its place in the flow. An unknown value warns once and
 * behaves as `steady`.
 *
 * `menuVariant` (default `classic`) is the side menu. `--app-shell-menu-width` follows its current state:
 * - `classic`: 15rem, icon and label.
 * - `compact`: 11rem, denser rows.
 * - `rail`: 3.5rem, icons only (initials without an icon, the name as tooltip). Hover or keyboard focus expands it to 15rem
 *   OVER the content, which does not move (the variable stays 3.5rem).
 * - `toggle`: classic plus a button (named by `menu.label`) that folds it to the rail and back; the choice is kept in
 *   localStorage `app-shell.menu` (`open` / `folded`), and the key `[` does the same when no field has the focus. The
 *   content follows the width.
 * - `drawer`: no column (variable 0px). A menu button first in the top bar opens the menu as a dialog over the content;
 *   Escape, the backdrop or using a link closes it. This is also the answer for a narrow window.
 * - `accent`: classic width, a 3px accent bar and soft tint on the current entry, a larger hit area, group captions in
 *   small caps.
 * An unknown value warns once and behaves as `classic`. In every variant the arrow keys, Home and End move between the
 * menu links, the current entry is scrolled into view and the focus ring is visible.
 *
 * Menu `items` may hold `{ kind: 'separator', id, label? }`: a thin rule, with the label a caption above the next group.
 * A separator is never focusable. Leading, trailing and doubled separators are dropped silently (the data comes from
 * modules). Collapsed, a separator is a rule only.
 *
 * Limits: no other responsive behaviour. Not a registry node: it is a React API for the host app's layout.
 */

export interface ShellLinkProps {
	href: string;
	className: string;
	style?: React.CSSProperties;
	/** 'page' for the current page, 'true' for a current section (a tab); absent when not current. */
	'aria-current'?: 'page' | 'true';
	/** Set on icon-only tabs (`barOnScroll: 'icons'`): the tooltip. Forward it to the element, like `style`. */
	title?: string;
	children: React.ReactNode;
}

export interface ShellItem {
	/** `link` (default). Present so that a menu entry can be told from a separator. */
	kind?: 'link';
	id: string;
	label: string;
	href: string;
	/** Drawn before the label (a logo, an icon). Decorative: the label carries the meaning. */
	icon?: React.ReactNode;
	/** Set by the host on the item that is current. 'page' for a page, 'true' for a section. */
	current?: 'page' | 'true';
	/** Color of the highlight when the item is current (any CSS color); defaults to the theme accent. */
	accent?: string;
}

/** A rule between two groups of menu links, with an optional caption for the next group. */
export interface ShellSeparator {
	kind: 'separator';
	id: string;
	/** Caption of the group that follows. Also the accessible name of the separator. */
	label?: string;
}

export type ShellMenuEntry = ShellItem | ShellSeparator;

export interface ShellMenu {
	/** Names the side menu: a visually hidden heading, so assistive technology still announces where you are. */
	title: string;
	/** Accessible name of the menu's navigation. */
	label: string;
	items: ShellMenuEntry[];
}

export interface AppShellProps {
	brand: React.ReactNode;
	tabs: ShellItem[];
	/** Accessible name of the tabs' navigation. */
	tabsLabel: string;
	menu: ShellMenu;
	/** Right side of the top bar. */
	actions?: React.ReactNode;
	/** Renders every tab and menu link. Default: plain `<a href>`. */
	renderLink?: (props: ShellLinkProps) => React.ReactElement;
	/**
	 * Text of a "skip to content" link, visible only while it has keyboard focus. Opt-in because the text is the
	 * host's (language): without it no skip link is rendered.
	 */
	skipLabel?: string;
	/**
	 * Text of the overflow control that lists the tabs cut off by the top bar. Opt-in like `skipLabel`: the text is the
	 * host's (language). Without it no control is rendered and cut-off tabs are reachable by scrolling only.
	 */
	moreLabel?: string;
	/** What the top bar does when the page scrolls. Default `steady` (no change). See the component doc. */
	barOnScroll?: BarOnScroll;
	/** The side menu's look and behaviour. Default `classic` (unchanged). See the component doc. */
	menuVariant?: ShellMenuVariant;
	children: React.ReactNode;
}

const defaultRenderLink = ({ href, children, ...rest }: ShellLinkProps): React.ReactElement => (
	<a href={href} {...rest}>
		{children}
	</a>
);

// Heights of the bar by state. `hidden` is 0 for everything that sticks below it; the bar itself keeps its full height.
const COMPACT_BAR_HEIGHT = { shrink: '1.5rem', icons: '2rem' } as const;
const ANIMATE = 'transition-[height,transform,margin] duration-150 motion-reduce:transition-none';
const ANIMATE_MENU = 'transition-[top,height] duration-150 motion-reduce:transition-none';

// Shells mounted right now (normally one): the variable stays until the last one unmounts.
let mountedShells = 0;

const SKIP_LINK =
	'sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-40 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-content focus:shadow-md';

export function AppShell({ brand, tabs, tabsLabel, menu, actions, renderLink = defaultRenderLink, skipLabel, moreLabel, barOnScroll, menuVariant, children }: AppShellProps): React.ReactElement {
	const mainId = useId();
	const mode = classFor('AppShell', 'barOnScroll', barOnScroll, BAR_ON_SCROLL_MODES, 'steady') as BarOnScroll;
	const [hovered, setHovered] = useState(false);
	const [focusedInside, setFocusedInside] = useState(false);
	const barState = useBarOnScroll(mode, hovered || focusedInside);
	const compact = barState === 'compact';
	const hidden = barState === 'hidden';
	const barHeight = hidden ? '0px' : compact ? COMPACT_BAR_HEIGHT[mode === 'icons' ? 'icons' : 'shrink'] : APP_SHELL_BAR_HEIGHT;
	const animated = mode !== 'steady';
	const variant = classFor('AppShell', 'menuVariant', menuVariant, MENU_VARIANTS, 'classic') as ShellMenuVariant;
	const [folded, toggleFold] = useFoldedMenu(variant === 'toggle');
	const [drawerOpen, setDrawerOpen] = useState(false);
	const menuWidth =
		variant === 'drawer'
			? APP_SHELL_MENU_WIDTH_NONE
			: variant === 'compact'
				? APP_SHELL_MENU_WIDTH_COMPACT
				: variant === 'rail' || (variant === 'toggle' && folded)
					? APP_SHELL_MENU_WIDTH_RAIL
					: APP_SHELL_MENU_WIDTH;
	// `[` folds and unfolds the toggle menu, unless a field is being typed in.
	useEffect(() => {
		if (variant !== 'toggle') {
			return;
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === '[' && isShortcutTarget(event)) {
				toggleFold();
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	});

	// Published for floating tools mounted outside the shell (see the doc above); removed with the last mounted shell.
	useEffect(() => {
		const root = document.documentElement.style;
		mountedShells += 1;
		return () => {
			mountedShells -= 1;
			if (mountedShells === 0) {
				root.removeProperty(APP_SHELL_MENU_WIDTH_VAR);
				root.removeProperty(APP_SHELL_BAR_HEIGHT_VAR);
			}
		};
	}, []);
	// Follow the state of the bar and of the menu. Declared after the effect above: on unmount the removal there runs last.
	useEffect(() => {
		document.documentElement.style.setProperty(APP_SHELL_BAR_HEIGHT_VAR, barHeight);
	}, [barHeight]);
	useEffect(() => {
		document.documentElement.style.setProperty(APP_SHELL_MENU_WIDTH_VAR, menuWidth);
	}, [menuWidth]);
	// Declared on the shell root too: the first paint has them before the effects publish them on the document root.
	const shellVars = { [APP_SHELL_MENU_WIDTH_VAR]: menuWidth, [APP_SHELL_BAR_HEIGHT_VAR]: barHeight } as React.CSSProperties;

	return (
		<div className="relative flex min-h-screen flex-col bg-bg" style={shellVars}>
			{skipLabel !== undefined && (
				<a href={`#${mainId}`} className={SKIP_LINK}>
					{skipLabel}
				</a>
			)}
			{/* 44px, no border: a soft shadow separates it from the page. Sticky, z-30: above the content's own stickies (z-10),
			    below the drawer overlay (z-40) and the dialogs, toasts and popovers (z-50). Fixed height, whatever the tab:
			    a tab can fill it from top to bottom. A shrunk bar gives back the height it lost as a bottom margin, so the
			    content does not move; a hidden bar keeps its height and slides up. Pointer or focus inside: full bar. */}
			<header
				className={`sticky top-0 z-30 flex items-center bg-surface ${compact ? 'gap-3 px-2' : 'gap-6 px-4'} ${hidden ? '' : 'shadow-sm'} ${animated ? ANIMATE : ''}`}
				style={{
					height: hidden ? APP_SHELL_BAR_HEIGHT : `var(${APP_SHELL_BAR_HEIGHT_VAR})`,
					marginBottom: compact ? `calc(${APP_SHELL_BAR_HEIGHT} - var(${APP_SHELL_BAR_HEIGHT_VAR}))` : undefined,
					transform: hidden ? 'translateY(-100%)' : undefined,
				}}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				onFocus={() => setFocusedInside(true)}
				onBlur={(event) => {
					// Focus moving between two controls of the bar stays inside.
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedInside(false);
				}}
			>
				{variant === 'drawer' && (
					// violations-suppress: react/no-raw-button the shell's menu button owns its geometry (as tall as the top bar)
					<button
						type="button"
						onClick={() => setDrawerOpen(true)}
						aria-label={menu.label}
						title={menu.label}
						aria-haspopup="dialog"
						aria-expanded={drawerOpen}
						className="flex shrink-0 items-center justify-center self-stretch px-2 text-muted hover:bg-muted-bg hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
					>
						<Menu size={16} aria-hidden="true" />
					</button>
				)}
				<span className={compact && mode === 'icons' ? 'sr-only' : `shrink-0 whitespace-nowrap font-semibold text-content ${compact ? 'text-xs' : 'text-base'}`}>{brand}</span>
				<ShellTabs tabs={tabs} tabsLabel={tabsLabel} renderLink={renderLink} moreLabel={moreLabel} density={compact ? (mode === 'icons' ? 'icons' : 'small') : 'normal'} />
				{actions}
			</header>
			<div className="flex min-h-0 flex-1">
				{variant !== 'drawer' && <ShellSideMenu menu={menu} renderLink={renderLink} variant={variant} folded={folded} onToggleFold={toggleFold} />}
				<main id={mainId} tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
					{children}
				</main>
			</div>
			{/* Mounted only while open: the dialog is not left in the page, inert, for nothing. */}
			{variant === 'drawer' && drawerOpen && (
				<Drawer open onClose={() => setDrawerOpen(false)} side="left" size="sm" title={menu.title}>
					<ShellMenuNav menu={menu} renderLink={renderLink} variant="classic" density="full" onNavigate={() => setDrawerOpen(false)} />
				</Drawer>
			)}
		</div>
	);
}
