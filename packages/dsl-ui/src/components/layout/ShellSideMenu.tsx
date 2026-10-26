import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { initialsOf } from '../display/initials.js';
import { reportOnce } from '../dev/reportOnce.js';
import type { ShellItem, ShellLinkProps, ShellMenu, ShellMenuEntry, ShellSeparator } from './AppShell.js';
import { MENU_VARIANT_AB_OPTIONS, type ShellMenuVariant } from './shellMenuVariants.js';

/** The values `menuVariant` accepts, as a lookup (for the unknown-value warning). */
export const MENU_VARIANTS = Object.fromEntries(Object.keys(MENU_VARIANT_AB_OPTIONS).map((variant) => [variant, variant])) as Readonly<Record<ShellMenuVariant, ShellMenuVariant>>;

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

// What differs between the variants besides the shape of an entry: the classes of an entry (current / other), of the
// caption of a labelled separator, of the rule of an unlabelled one, and of the nav. Theme tokens only, no `dark:`.
interface Look {
	item: string;
	current: string;
	other: string;
	caption: string;
	rule: string;
	nav: string;
}

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
const TRANSITION = 'transition-colors motion-reduce:transition-none';
const ROW_CURRENT = 'bg-primary-light font-medium text-primary';
const ROW_OTHER = 'text-muted hover:bg-muted-bg hover:text-content';
const CAPTION = 'px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted';

const LOOKS: Record<ShellMenuVariant, Look> = {
	classic: { item: `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${TRANSITION}`, current: ROW_CURRENT, other: ROW_OTHER, caption: CAPTION, rule: 'my-1 h-px shrink-0 bg-border', nav: 'flex flex-col gap-0.5' },
	// Text only, one line, quiet. The current row is bold with a 2px line on the right edge (the menu has no side padding).
	slim: {
		item: `relative flex items-center px-4 py-1.5 text-[0.8125rem] leading-5 ${TRANSITION}`,
		current: 'font-semibold text-content after:absolute after:inset-y-0 after:right-0 after:w-0.5 after:bg-primary',
		other: 'text-muted hover:bg-muted-bg hover:text-content',
		caption: 'px-4 pb-1 pt-4 text-[0.6875rem] font-medium uppercase tracking-wider text-muted',
		rule: 'mx-4 my-2 h-px shrink-0 bg-border',
		nav: 'flex flex-col',
	},
	// A rounded card per entry that lifts a little on hover (not under reduced motion).
	cards: {
		item: 'flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-[transform,box-shadow,background-color,border-color] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none',
		current: 'border-primary bg-primary-light text-primary',
		other: 'border-border bg-surface text-content hover:border-primary',
		caption: 'px-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted',
		rule: 'my-2 h-px shrink-0 bg-border',
		nav: 'flex flex-col gap-2',
	},
	// Launcher: icon on top, small label below; the current one is a filled tile.
	tiles: {
		item: `flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[0.6875rem] leading-tight ${TRANSITION}`,
		current: 'bg-primary-solid font-medium text-on-solid',
		other: ROW_OTHER,
		caption: 'truncate px-1 pt-2 text-center text-[0.625rem] font-semibold uppercase tracking-wide text-muted',
		rule: 'mx-3 my-1.5 h-px shrink-0 bg-border',
		nav: 'flex flex-col gap-1',
	},
	// Icon only: the label flies out (see ShellSideMenu). The rule is inside a taller wrapper so that it can be hovered.
	flyout: {
		item: `relative flex items-center justify-center rounded-md px-0 py-2 text-sm ${TRANSITION}`,
		current: 'bg-primary-light text-primary',
		other: ROW_OTHER,
		caption: '',
		rule: 'px-2 py-1.5',
		nav: 'flex flex-col gap-0.5',
	},
	floating: {
		item: `flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${TRANSITION}`,
		current: ROW_CURRENT,
		other: ROW_OTHER,
		caption: CAPTION,
		rule: 'mx-3 my-1.5 h-px shrink-0 bg-border',
		nav: 'flex flex-col gap-0.5',
	},
	// Timeline: a guide line down the nav and a node per entry. A separator covers the line (a break between groups).
	tree: {
		item: `relative flex items-center gap-2 rounded-md py-1.5 pl-8 pr-3 text-sm ${TRANSITION}`,
		current: 'font-medium text-primary',
		other: ROW_OTHER,
		caption: 'relative bg-surface px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-content',
		rule: 'relative h-3 bg-surface',
		nav: 'relative flex flex-col gap-0.5 before:absolute before:bottom-3 before:left-[1.0625rem] before:top-3 before:w-px before:bg-border',
	},
	peek: { item: `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${TRANSITION}`, current: ROW_CURRENT, other: ROW_OTHER, caption: CAPTION, rule: 'my-1 h-px shrink-0 bg-border', nav: 'flex flex-col gap-0.5' },
};

/** The icon the host gave, or the initials of the label (decorative: the label carries the meaning). */
function glyph(item: ShellItem, className: string): React.ReactElement {
	return item.icon !== undefined && item.icon !== null ? (
		<span className={className}>{item.icon}</span>
	) : (
		<span aria-hidden="true" className={`${className} text-xs font-semibold`}>
			{initialsOf(item.label)}
		</span>
	);
}

