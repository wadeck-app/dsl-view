import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ShellItem, ShellLinkProps } from './AppShell.js';

// The tab is as tall as the top bar (self-stretch), so the current highlight fills it from top to bottom.
const TAB = 'flex shrink-0 items-center gap-1.5 self-stretch whitespace-nowrap px-4 text-sm transition-colors';
const TAB_CURRENT = 'font-semibold text-content';
const TAB_OTHER = 'font-medium text-muted hover:bg-muted-bg hover:text-content';
// Highlight color of a current tab without its own accent: the theme accent.
const THEME_ACCENT = 'var(--color-primary-solid)';

const MORE_BUTTON =
	'flex h-full shrink-0 items-center gap-1 px-3 text-sm font-medium text-muted transition-colors hover:bg-muted-bg hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
const MORE_PANEL = 'absolute right-0 top-full z-20 flex max-h-[70vh] w-60 flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-md';
const MORE_ITEM = 'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors';
const MORE_ITEM_CURRENT = 'bg-primary-light font-medium text-primary';
const MORE_ITEM_OTHER = 'text-muted hover:bg-muted-bg hover:text-content';

const mix = (color: string, pct: number): string => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// The current tab: a light vertical fade of the accent from the bottom edge, plus a small glow centered on the bottom
// edge (strongest at the bottom center, softer toward the sides and the top).
const currentTabStyle = (color: string): React.CSSProperties => ({
	backgroundImage: `radial-gradient(60% 90% at 50% 100%, ${mix(color, 32)}, transparent 100%), linear-gradient(0deg, ${mix(color, 14)}, transparent)`,
});

// Tolerance for sub-pixel layout: a tab cut by less than this still counts as fully visible.
const EDGE_TOLERANCE_PX = 1;

/**
 * Horizontal shift that brings `el` fully inside `nav`'s visible box: 0 when it already is, negative to scroll left,
 * positive to scroll right. If the tab is wider than the box, its left edge wins.
 */
export function scrollDeltaToReveal(navLeft: number, navWidth: number, elLeft: number, elRight: number): number {
	const left = elLeft - navLeft;
	const right = elRight - navLeft;
	if (left < -EDGE_TOLERANCE_PX) {
		return left;
	}
	if (right > navWidth + EDGE_TOLERANCE_PX) {
		return Math.min(right - navWidth, left);
	}
	return 0;
}

/** Ids of the tabs that are not fully visible in the scrollable nav. The nav's children must map 1:1 to `tabs`. */
function measureHiddenIds(nav: HTMLElement, tabs: ShellItem[]): string[] {
	if (nav.children.length !== tabs.length) {
		return [];
	}
	const navRect = nav.getBoundingClientRect();
	const hidden: string[] = [];
	tabs.forEach((tab, index) => {
		const rect = nav.children[index]!.getBoundingClientRect();
		if (scrollDeltaToReveal(navRect.left, nav.clientWidth, rect.left, rect.right) !== 0) {
			hidden.push(tab.id);
		}
	});
	return hidden;
}

export interface ShellTabsProps {
	tabs: ShellItem[];
	tabsLabel: string;
	renderLink: (props: ShellLinkProps) => React.ReactElement;
	/**
	 * Text of the overflow control that lists the tabs cut off by the bar. Opt-in, like `skipLabel`: the text is the
	 * host's (language), so without it no control is rendered and the cut-off tabs stay reachable by scrolling only.
	 */
	moreLabel?: string;
}

/**
 * The top bar's tabs. They scroll instead of wrapping; the current tab is brought into view, and with `moreLabel` a
 * disclosure lists the tabs that are cut off.
 */
