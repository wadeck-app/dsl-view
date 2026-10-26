import React, { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import type { ShellItem, ShellLinkProps, ShellMenu, ShellMenuEntry, ShellSeparator } from './AppShell.js';
import { MENU_FIXED_WIDTH, MENU_RESIZE_MAX_REM, MENU_RESIZE_MIN_REM, MENU_RESIZE_STEP_REM, MENU_VARIANT_AB_OPTIONS, type ShellMenuVariant } from './shellMenuVariants.js';
import { clampResizeRem, rootFontPx, type ResizableMenuWidth } from './useMenuWidth.js';

/** The values `menuVariant` accepts, as a lookup (for the unknown-value warning). */
export const MENU_VARIANTS = Object.fromEntries(Object.keys(MENU_VARIANT_AB_OPTIONS).map((variant) => [variant, variant])) as Readonly<Record<ShellMenuVariant, ShellMenuVariant>>;

/** True for the variants whose width is a constant (`MENU_FIXED_WIDTH`). */
export const isFixedWidthVariant = (variant: ShellMenuVariant): variant is keyof typeof MENU_FIXED_WIDTH => Object.prototype.hasOwnProperty.call(MENU_FIXED_WIDTH, variant);

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

/** What a measured width depends on: the labels of the links and whether each has an icon (not the separators). */
export function menuFitKey(menu: ShellMenu): string {
	return normalizeMenuEntries(menu.items)
		.filter((entry): entry is ShellItem => !isSeparator(entry))
		.map((entry) => `${entry.label}\u0000${entry.icon === undefined || entry.icon === null ? 0 : 1}`)
		.join('\u0001');
}

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
const TRANSITION = 'transition-colors motion-reduce:transition-none';
const ROW_CURRENT = 'bg-primary-light font-medium text-primary';
const ROW_OTHER = 'text-muted hover:bg-muted-bg hover:text-content';
const ITEM = `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${TRANSITION}`;
const CAPTION = 'px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted';

function itemLink(item: ShellItem, renderLink: (props: ShellLinkProps) => React.ReactElement): React.ReactElement {
	return renderLink({
		href: item.href,
		className: `${ITEM} ${item.current ? ROW_CURRENT : ROW_OTHER} ${FOCUS}`,
		'aria-current': item.current,
		children: (
			<>
				{item.icon}
				{/* `data-menu-label`: what `fit` measures and what gets a `title` when it is cut. */}
				<span data-menu-label="" className="truncate">
					{item.label}
				</span>
			</>
		),
	});
}

/**
 * A label wider than the room it has is cut by `truncate`: give it a `title` with the whole text, and take the title
 * away again when it fits. Measured after every change of width or entries, and when the window is resized (a `fluid`
 * menu changes width without any render).
 */
function useTruncationTitles(navRef: RefObject<HTMLElement | null>, width: string, key: string): void {
	useLayoutEffect(() => {
		const nav = navRef.current;
		if (!nav) {
			return;
		}
		const apply = (): void => {
			for (const label of Array.from(nav.querySelectorAll<HTMLElement>('[data-menu-label]'))) {
				// scrollWidth and clientWidth are rounded separately: a text that fits can read 1px wider than its box.
				if (label.scrollWidth > label.clientWidth + 1) {
					label.setAttribute('title', label.textContent ?? '');
				} else {
					label.removeAttribute('title');
				}
			}
		};
		apply();
		window.addEventListener('resize', apply);
		return () => window.removeEventListener('resize', apply);
	}, [navRef, width, key]);
}

/** The links and separators of the menu. Arrow keys, Home and End move between links; separators are never focusable. */
export function ShellMenuNav({ menu, renderLink, width }: { menu: ShellMenu; renderLink: (props: ShellLinkProps) => React.ReactElement; width: string }): React.ReactElement {
	const navRef = useRef<HTMLElement>(null);
	const entries = normalizeMenuEntries(menu.items);
	const currentId = entries.find((e) => !isSeparator(e) && e.current)?.id;
	// The current entry must not be hidden by the menu's own scroll.
	useEffect(() => {
		navRef.current?.querySelector('[aria-current]')?.scrollIntoView?.({ block: 'nearest' });
	}, [currentId]);
	useTruncationTitles(navRef, width, menuFitKey(menu));

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
		<nav ref={navRef} aria-label={menu.label} className="flex flex-col gap-0.5" onKeyDown={onKeyDown}>
			{entries.map((entry) => {
				if (isSeparator(entry)) {
					if (entry.label === undefined) {
						return <div key={entry.id} role="separator" className="my-1 h-px shrink-0 bg-border" />;
					}
					return (
						<div key={entry.id} role="separator" aria-label={entry.label}>
							<div aria-hidden="true" className={CAPTION}>
								{entry.label}
							</div>
						</div>
					);
				}
				return <React.Fragment key={entry.id}>{itemLink(entry, renderLink)}</React.Fragment>;
			})}
		</nav>
	);
}

// sticky under the bar; self-start: a stretched flex item is as tall as the page and has nothing to stick against.
// dvh where supported (mobile toolbars), vh otherwise.
// No transition on top, height or width: top and height read --app-shell-bar-height, which AppShell already moves frame
// by frame, and the width follows --app-shell-menu-width, which follows the pointer while the menu is dragged. A
// transition on top of either would chase the value with a lag and open a gap.
const FRAME = 'sticky flex h-[calc(100vh-var(--app-shell-bar-height))] shrink-0 self-start flex-col supports-[height:100dvh]:h-[calc(100dvh-var(--app-shell-bar-height))] border-r border-border bg-surface';