function itemContent(item: ShellItem, variant: ShellMenuVariant): React.ReactNode {
	const label = <span className="truncate">{item.label}</span>;
	switch (variant) {
		case 'slim':
			return label;
		case 'cards': {
			const hasIcon = item.icon !== undefined && item.icon !== null;
			return (
				<>
					<span aria-hidden={hasIcon ? undefined : 'true'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted-bg text-xs font-semibold">
						{hasIcon ? item.icon : initialsOf(item.label)}
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="truncate font-medium">{item.label}</span>
						{item.description !== undefined && item.description !== '' && (
							<span data-description="" className="truncate text-xs font-normal text-muted">
								{item.description}
							</span>
						)}
					</span>
				</>
			);
		}
		case 'tiles':
			return (
				<>
					{glyph(item, 'flex h-6 items-center justify-center')}
					<span className="line-clamp-2 w-full break-words">{item.label}</span>
				</>
			);
		case 'flyout':
			return (
				<>
					{glyph(item, 'flex items-center justify-center')}
					<span className="sr-only" data-menu-label="">
						{item.label}
					</span>
					{item.current && <span data-testid="current-dot" aria-hidden="true" className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />}
				</>
			);
		case 'tree':
			return (
				<>
					<span
						data-node={item.current ? 'current' : 'other'}
						aria-hidden="true"
						className={`absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 ${item.current ? 'border-primary bg-primary' : 'border-muted bg-surface'}`}
					/>
					{label}
				</>
			);
		default:
			return (
				<>
					{item.icon}
					{label}
				</>
			);
	}
}

function itemLink(item: ShellItem, variant: ShellMenuVariant, renderLink: (props: ShellLinkProps) => React.ReactElement): React.ReactElement {
	const look = LOOKS[variant];
	return renderLink({
		href: item.href,
		className: `${look.item} ${item.current ? look.current : look.other} ${FOCUS}`,
		'aria-current': item.current,
		children: itemContent(item, variant),
	});
}

/** The links and separators of the menu. Arrow keys, Home and End move between links; separators are never focusable. */
export function ShellMenuNav({ menu, renderLink, variant }: { menu: ShellMenu; renderLink: (props: ShellLinkProps) => React.ReactElement; variant: ShellMenuVariant }): React.ReactElement {
	const navRef = useRef<HTMLElement>(null);
	const entries = normalizeMenuEntries(menu.items);
	const currentId = entries.find((e) => !isSeparator(e) && e.current)?.id;
	const look = LOOKS[variant];
	// The current entry must not be hidden by the menu's own scroll.
	useEffect(() => {
		navRef.current?.querySelector('[aria-current]')?.scrollIntoView?.({ block: 'nearest' });
	}, [currentId]);

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
		// The wrapper only listens to bubbling keys of the links inside it.
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<nav ref={navRef} aria-label={menu.label} className={look.nav} onKeyDown={onKeyDown}>
			{entries.map((entry) => {
				if (isSeparator(entry)) {
					// Icon-only: a rule (a hover target for the caption's flyout), never text.
					if (variant === 'flyout') {
						return (
							<div key={entry.id} role="separator" aria-label={entry.label} className={look.rule}>
								<div aria-hidden="true" className="h-px bg-border" />
							</div>
						);
					}
					if (entry.label === undefined) {
						return <div key={entry.id} role="separator" className={look.rule} />;
					}
					return (
						<div key={entry.id} role="separator" aria-label={entry.label}>
							{/* The tiles column is narrow: a long caption is cut, its tooltip has all of it. */}
							<div aria-hidden="true" title={variant === 'tiles' ? entry.label : undefined} className={look.caption}>
								{entry.label}
							</div>
						</div>
					);
				}
				return <React.Fragment key={entry.id}>{itemLink(entry, variant, renderLink)}</React.Fragment>;
			})}
		</nav>
	);
}

export const MENU_STORAGE_KEY = 'app-shell.menu';
type FoldState = 'open' | 'folded';

/**
 * Folded or open, kept in localStorage (`app-shell.menu`). Only the `peek` variant reads or writes it. An unknown stored
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

// sticky under the bar; self-start: a stretched flex item is as tall as the page and has nothing to stick against.
// dvh where supported (mobile toolbars), vh otherwise.
const FRAME =
	'sticky flex h-[calc(100vh-var(--app-shell-bar-height))] shrink-0 self-start flex-col supports-[height:100dvh]:h-[calc(100dvh-var(--app-shell-bar-height))] transition-[top,height,width] duration-150 motion-reduce:transition-none';
const FRAME_SURFACE = 'border-r border-border bg-surface';
const FOLD_BUTTON = `shrink-0 rounded-md p-1 text-muted hover:bg-muted-bg hover:text-content ${FOCUS}`;
const TIP = 'pointer-events-none fixed z-40 -translate-y-1/2 whitespace-nowrap rounded-md bg-content px-2 py-1 text-xs font-medium text-surface shadow-md transition-opacity duration-100 motion-reduce:transition-none';

/** Padding of the scroll box by variant (`floating` and `peek` have their own frame). */
const PADDING: Partial<Record<ShellMenuVariant, string>> = { classic: 'p-3 gap-3', slim: 'py-2', cards: 'p-4', tiles: 'px-1.5 py-2', flyout: 'px-2 py-3', tree: 'p-3' };