export function ShellTabs({ tabs, tabsLabel, renderLink, moreLabel }: ShellTabsProps): React.ReactElement {
	const navRef = useRef<HTMLElement>(null);
	const moreRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const panelId = useId();
	const [hiddenIds, setHiddenIds] = useState<string[]>([]);
	const [open, setOpen] = useState(false);
	const currentId = tabs.find((tab) => tab.current)?.id;

	// Read through a ref so that a host re-creating the tabs array on each render does not re-run the effects below.
	const tabsRef = useRef(tabs);
	tabsRef.current = tabs;

	const measure = useCallback(() => {
		const nav = navRef.current;
		if (!nav) {
			return;
		}
		const next = measureHiddenIds(nav, tabsRef.current);
		setHiddenIds((prev) => (prev.join('\u0000') === next.join('\u0000') ? prev : next));
	}, []);

	// Scroll the nav itself (never the page): the current tab must not stay cut off at an edge. Instant, so there is
	// no motion to disable for prefers-reduced-motion.
	const revealCurrent = useCallback(() => {
		const nav = navRef.current;
		const items = tabsRef.current;
		const index = items.findIndex((tab) => tab.current);
		const el = nav && index >= 0 && nav.children.length === items.length ? nav.children[index] : undefined;
		if (nav && el) {
			const navRect = nav.getBoundingClientRect();
			const rect = el.getBoundingClientRect();
			nav.scrollLeft += scrollDeltaToReveal(navRect.left, nav.clientWidth, rect.left, rect.right);
		}
	}, []);

	useLayoutEffect(() => {
		revealCurrent();
		measure();
	}, [currentId, tabs.length, revealCurrent, measure]);

	useEffect(() => {
		const nav = navRef.current;
		if (!nav) {
			return;
		}
		nav.addEventListener('scroll', measure, { passive: true });
		// The nav's own box changes when the window resizes and when the overflow control appears or disappears next
		// to it: the current tab may be cut off again, so reveal it again before measuring.
		const onResize = () => {
			revealCurrent();
			measure();
		};
		const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(onResize);
		observer?.observe(nav);
		measure();
		return () => {
			nav.removeEventListener('scroll', measure);
			observer?.disconnect();
		};
	}, [measure, revealCurrent]);

	// Close on Escape (focus returns to the button) and on a press outside the control.
	useEffect(() => {
		if (!open) {
			return;
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setOpen(false);
				buttonRef.current?.focus();
			}
		};
		const onPointerDown = (event: PointerEvent) => {
			if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('pointerdown', onPointerDown);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('pointerdown', onPointerDown);
		};
	}, [open]);

	const hiddenTabs = tabs.filter((tab) => hiddenIds.includes(tab.id));
	const showMore = moreLabel !== undefined && hiddenTabs.length > 0;
	// The control disappears when nothing is cut off any more: do not leave the panel open on nothing.
	useEffect(() => {
		if (!showMore) {
			setOpen(false);
		}
	}, [showMore]);

	return (
		<>
			{/* As tall as the top bar (self-stretch). Scrolls instead of wrapping when there are more tabs than the bar can hold. */}
			<nav ref={navRef} aria-label={tabsLabel} className="flex min-w-0 items-center gap-4 self-stretch overflow-x-auto">
				{tabs.map((tab) => (
					<React.Fragment key={tab.id}>
						{renderLink({
							href: tab.href,
							className: `${TAB} ${tab.current ? TAB_CURRENT : TAB_OTHER}`,
							style: tab.current ? currentTabStyle(tab.accent ?? THEME_ACCENT) : undefined,
							'aria-current': tab.current,
							children: (
								<>
									{tab.icon}
									{tab.label}
								</>
							),
						})}
					</React.Fragment>
				))}
			</nav>
			{showMore && (
				<div ref={moreRef} className="static flex h-full shrink-0 items-center">
					{/* violations-suppress: react/no-raw-button the shell's overflow disclosure owns its geometry (as tall as the top bar) */}
					<button ref={buttonRef} type="button" className={MORE_BUTTON} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
						{moreLabel}
						<span aria-hidden="true">{`(${hiddenTabs.length})`}</span>
					</button>
					{open && (
						// Closes when a link inside is used: the host navigates, the tab list changes.
						// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
						<nav id={panelId} aria-label={moreLabel} className={MORE_PANEL} onClick={() => setOpen(false)}>
							{hiddenTabs.map((tab) => (
								<React.Fragment key={tab.id}>
									{renderLink({
										href: tab.href,
										className: `${MORE_ITEM} ${tab.current ? MORE_ITEM_CURRENT : MORE_ITEM_OTHER}`,
										'aria-current': tab.current,
										children: (
											<>
												{tab.icon}
												<span className="truncate">{tab.label}</span>
											</>
										),
									})}
								</React.Fragment>
							))}
						</nav>
					)}
				</div>
			)}
		</>
	);
}
