import React, { useEffect, useId, useState } from 'react';
import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';
import { APP_SHELL_BAR_HEIGHT, APP_SHELL_BAR_HEIGHT_VAR, APP_SHELL_MENU_WIDTH_VAR } from './shellMenuWidth.js';
import { MENU_VARIANT_WIDTH, MENU_WIDTH_PEEK_FOLDED, type ShellMenuVariant } from './shellMenuVariants.js';
import { isShortcutTarget, MENU_VARIANTS, ShellSideMenu, useFoldedMenu } from './ShellSideMenu.js';
import { ShellTabs } from './ShellTabs.js';
import { useBarHeight } from './useBarHeight.js';
import { BAR_ON_SCROLL_MODES, useBarOnScroll, type BarOnScroll } from './useBarOnScroll.js';

export type { BarOnScroll } from './useBarOnScroll.js';
// The look and behaviour of the side menu (`menuVariant`, default `classic`) and the label + hint of each for an A/B dock.
export { MENU_VARIANT_AB_OPTIONS, type ShellMenuVariant } from './shellMenuVariants.js';

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
 * - `--app-shell-menu-width`: 15rem by default, per `menuVariant` (below). The A/B dock uses it to stay in the content area.
 * - `--app-shell-bar-height`: 2.75rem. The side menu and sticky content stick below it. With `barOnScroll` it follows the
 *   bar: it moves frame by frame over 200ms (ease-out) to the new state, so everything that reads it (bar, menu, dock,
 *   sticky bars) moves together; under prefers-reduced-motion it changes at once. In Tailwind: `top-shell-bar`
 *   (preset spacing key, falls back to 0px without a shell). Do not put a CSS `transition` on a property that reads it.
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
 * - `classic`: 15rem, icon and label. The reference.
 * - `slim`: 13rem, text rows without icons, quiet text, soft full-row hover tint; the current row is bold with a 2px
 *   accent line on the right edge.
 * - `cards`: 18rem, a rounded card per entry (icon, label and the optional `description` of the item as a second line),
 *   generous spacing, lifts slightly on hover (not under reduced motion).
 * - `tiles`: 5rem launcher column, the icon above a small label (initials without an icon); the current entry is a
 *   filled accent tile.
 * - `flyout`: 3.5rem icon-only rail (initials without an icon). Hovering or focusing an entry floats its label to the
 *   right (position fixed, nothing moves); the current entry has an accent dot.
 * - `floating`: a 14rem rounded panel with a soft shadow, detached from the edges by a 0.75rem margin (the variable
 *   is 15.5rem so the content never sits under it), pill entries, captions for groups.
 * - `tree`: 14rem timeline: a thin guide line with a node per entry, the current node filled; a separator is a group
 *   title (with a label) or a break in the line (without).
 * - `peek`: 15rem like classic plus a button (named by `menu.label`) that folds it to a 1rem sliver with a grab handle
 *   and back; the key `[` does the same when no field has the focus; the choice is kept in localStorage `app-shell.menu`
 *   (`open` / `folded`). Folded, hovering or focusing the sliver shows the whole menu OVER the content, which does not
 *   move (the variable stays 1rem); the hidden links are out of the tab order.
 * An unknown value (including the removed `compact`, `rail`, `toggle`, `drawer`, `accent`) warns once and behaves as
 * `classic`. In every variant the menu is sticky under the bar with its own scrollbar, the arrow keys, Home and End move
 * between the menu links, the current entry is scrolled into view and the focus ring is visible.
 * `MENU_VARIANT_AB_OPTIONS` holds a label and a one-line hint for each value, in the shape `useAbTest({ options })` takes.
 *
 * Menu `items` may hold `{ kind: 'separator', id, label? }`: a rule in the style of the variant, with the label a
 * caption for the next group. A separator is never focusable. Leading, trailing and doubled separators are dropped
 * silently (the data comes from modules). In `flyout` a separator is a rule only, its caption flies out on hover.
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
	/** A second, quieter line under the label. Drawn by the `cards` variant only; the others ignore it. */
	description?: string;
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
// Padding, gap and text size of the bar and its brand. Height, margin and slide are moved by useBarHeight instead.
const BAR_TRANSITION = 'transition-[padding,gap,font-size,line-height] duration-200 ease-out motion-reduce:transition-none';

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
	const { shellRef, headerRef, initial: initialBarHeight } = useBarHeight(barHeight, mode === 'hide');
	const variant = classFor('AppShell', 'menuVariant', menuVariant, MENU_VARIANTS, 'classic') as ShellMenuVariant;
	const [folded, toggleFold] = useFoldedMenu(variant === 'peek');
	const menuWidth = folded ? MENU_WIDTH_PEEK_FOLDED : MENU_VARIANT_WIDTH[variant];
	// `[` folds and unfolds the peek menu, unless a field is being typed in.
	useEffect(() => {
		if (variant !== 'peek') {
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
	// The bar height is moved by useBarHeight; the menu width follows the menu.
	useEffect(() => {
		document.documentElement.style.setProperty(APP_SHELL_MENU_WIDTH_VAR, menuWidth);
	}, [menuWidth]);
	// Declared on the shell root too: the first paint has them before the effects publish them on the document root.
	// The bar height is the value of the FIRST render only: useBarHeight owns it afterwards (React must not write it back).
	const shellVars = { [APP_SHELL_MENU_WIDTH_VAR]: menuWidth, [APP_SHELL_BAR_HEIGHT_VAR]: initialBarHeight } as React.CSSProperties;

	return (
		<div ref={shellRef} className="relative flex min-h-screen flex-col bg-bg" style={shellVars}>
			{skipLabel !== undefined && (
				<a href={`#${mainId}`} className={SKIP_LINK}>
					{skipLabel}
				</a>
			)}
			{/* 44px, no border: a soft shadow separates it from the page. Sticky, z-30: above the content's own stickies (z-10),
			    below the menu flyout label (z-40) and the dialogs, toasts and popovers (z-50). Fixed height, whatever the tab:
			    a tab can fill it from top to bottom. A shrunk bar gives back the height it lost as a bottom margin, so the
			    content does not move; a hidden bar keeps its height and slides up. Pointer or focus inside: full bar. */}
			{/* Height, margin and slide follow --app-shell-bar-height, which useBarHeight moves frame by frame; padding, gap and
			    text size animate with the same 200ms ease-out. */}
			<header
				ref={headerRef}
				className={`sticky top-0 z-30 flex items-center bg-surface ${compact ? 'gap-3 px-2' : 'gap-6 px-4'} ${hidden ? '' : 'shadow-sm'} ${animated ? BAR_TRANSITION : ''}`}
				style={{
					height: mode === 'hide' ? APP_SHELL_BAR_HEIGHT : `var(${APP_SHELL_BAR_HEIGHT_VAR})`,
					marginBottom: animated && mode !== 'hide' ? `calc(${APP_SHELL_BAR_HEIGHT} - var(${APP_SHELL_BAR_HEIGHT_VAR}))` : undefined,
				}}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				onFocus={() => setFocusedInside(true)}
				onBlur={(event) => {
					// Focus moving between two controls of the bar stays inside.
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedInside(false);
				}}
			>
				<span className={compact && mode === 'icons' ? 'sr-only' : `shrink-0 whitespace-nowrap font-semibold text-content ${compact ? 'text-xs' : 'text-base'} ${animated ? BAR_TRANSITION : ''}`}>{brand}</span>
				<ShellTabs tabs={tabs} tabsLabel={tabsLabel} renderLink={renderLink} moreLabel={moreLabel} density={compact ? (mode === 'icons' ? 'icons' : 'small') : 'normal'} />
				{actions}
			</header>
			<div className="flex min-h-0 flex-1">
				<ShellSideMenu menu={menu} renderLink={renderLink} variant={variant} folded={folded} onToggleFold={toggleFold} />
				<main id={mainId} tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
					{children}
				</main>
			</div>
		</div>
	);
}
