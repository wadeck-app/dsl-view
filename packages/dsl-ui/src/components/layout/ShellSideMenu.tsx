import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { initialsOf } from '../display/initials.js';
import { reportOnce } from '../dev/reportOnce.js';
import type { ShellItem, ShellLinkProps, ShellMenu, ShellMenuEntry, ShellMenuVariant, ShellSeparator } from './AppShell.js';

/** The values `menuVariant` accepts, as a lookup (for the unknown-value warning). */
export const MENU_VARIANTS: Readonly<Record<ShellMenuVariant, ShellMenuVariant>> = { classic: 'classic', compact: 'compact', rail: 'rail', toggle: 'toggle', drawer: 'drawer', accent: 'accent' };

const isSeparator = (entry: ShellMenuEntry): entry is ShellSeparator => entry.kind === 'separator';

/**
 * The entries to draw. Separators come from data written by modules, so a leading, trailing or doubled one is dropped
 * silently (there is nothing the author could usefully fix). Of two consecutive separators the labelled one stays.
 */
export function normalizeMenuEntries(entries: readonly ShellMenuEntry[]): ShellMenuEntry[] {
	const out: ShellMenuEntry[] = [];
	for (const entry of entries) {
		if (!isSeparator(entry)) {
			out.push(entry);
			continue;
		}
		const last = out[out.length - 1];
		if (last === undefined) {
			continue;
		}
		if (isSeparator(last)) {
			if (last.label === undefined && entry.label !== undefined) {
				out[out.length - 1] = entry;
			}
			continue;
		}
		out.push(entry);
	}
	const end = out[out.length - 1];
	if (end !== undefined && isSeparator(end)) {
		out.pop();
	}
	return out;
}

/** How an entry looks: all of it, or collapsed to its icon (initials without one); the name stays for assistive technology. */
type Density = 'full' | 'collapsed';

const ITEM_BASE = 'flex items-center gap-2 rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
const ITEM_SIZE: Record<ShellMenuVariant, string> = {
	classic: 'px-3 py-2 text-sm',
	compact: 'px-2 py-1 text-xs',
	rail: 'px-3 py-2 text-sm',
	toggle: 'px-3 py-2 text-sm',
	drawer: 'px-3 py-2 text-sm',
	// Larger hit area, and a hover that slides the text in.
	accent: 'relative py-2.5 pl-4 pr-3 text-sm transition-[padding,background-color] hover:pl-5',
};
const ITEM_CURRENT = 'bg-primary-light font-medium text-primary';
const ITEM_CURRENT_ACCENT = 'before:absolute before:bottom-1 before:left-0 before:top-1 before:w-[3px] before:rounded-r before:bg-primary';
const ITEM_OTHER = 'text-muted hover:bg-muted-bg hover:text-content';

const CAPTION = 'px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted';
const CAPTION_ACCENT_STYLE: React.CSSProperties = { fontVariantCaps: 'all-small-caps', letterSpacing: '0.08em' };

function itemLink(item: ShellItem, variant: ShellMenuVariant, density: Density, renderLink: (props: ShellLinkProps) => React.ReactElement): React.ReactElement {
	const accent = variant === 'accent';
	const className = [ITEM_BASE, ITEM_SIZE[variant], item.current ? `${ITEM_CURRENT} ${accent ? ITEM_CURRENT_ACCENT : ''}` : ITEM_OTHER, density === 'collapsed' ? 'justify-center' : ''].join(' ');
	return renderLink({
		href: item.href,
		className,
		'aria-current': item.current,
		title: density === 'collapsed' ? item.label : undefined,
		children:
			density === 'collapsed' ? (
				<>
					{item.icon ?? (
						<span aria-hidden="true" className="text-xs font-semibold">
							{initialsOf(item.label)}
						</span>
					)}
					<span className="sr-only">{item.label}</span>
				</>
			) : (
				<>
					{item.icon}
					<span className="truncate">{item.label}</span>
				</>
			),
	});
}

