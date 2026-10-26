import { useCallback, useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import { reportOnce } from '../dev/reportOnce.js';
import { MENU_DEFAULT_REM, MENU_FIT_MAX_REM, MENU_FIT_MIN_REM, MENU_RESIZE_CONTENT_MIN_REM, MENU_RESIZE_MAX_SHARE, MENU_RESIZE_MIN_REM } from './shellMenuVariants.js';

/** localStorage key of the width the user gave the `resizable` menu, in rem (for example `17.5`). */
export const MENU_WIDTH_STORAGE_KEY = 'app-shell.menu-width';

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));
// Hundredths of a rem are finer than anyone can drag; it keeps the stored value and the aria value readable.
const hundredths = (rem: number): number => Math.round(rem * 100) / 100;

// Rounded down: a maximum of "60% of the window" must not be rounded up past it. The epsilon absorbs 0.6 * 64 = 38.400000000000006.
const floorHundredths = (rem: number): number => Math.floor(rem * 100 + 1e-6) / 100;

/** The limits of the `resizable` menu, in rem, for a window. */
export interface ResizeBounds {
	min: number;
	max: number;
}

/**
 * The limits for a window `windowPx` wide when a rem is `rootPx`: from `MENU_RESIZE_MIN_REM` to the smaller of
 * `MENU_RESIZE_MAX_SHARE` of the window and the window minus `MENU_RESIZE_CONTENT_MIN_REM` (room left for the content).
 * A window so small that this falls under the minimum gives `min === max`: the minimum wins.
 */
export function resizeBoundsRem(windowPx: number, rootPx: number): ResizeBounds {
	const windowRem = windowPx / rootPx;
	const max = Math.min(windowRem * MENU_RESIZE_MAX_SHARE, windowRem - MENU_RESIZE_CONTENT_MIN_REM);
	return { min: MENU_RESIZE_MIN_REM, max: Number.isFinite(max) ? Math.max(MENU_RESIZE_MIN_REM, floorHundredths(max)) : MENU_RESIZE_MIN_REM };
}

/** `rem` held between `bounds`. */
export function clampResizeRem(rem: number, bounds: ResizeBounds): number {
	return Math.min(bounds.max, Math.max(bounds.min, hundredths(rem)));
}

