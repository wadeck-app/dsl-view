import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';
import { APP_SHELL_BAR_HEIGHT, APP_SHELL_BAR_HEIGHT_VAR, APP_SHELL_MENU_WIDTH_VAR } from './shellMenuWidth.js';
import { MENU_FIXED_WIDTH, MENU_ICONS_ONLY_BELOW_REM, type ShellMenuVariant } from './shellMenuVariants.js';
import { isFixedWidthVariant, menuFitKey, MENU_VARIANTS, ShellSideMenu } from './ShellSideMenu.js';
import { ShellTabs } from './ShellTabs.js';
import { useBarHeight } from './useBarHeight.js';
import { BAR_ON_SCROLL_MODES, useBarOnScroll, type BarOnScroll } from './useBarOnScroll.js';
import { useFitMenuWidth, useResizableMenuWidth } from './useMenuWidth.js';

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
 * `menuVariant` (default `classic`) is the WIDTH of the side menu. Every variant looks the same (rows, icons, accent,
 * hover, separators with or without a caption); `--app-shell-menu-width` follows the width:
 * - `classic`: 15rem fixed. The reference.
 * - `narrow`: 12rem fixed.
 * - `wide`: 19rem fixed.
 * - `fluid`: `clamp(12rem, 16vw, 22rem)`, it follows the window.
 * - `fit`: as wide as the longest entry (icon, label, padding), between 10rem and 24rem. Measured in the DOM before the
 *   first paint, and again when the entries change, the window is resized or a web font finishes loading. Separators and
 *   their captions do not count.
 * - `resizable`: starts at 15rem; a handle on the right edge (cursor `col-resize`, visible on hover and focus, 6px hit
 *   area, pointer captured while dragging) resizes it live from 3.5rem to 60% of the window, and never so wide that less
 *   than 20rem is left for the content (a window so small that this falls under 3.5rem gets 3.5rem). The limits follow
 *   the window: `aria-valuemin/max/now` are the current ones, updated on resize. Under 6rem the menu shows icons only
 *   (initials for an entry with no icon), the label as `title` on the link; between the limits a label too long for the
 *   room is cut with an ellipsis (never wrapped, no horizontal scrollbar) and gets a `title` with the whole text, a
 *   separator caption too. Double-click resets to 15rem (held between the limits). The handle is a focusable
 *   `role="separator"` (`aria-valuenow` in rem): Left/Right move 1rem, Home/End go to the limits. Name it with
 *   `resizeLabel` (opt-in, the text is the host's; without it the handle takes `menu.label` and development warns).
 *   The width is the user's preference, kept in localStorage `app-shell.menu-width` (a positive number of rem, for example
 *   `17.5`). A stored value outside the current limits is shown held between them WITHOUT being rewritten (shrink the
 *   window and enlarge it again: the preference comes back); it changes only when the user drags, uses the keys or resets.
 *   A stored value that is not a positive number is ignored with a development warning (15rem).
 * The variable follows the live value, also while dragging, with no CSS transition (content, dock and sticky bars follow
 * without lag). An entry wider than the menu is cut and its label gets a `title` with the whole text. An unknown value
 * (including the removed `compact`, `rail`, `toggle`, `drawer`, `accent`, `slim`, `cards`, `tiles`, `flyout`,
 * `floating`, `tree`, `peek`) warns once and behaves as `classic`. In every variant the menu is sticky under the bar
 * with its own scrollbar, the arrow keys, Home and End move between the menu links, the current entry is scrolled into
 * view and the focus ring is visible. `MENU_VARIANT_AB_OPTIONS` holds a label and a one-line hint (with the width) for
 * each value, in the shape `useAbTest({ options })` takes.
 *
 * Menu `items` may hold `{ kind: 'separator', id, label? }`: a rule, with the label a caption for the next group. A
 * separator is never focusable. Leading, trailing and doubled separators are dropped silently (the data comes from
 * modules).
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
	/**
	 * Accessible name of the drag handle of `menuVariant: 'resizable'` (for example "Resize the menu"). Opt-in like
	 * `skipLabel`: the text is the host's (language). Without it the handle is named by `menu.label` and a development
	 * warning asks for the prop. Ignored by the other variants.
	 */
	resizeLabel?: string;
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

export function AppShell({ brand, tabs, tabsLabel, menu, actions, renderLink = defaultRenderLink, skipLabel, moreLabel, barOnScroll, menuVariant, resizeLabel, children }: AppShellProps): React.ReactElement {
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
	const asideRef = useRef<HTMLElement>(null);
	// The two variants that compute their width: `fit` measures the entries, `resizable` is dragged. Both are off (no
	// measure, no storage read) for the others.
	const fitRem = useFitMenuWidth(variant === 'fit', asideRef, menuFitKey(menu));
	const resize = useResizableMenuWidth(variant === 'resizable');
	const menuWidth = isFixedWidthVariant(variant) ? MENU_FIXED_WIDTH[variant] : variant === 'fit' ? `${fitRem}rem` : `${resize.rem}rem`;
	// A `resizable` menu under 6rem has no room for a label: icons (or initials) only, the label as tooltip.
	const iconsOnly = variant === 'resizable' && resize.rem < MENU_ICONS_ONLY_BELOW_REM;

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
	// The bar height is moved by useBarHeight; the menu width follows the menu. A layout effect: while the menu is dragged,
	// everything that reads the variable (content, dock, sticky bars) must move in the same frame as the menu.
	useLayoutEffect(() => {
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
			{/* The menu column's surface, from the very top of the page to its bottom, behind the bar and the sticky menu. The menu
			    only starts where the column does (below the bar's full 2.75rem while the page is at the top, 8px up after a small
			    scroll), and the bar is shorter than that while it animates or after a small scroll: without this, the strip
			    between them shows the page background. Same width variable and right border as the menu, so it follows a drag.
			    Not interactive, not announced, painted before the (positioned) bar and menu so both stay above it. */}
			<div
				aria-hidden="true"
				data-testid="shell-menu-backdrop"
				className="pointer-events-none absolute inset-y-0 left-0 border-r border-border bg-surface"
				style={{ width: `var(${APP_SHELL_MENU_WIDTH_VAR})` }}
			/>
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
				<ShellSideMenu menu={menu} renderLink={renderLink} width={menuWidth} asideRef={asideRef} resize={variant === 'resizable' ? resize : undefined} resizeLabel={resizeLabel} iconsOnly={iconsOnly} />
				<main id={mainId} tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
					{children}
				</main>
			</div>
		</div>
	);
}