/** The links and separators of the menu. Arrow keys, Home and End move between links; separators are never focusable. */
export function ShellMenuNav({
	menu,
	renderLink,
	variant,
	density,
	onNavigate,
}: {
	menu: ShellMenu;
	renderLink: (props: ShellLinkProps) => React.ReactElement;
	variant: ShellMenuVariant;
	density: Density;
	/** Called when a link inside was used (the host navigates): the drawer closes. */
	onNavigate?: () => void;
}): React.ReactElement {
	const navRef = useRef<HTMLElement>(null);
	const entries = normalizeMenuEntries(menu.items);
	const currentId = entries.find((e) => !isSeparator(e) && e.current)?.id;
	// The current entry must not be hidden by the menu's own scroll.
	useEffect(() => {
		navRef.current?.querySelector('[aria-current]')?.scrollIntoView?.({ block: 'nearest' });
	}, [currentId, density]);

	const onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) {
			return;
		}
		const links = Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href]') ?? []);
		if (links.length === 0) {
			return;
		}
		const at = links.indexOf(document.activeElement as HTMLElement);
		let next = at;
		if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = links.length - 1;
		else if (event.key === 'ArrowDown') next = Math.min(links.length - 1, at + 1);
		else next = Math.max(0, at - 1);
		event.preventDefault();
		links[next]?.focus();
	};

	return (
		// The wrapper only listens to bubbling keys and clicks of the links inside it.
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<nav ref={navRef} aria-label={menu.label} className="flex flex-col gap-0.5" onKeyDown={onKeyDown} onClick={onNavigate ? (e) => (e.target as Element).closest('a[href]') && onNavigate() : undefined}>
			{entries.map((entry) => {
				if (isSeparator(entry)) {
					if (entry.label === undefined || density === 'collapsed') {
						return <div key={entry.id} role="separator" aria-label={entry.label} className="my-1 h-px shrink-0 bg-border" />;
					}
					return (
						<div key={entry.id} role="separator" aria-label={entry.label}>
							<div aria-hidden="true" className={CAPTION} style={variant === 'accent' ? CAPTION_ACCENT_STYLE : undefined}>
								{entry.label}
							</div>
						</div>
					);
				}
				return <React.Fragment key={entry.id}>{itemLink(entry, variant, density, renderLink)}</React.Fragment>;
			})}
		</nav>
	);
}

export const MENU_STORAGE_KEY = 'app-shell.menu';
type FoldState = 'open' | 'folded';

/**
 * Folded or open, kept in localStorage (`app-shell.menu`). Only the `toggle` variant reads or writes it. An unknown stored
 * value warns and the menu stays open; a storage that refuses the write says so, and the choice still applies to this page.
 */
export function useFoldedMenu(enabled: boolean): [boolean, () => void] {
	const [state, setState] = useState<FoldState>(() => {
		if (!enabled) {
			return 'open';
		}
		const stored = localStorage.getItem(MENU_STORAGE_KEY);
		if (stored === null || stored === 'open') {
			return 'open';
		}
		if (stored === 'folded') {
			return 'folded';
		}
		reportOnce(`[AppShell] Ignoring unknown menu state "${stored}" in localStorage "${MENU_STORAGE_KEY}"; expected one of: open, folded. The menu stays open.`, console.warn);
		return 'open';
	});
	const toggle = (): void => {
		const next: FoldState = state === 'open' ? 'folded' : 'open';
		setState(next);
		try {
			localStorage.setItem(MENU_STORAGE_KEY, next);
		} catch (error) {
			console.error(`[AppShell] Could not remember the menu state in localStorage "${MENU_STORAGE_KEY}": ${error instanceof Error ? error.message : String(error)}. It applies to this page only.`);
		}
	};
	return [state === 'folded' && enabled, toggle];
}