/** Pixels of one rem now (it follows the user's browser font setting). */
export function rootFontPx(): number {
	return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

// A plain decimal number, nothing else: no unit, sign, exponent, hex or blank.
const STORED_WIDTH = /^\d+(\.\d+)?$/;

function readStoredRem(): number {
	let raw: string | null;
	try {
		raw = localStorage.getItem(MENU_WIDTH_STORAGE_KEY);
	} catch (error) {
		reportOnce(`[AppShell] Could not read the menu width from localStorage "${MENU_WIDTH_STORAGE_KEY}": ${errorText(error)}. The menu starts at ${MENU_DEFAULT_REM}rem.`, console.error);
		return MENU_DEFAULT_REM;
	}
	if (raw === null) {
		return MENU_DEFAULT_REM;
	}
	const rem = STORED_WIDTH.test(raw) ? Number(raw) : NaN;
	// Any positive number is a preference: the limits depend on the window, so a value outside them is held between
	// them when it is shown (and stays stored), it is not garbage.
	if (!(rem > 0 && Number.isFinite(rem))) {
		reportAuthoringMistake(
			`[AppShell] Ignoring the menu width "${raw}" in localStorage "${MENU_WIDTH_STORAGE_KEY}": expected a number of rem greater than 0 (for example "17.5"; it is held between the limits of the window). The menu starts at ${MENU_DEFAULT_REM}rem; drag the handle or remove the key to replace it.`,
		);
		return MENU_DEFAULT_REM;
	}
	return rem;
}

export interface ResizableMenuWidth {
	/** Width shown, in rem: the preference held between the current limits. */
	rem: number;
	/** Current limits in rem (they follow the window). */
	min: number;
	max: number;
	/** `rem` held between the current limits. */
	clamp: (rem: number) => number;
	/** Live change (during a drag): state only, nothing is stored. */
	move: (rem: number) => void;
	/** Final change (end of a drag, a key): state and storage. */
	commit: (rem: number) => void;
	/** Back to the default width (held between the limits); the stored width is forgotten. */
	reset: () => void;
}

const readBounds = (): ResizeBounds => resizeBoundsRem(window.innerWidth, rootFontPx());

/**
 * The width of the `resizable` menu. Only when `enabled` does it read the storage or listen to the window (an off menu has
 * no side effect). The stored width is the user's PREFERENCE: it is held between the limits of the window as they are now
 * (they follow the window size, also after a resize) but never rewritten for that; only a drag, a key or a reset change
 * it. A stored value that is not a positive number of rem is ignored with a warning and left in place until the user
 * sets a width. A storage that refuses to read or write is reported and the width still applies to this page.
 */
export function useResizableMenuWidth(enabled: boolean): ResizableMenuWidth {
	const stored = useMemo(() => (enabled ? readStoredRem() : MENU_DEFAULT_REM), [enabled]);
	const [override, setOverride] = useState<number | null>(null);
	const [bounds, setBounds] = useState(readBounds);
	// The window decides the maximum (and the root font size the rem): read again when it is resized, zoomed included.
	useLayoutEffect(() => {
		if (!enabled) {
			return;
		}
		const update = (): void => {
			const next = readBounds();
			setBounds((prev) => (prev.min === next.min && prev.max === next.max ? prev : next));
		};
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, [enabled]);
	const clamp = useCallback((rem: number) => clampResizeRem(rem, bounds), [bounds]);
	const move = useCallback((rem: number) => setOverride(clamp(rem)), [clamp]);
	const commit = useCallback((rem: number) => {
		const value = clamp(rem);
		setOverride(value);
		try {
			localStorage.setItem(MENU_WIDTH_STORAGE_KEY, String(value));
		} catch (error) {
			console.error(`[AppShell] Could not remember the menu width in localStorage "${MENU_WIDTH_STORAGE_KEY}": ${errorText(error)}. It applies to this page only.`);
		}
	}, [clamp]);
	const reset = useCallback(() => {
		setOverride(MENU_DEFAULT_REM);
		try {
			localStorage.removeItem(MENU_WIDTH_STORAGE_KEY);
		} catch (error) {
			console.error(`[AppShell] Could not forget the menu width in localStorage "${MENU_WIDTH_STORAGE_KEY}": ${errorText(error)}. The width is back to ${MENU_DEFAULT_REM}rem for this page only.`);
		}
	}, []);
	return { rem: clamp(override ?? stored), min: bounds.min, max: bounds.max, clamp, move, commit, reset };
}

/**
 * Width, in rem, that shows the longest entry whole: from the left edge of the link to the end of its label (icon,
 * padding and gap included, read from the layout), plus the room the menu itself takes around the links (border,
 * padding, scrollbar). Held between the `fit` limits. A text is cut by `truncate` but its `scrollWidth` is not.
 */
export function measureFitRem(aside: HTMLElement): number {
	const nav = aside.querySelector('nav');
	let widest = 0;
	for (const link of Array.from(aside.querySelectorAll<HTMLElement>('a[href]'))) {
		const label = link.querySelector<HTMLElement>('[data-menu-label]');
		if (!label) {
			continue;
		}
		const before = label.getBoundingClientRect().left - link.getBoundingClientRect().left;
		const after = parseFloat(getComputedStyle(link).paddingRight) || 0;
		widest = Math.max(widest, before + label.scrollWidth + after);
	}
	// What surrounds the links: the aside minus the width the links get (the nav fills the padded scroll box).
	const around = nav ? Math.max(0, aside.offsetWidth - nav.getBoundingClientRect().width) : 0;
	// One pixel for the rounding of scrollWidth and offsetWidth; rounded up to the hundredth of a rem so that nothing is cut.
	const rem = Math.ceil(Number((((widest + around + 1) / rootFontPx()) * 100).toFixed(4))) / 100;
	return Math.min(MENU_FIT_MAX_REM, Math.max(MENU_FIT_MIN_REM, rem));
}

/**
 * The width of the `fit` menu in rem, measured in a layout effect (so the right width is there before the first paint)
 * and measured again when `key` changes (the entries), when the window is resized (zoom, root font size) and when web
 * fonts finish loading. `enabled` false: nothing is measured and no listener is added.
 */
export function useFitMenuWidth(enabled: boolean, asideRef: RefObject<HTMLElement | null>, key: string): number {
	const [rem, setRem] = useState(MENU_DEFAULT_REM);
	useLayoutEffect(() => {
		const aside = asideRef.current;
		if (!enabled || !aside) {
			return;
		}
		const measure = (): void => setRem(measureFitRem(aside));
		measure();
		window.addEventListener('resize', measure);
		// `document.fonts` is absent from old browsers and from jsdom: feature detection, the measure above still ran.
		const fonts = document.fonts as FontFaceSet | undefined;
		fonts?.addEventListener('loadingdone', measure);
		let active = true;
		void fonts?.ready.then(() => {
			if (active) measure();
		});
		return () => {
			active = false;
			window.removeEventListener('resize', measure);
			fonts?.removeEventListener('loadingdone', measure);
		};
	}, [enabled, asideRef, key]);
	return rem;
}
