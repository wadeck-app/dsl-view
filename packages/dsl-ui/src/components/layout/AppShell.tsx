import React, { useId } from 'react';
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

const MENU_ITEM = 'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors';
const MENU_ITEM_CURRENT = 'bg-primary-light font-medium text-primary';
const MENU_ITEM_OTHER = 'text-muted hover:bg-muted-bg hover:text-content';

const SKIP_LINK =
	'sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-20 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-content focus:shadow-md';

export function AppShell({ brand, tabs, tabsLabel, menu, actions, renderLink = defaultRenderLink, skipLabel, moreLabel, children }: AppShellProps): React.ReactElement {
	const mainId = useId();
	return (
		<div className="relative flex min-h-screen flex-col bg-bg">
			{skipLabel !== undefined && (
				<a href={`#${mainId}`} className={SKIP_LINK}>
					{skipLabel}
				</a>
			)}
			{/* 44px, no border: a soft shadow separates it from the page (z-10 keeps the shadow above the content). Fixed
			    height, whatever the tab: a tab can fill it from top to bottom. */}
			<header className="relative z-10 flex h-11 items-center gap-6 bg-surface px-4 shadow-sm">
				<span className="shrink-0 whitespace-nowrap text-base font-semibold text-content">{brand}</span>
				<ShellTabs tabs={tabs} tabsLabel={tabsLabel} renderLink={renderLink} moreLabel={moreLabel} />
				{actions}
			</header>
			<div className="flex min-h-0 flex-1">
				<aside data-testid="shell-menu" className="flex w-60 shrink-0 flex-col gap-3 border-r border-border bg-surface p-3">
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