/** True when a key press is meant for the page, not for a field being typed in. */
export function isShortcutTarget(event: KeyboardEvent): boolean {
	if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
		return false;
	}
	const target = event.target;
	if (target instanceof HTMLElement) {
		return !(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
	}
	return true;
}

/**
 * The permanent side column: `classic`, `compact`, `accent`, `toggle` (and its folded form) and `rail`. It is sticky under the
 * top bar and scrolls on its own. The `drawer` variant has no column (see AppShell).
 *
 * `rail` and a folded `toggle` collapse to icons. The rail expands over the content on hover or keyboard focus (the
 * content does not move, the width variable stays at the rail width); a folded toggle expands only through its button.
 */
export function ShellSideMenu({
	menu,
	renderLink,
	variant,
	folded,
	onToggleFold,
}: {
	menu: ShellMenu;
	renderLink: (props: ShellLinkProps) => React.ReactElement;
	variant: Exclude<ShellMenuVariant, 'drawer'>;
	folded: boolean;
	onToggleFold: () => void;
}): React.ReactElement {
	const [hovered, setHovered] = useState(false);
	const [focusedInside, setFocusedInside] = useState(false);
	const rail = variant === 'rail';
	const collapsed = rail || (variant === 'toggle' && folded);
	const expanded = rail && (hovered || focusedInside);
	const density: Density = collapsed && !expanded ? 'collapsed' : 'full';
	const motion = 'motion-reduce:transition-none';

	// sticky under the bar; self-start: a stretched flex item is as tall as the page and has nothing to stick against.
	// dvh where supported (mobile toolbars), vh otherwise.
	const frame = `sticky flex h-[calc(100vh-var(--app-shell-bar-height))] shrink-0 self-start flex-col border-r border-border bg-surface supports-[height:100dvh]:h-[calc(100dvh-var(--app-shell-bar-height))] transition-[top,height,width] duration-150 ${motion}`;
	const handlers = rail
		? {
				onMouseEnter: () => setHovered(true),
				onMouseLeave: () => setHovered(false),
				onFocus: () => setFocusedInside(true),
				onBlur: (event: React.FocusEvent<HTMLElement>) => {
					// Focus moving between two links of the menu stays inside.
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedInside(false);
				},
			}
		: {};
	const heading = <h2 className="sr-only">{menu.title}</h2>;
	const nav = <ShellMenuNav menu={menu} renderLink={renderLink} variant={variant} density={density} />;

	if (rail) {
		return (
			<aside data-testid="shell-menu" data-expanded={String(expanded)} style={{ top: 'var(--app-shell-bar-height)', width: 'var(--app-shell-menu-width)' }} className={`${frame} !border-r-0`} {...handlers}>
				{/* The panel overlays the content when expanded: it leaves the flow (absolute), the aside keeps the rail width. */}
				<div
					className={`absolute inset-y-0 left-0 z-20 flex flex-col gap-3 overflow-y-auto border-r border-border bg-surface p-3 transition-[width] duration-150 ${motion} ${expanded ? 'w-60 shadow-lg' : 'w-full'}`}
				>
					{heading}
					{nav}
				</div>
			</aside>
		);
	}

	return (
		<aside
			data-testid="shell-menu"
			style={{ top: 'var(--app-shell-bar-height)', width: 'var(--app-shell-menu-width)' }}
			className={`${frame} gap-3 overflow-y-auto ${collapsed ? 'items-stretch px-2 py-3' : 'p-3'}`}
		>
			{heading}
			{variant === 'toggle' && (
				// violations-suppress: react/no-raw-button the shell's fold control owns its geometry (a chevron in the menu header)
				<button
					type="button"
					onClick={onToggleFold}
					aria-expanded={!folded}
					aria-keyshortcuts="["
					title={menu.label}
					aria-label={menu.label}
					className="flex shrink-0 items-center justify-center self-end rounded-md p-1 text-muted hover:bg-muted-bg hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
				>
					{folded ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
				</button>
			)}
			{nav}
		</aside>
	);
}