interface FlyoutTip {
	label: string;
	top: number;
	left: number;
}

/**
 * The permanent side column of every variant. It is sticky under the top bar and scrolls on its own
 * (`data-menu-scroller` marks the element that scrolls).
 *
 * - `flyout`: icons only; the label of the entry under the pointer or the focus floats to its right (position fixed, so
 *   the scroll box does not clip it and the layout does not move).
 * - `floating`: the aside is the margin (part of `--app-shell-menu-width`), the panel inside it is the visible surface.
 * - `peek`: foldable (button, `[` key, kept in localStorage); folded it is a sliver with a grab handle, and hover or focus
 *   shows the whole menu over the content, which does not move.
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
	variant: ShellMenuVariant;
	folded: boolean;
	onToggleFold: () => void;
}): React.ReactElement {
	const [hovered, setHovered] = useState(false);
	const [focusedInside, setFocusedInside] = useState(false);
	const [tip, setTip] = useState<FlyoutTip | null>(null);
	const heading = <h2 className="sr-only">{menu.title}</h2>;
	const nav = <ShellMenuNav menu={menu} renderLink={renderLink} variant={variant} />;
	const style = { top: 'var(--app-shell-bar-height)', width: 'var(--app-shell-menu-width)' };

	if (variant === 'peek') {
		const peeked = folded && (hovered || focusedInside);
		const sliver = folded && !peeked;
		return (
			<aside
				data-testid="shell-menu"
				data-peeked={String(peeked)}
				style={style}
				className={`${FRAME} ${FRAME_SURFACE}`}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				onFocus={() => setFocusedInside(true)}
				onBlur={(event) => {
					// Focus moving between two controls of the menu stays inside.
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedInside(false);
				}}
			>
				{/* The panel overlays the content when peeked: it leaves the flow (absolute), the aside keeps the sliver width. */}
				<div
					data-menu-scroller=""
					className={`absolute inset-y-0 left-0 z-20 flex flex-col gap-3 overflow-y-auto bg-surface transition-[width] duration-150 motion-reduce:transition-none ${sliver ? 'w-full' : peeked ? 'w-60 border-r border-border p-3 shadow-lg' : 'w-full p-3'}`}
				>
					{heading}
					{/* violations-suppress: react/no-raw-button the shell's fold control owns its geometry (a chevron in the menu header, a grab handle on the sliver) */}
					<button
						type="button"
						onClick={onToggleFold}
						aria-expanded={!folded}
						aria-keyshortcuts="["
						title={menu.label}
						aria-label={menu.label}
						className={sliver ? `group flex min-h-0 w-full flex-1 items-center justify-center hover:bg-muted-bg ${FOCUS}` : `${FOLD_BUTTON} self-end`}
					>
						{sliver ? <span aria-hidden="true" className="h-10 w-1 rounded-full bg-border group-hover:bg-muted" /> : folded ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
					</button>
					{/* Folded and not peeked: out of the tab order and of the accessibility tree. */}
					<div hidden={sliver} inert={sliver}>
						{nav}
					</div>
				</div>
			</aside>
		);
	}

	if (variant === 'floating') {
		return (
			<aside data-testid="shell-menu" style={style} className={`${FRAME} p-3`}>
				<div data-menu-scroller="" className="flex max-h-full min-h-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-lg">
					{heading}
					{nav}
				</div>
			</aside>
		);
	}

	if (variant === 'flyout') {
		const show = (target: EventTarget): void => {
			const host = (target as Element).closest?.('a[href], [role="separator"]');
			const label = host?.querySelector('[data-menu-label]')?.textContent ?? host?.getAttribute('aria-label');
			if (!host || !label) {
				setTip(null);
				return;
			}
			const rect = host.getBoundingClientRect();
			setTip({ label, top: rect.top + rect.height / 2, left: rect.right + 8 });
		};
		return (
			<aside
				data-testid="shell-menu"
				data-menu-scroller=""
				style={style}
				className={`${FRAME} ${FRAME_SURFACE} ${PADDING.flyout} gap-3 overflow-y-auto`}
				onMouseOver={(event) => show(event.target)}
				onMouseLeave={() => setTip(null)}
				onFocus={(event) => show(event.target)}
				onBlur={() => setTip(null)}
				onScroll={() => setTip(null)}
			>
				{heading}
				{nav}
				{tip && (
					<div aria-hidden="true" data-testid="shell-menu-flyout" className={TIP} style={{ top: tip.top, left: tip.left }}>
						{tip.label}
					</div>
				)}
			</aside>
		);
	}

	return (
		<aside data-testid="shell-menu" data-menu-scroller="" style={style} className={`${FRAME} ${FRAME_SURFACE} ${PADDING[variant] ?? ''} overflow-y-auto`}>
			{heading}
			{nav}
		</aside>
	);
}
