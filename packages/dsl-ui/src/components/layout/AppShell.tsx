import React, { useEffect, useId } from 'react';
import { APP_SHELL_BAR_HEIGHT, APP_SHELL_BAR_HEIGHT_VAR, APP_SHELL_MENU_WIDTH, APP_SHELL_MENU_WIDTH_VAR } from './shellMenuWidth.js';
import { ShellTabs } from './ShellTabs.js';

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
 * - `--app-shell-bar-height`: 2.75rem. The side menu and sticky content stick below it.
 *
 * Limits: no other responsive behaviour. The menu is a fixed 15rem and never collapses. Not a registry node: it is a
 * React API for the host app's layout.
 */

export interface ShellLinkProps {
	href: string;
	className: string;
	style?: React.CSSProperties;
	/** 'page' for the current page, 'true' for a current section (a tab); absent when not current. */
	'aria-current'?: 'page' | 'true';
	children: React.ReactNode;
}

export interface ShellItem {
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

export interface ShellMenu {
	/** Names the side menu: a visually hidden heading, so assistive technology still announces where you are. */
	title: string;
	/** Accessible name of the menu's navigation. */
	label: string;
	items: ShellItem[];
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
	children: React.ReactNode;
}

const defaultRenderLink = ({ href, children, ...rest }: ShellLinkProps): React.ReactElement => (
	<a href={href} {...rest}>
		{children}
	</a>
);

// Declared on the shell root too: the first paint has them before the effect publishes them on the document root.
const SHELL_VARS = { [APP_SHELL_MENU_WIDTH_VAR]: APP_SHELL_MENU_WIDTH, [APP_SHELL_BAR_HEIGHT_VAR]: APP_SHELL_BAR_HEIGHT } as React.CSSProperties;

// Shells mounted right now (normally one): the variable stays until the last one unmounts.
let mountedShells = 0;

const MENU_ITEM = 'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors';
const MENU_ITEM_CURRENT = 'bg-primary-light font-medium text-primary';
const MENU_ITEM_OTHER = 'text-muted hover:bg-muted-bg hover:text-content';

const SKIP_LINK =
	'sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-40 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-content focus:shadow-md';

export function AppShell({ brand, tabs, tabsLabel, menu, actions, renderLink = defaultRenderLink, skipLabel, moreLabel, children }: AppShellProps): React.ReactElement {
	const mainId = useId();
	// Published for floating tools mounted outside the shell (see the doc above); removed with the last mounted shell.
	useEffect(() => {
		const root = document.documentElement.style;
		mountedShells += 1;
		root.setProperty(APP_SHELL_MENU_WIDTH_VAR, APP_SHELL_MENU_WIDTH);
		root.setProperty(APP_SHELL_BAR_HEIGHT_VAR, APP_SHELL_BAR_HEIGHT);
		return () => {
			mountedShells -= 1;
			if (mountedShells === 0) {
				root.removeProperty(APP_SHELL_MENU_WIDTH_VAR);
				root.removeProperty(APP_SHELL_BAR_HEIGHT_VAR);
			}
		};
	}, []);
	return (
		<div className="relative flex min-h-screen flex-col bg-bg" style={SHELL_VARS}>
			{skipLabel !== undefined && (
				<a href={`#${mainId}`} className={SKIP_LINK}>
					{skipLabel}
				</a>
			)}
			{/* 44px, no border: a soft shadow separates it from the page. Sticky, z-30: above the content's own stickies (z-10),
			    below the drawer overlay (z-40) and the dialogs, toasts and popovers (z-50). Fixed height, whatever the tab:
			    a tab can fill it from top to bottom. */}
			<header className="sticky top-0 z-30 flex items-center gap-6 bg-surface px-4 shadow-sm" style={{ height: `var(${APP_SHELL_BAR_HEIGHT_VAR})` }}>
				<span className="shrink-0 whitespace-nowrap text-base font-semibold text-content">{brand}</span>
				<ShellTabs tabs={tabs} tabsLabel={tabsLabel} renderLink={renderLink} moreLabel={moreLabel} />
				{actions}
			</header>
			<div className="flex min-h-0 flex-1">
				{/* Sticky under the bar. self-start: a stretched flex item is as tall as the page and has nothing to stick
				    against. dvh where supported (mobile toolbars), vh otherwise. */}
				<aside
					data-testid="shell-menu"
					style={{ top: `var(${APP_SHELL_BAR_HEIGHT_VAR})`, width: `var(${APP_SHELL_MENU_WIDTH_VAR})` }}
					className="sticky flex h-[calc(100vh-var(--app-shell-bar-height))] shrink-0 self-start flex-col gap-3 overflow-y-auto border-r border-border bg-surface p-3 supports-[height:100dvh]:h-[calc(100dvh-var(--app-shell-bar-height))]"
				>
					<h2 className="sr-only">{menu.title}</h2>
					<nav aria-label={menu.label} className="flex flex-col gap-0.5">
						{menu.items.map((item) => (
							<React.Fragment key={item.id}>
								{renderLink({
									href: item.href,
									className: `${MENU_ITEM} ${item.current ? MENU_ITEM_CURRENT : MENU_ITEM_OTHER}`,
									'aria-current': item.current,
									children: (
										<>
											{item.icon}
											<span className="truncate">{item.label}</span>
										</>
									),
								})}
							</React.Fragment>
						))}
					</nav>
				</aside>
				<main id={mainId} tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
					{children}
				</main>
			</div>
		</div>
	);
}