/** The key presses of the handle and the value each one gives (rem), or `undefined` for a key it does not handle. */
function nextRemForKey(key: string, rem: number): number | undefined {
	switch (key) {
		case 'ArrowLeft':
			return rem - MENU_RESIZE_STEP_REM;
		case 'ArrowRight':
			return rem + MENU_RESIZE_STEP_REM;
		case 'Home':
			return MENU_RESIZE_MIN_REM;
		case 'End':
			return MENU_RESIZE_MAX_REM;
		default:
			return undefined;
	}
}

/**
 * The drag handle on the right edge of the `resizable` menu: a focusable vertical separator (the "window splitter"
 * pattern) with a 6px hit area. The pointer is captured on press, so a drag keeps following it over an iframe or a field.
 * Keys: Left/Right 1rem, Home/End the limits. Double-click: back to the default width.
 */
function ResizeHandle({ resize, label }: { resize: ResizableMenuWidth; label: string }): React.ReactElement {
	// The pointer, where the drag started, the width it started from, and the last width it gave.
	const drag = useRef<{ pointerId: number; startX: number; startRem: number; rem: number } | null>(null);
	const [dragging, setDragging] = useState(false);

	const end = (event: React.PointerEvent<HTMLElement>): void => {
		const current = drag.current;
		if (current === null || event.pointerId !== current.pointerId) {
			return;
		}
		drag.current = null;
		setDragging(false);
		if (event.currentTarget.hasPointerCapture(current.pointerId)) {
			event.currentTarget.releasePointerCapture(current.pointerId);
		}
		resize.commit(current.rem);
	};

	return (
		// A focusable separator is an interactive widget (aria-valuenow, keyboard): the lint rule for static roles does not apply.
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label={label}
			aria-valuenow={resize.rem}
			aria-valuemin={MENU_RESIZE_MIN_REM}
			aria-valuemax={MENU_RESIZE_MAX_REM}
			aria-valuetext={`${resize.rem}rem`}
			tabIndex={0}
			data-dragging={dragging ? 'true' : undefined}
			className="group absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none select-none focus:outline-none"
			onPointerDown={(event) => {
				if (event.button !== 0) {
					return;
				}
				event.currentTarget.setPointerCapture(event.pointerId);
				drag.current = { pointerId: event.pointerId, startX: event.clientX, startRem: resize.rem, rem: resize.rem };
				setDragging(true);
			}}
			onPointerMove={(event) => {
				const current = drag.current;
				if (current === null || event.pointerId !== current.pointerId) {
					return;
				}
				current.rem = clampResizeRem(current.startRem + (event.clientX - current.startX) / rootFontPx());
				resize.move(current.rem);
			}}
			onPointerUp={end}
			onPointerCancel={end}
			onLostPointerCapture={end}
			onDoubleClick={resize.reset}
			onKeyDown={(event) => {
				if (event.altKey || event.ctrlKey || event.metaKey) {
					return;
				}
				const next = nextRemForKey(event.key, resize.rem);
				if (next === undefined) {
					return;
				}
				event.preventDefault();
				resize.commit(next);
			}}
		>
			{/* The line: shown while hovered, focused or dragged. The 6px around it are the hit area. */}
			<span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 w-0.5 group-hover:bg-primary group-focus-visible:bg-primary ${dragging ? 'bg-primary' : 'bg-transparent'}`} />
		</div>
	);
}

/**
 * The permanent side column. It is sticky under the top bar and scrolls on its own (`data-menu-scroller` marks the
 * element that scrolls). Its width is the CSS variable `--app-shell-menu-width`, which AppShell computes per variant.
 * `resize` is given for the `resizable` variant only, and adds the drag handle on the right edge, outside the scroll box.
 */
export function ShellSideMenu({
	menu,
	renderLink,
	width,
	asideRef,
	resize,
	resizeLabel,
}: {
	menu: ShellMenu;
	renderLink: (props: ShellLinkProps) => React.ReactElement;
	/** The width published in the variable: only used here to know when to look at the labels again. */
	width: string;
	asideRef: RefObject<HTMLElement | null>;
	resize?: ResizableMenuWidth;
	resizeLabel?: string;
}): React.ReactElement {
	const missingLabel = resize !== undefined && (resizeLabel === undefined || resizeLabel === '');
	useEffect(() => {
		if (missingLabel) {
			reportAuthoringMistake(
				`[AppShell] menuVariant "resizable" has a drag handle that needs a name for assistive technology: pass \`resizeLabel\` (for example "Resize the menu", in the language of the page). It is named "${menu.label}" meanwhile.`,
			);
		}
	}, [missingLabel, menu.label]);

	return (
		<aside ref={asideRef} data-testid="shell-menu" style={{ top: 'var(--app-shell-bar-height)', width: 'var(--app-shell-menu-width)' }} className={FRAME}>
			<div data-menu-scroller="" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
				<h2 className="sr-only">{menu.title}</h2>
				<ShellMenuNav menu={menu} renderLink={renderLink} width={width} />
			</div>
			{resize !== undefined && <ResizeHandle resize={resize} label={missingLabel || resizeLabel === undefined ? menu.label : resizeLabel} />}
		</aside>
	);
}

