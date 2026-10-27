import { useEffect, useState } from 'react';

/** What the top bar does when the page scrolls. `steady` (default): nothing. */
export type BarOnScroll = 'steady' | 'shrink' | 'hide' | 'icons';
/** `full`: normal bar. `compact`: shrunk (`shrink`) or reduced to icons (`icons`). `hidden`: slid away (`hide`). */
export type BarState = 'full' | 'compact' | 'hidden';

/** The values `barOnScroll` accepts, as a lookup (for the unknown-value warning). */
export const BAR_ON_SCROLL_MODES: Readonly<Record<BarOnScroll, BarOnScroll>> = { steady: 'steady', shrink: 'shrink', hide: 'hide', icons: 'icons' };

/** The bar reacts after this much scrolling in one direction (px). */
export const BAR_SCROLL_THRESHOLD_PX = 8;
/** At or above this offset the page counts as "at the top": the bar is full again. Below THRESHOLD, so there is no flicker at the limit. */
export const BAR_TOP_PX = 2;

export interface ScrollTrack {
	y: number;
	/** Pixels scrolled in the current direction since it last changed: positive down, negative up. */
	travel: number;
	/** Scrolled far enough from the top for `shrink` / `icons` to apply. */
	scrolled: boolean;
	/** `hide`: the bar is slid away. */
	hidden: boolean;
}

export function initialTrack(y: number): ScrollTrack {
	return { y, travel: 0, scrolled: y > BAR_SCROLL_THRESHOLD_PX, hidden: false };
}

/**
 * Next state for a new scroll offset. Pure, so the hysteresis can be tested without a browser:
 * - `scrolled` turns on past THRESHOLD and off only back at the top (TOP < THRESHOLD);
 * - `hidden` turns on after THRESHOLD px of travel down, off after THRESHOLD px of travel up, and at the top.
 */
export function trackScroll(prev: ScrollTrack, y: number): ScrollTrack {
	const delta = y - prev.y;
	if (delta === 0) {
		return prev;
	}
	const sameDirection = prev.travel === 0 || Math.sign(prev.travel) === Math.sign(delta);
	const travel = sameDirection ? prev.travel + delta : delta;
	const scrolled = prev.scrolled ? y > BAR_TOP_PX : y > BAR_SCROLL_THRESHOLD_PX;
	let hidden = prev.hidden;
	if (y <= BAR_TOP_PX || travel < -BAR_SCROLL_THRESHOLD_PX) {
		hidden = false;
	} else if (travel > BAR_SCROLL_THRESHOLD_PX) {
		hidden = true;
	}
	return { y, travel, scrolled, hidden };
}

/**
 * The state of the top bar for `mode`, from the window scroll offset. Nothing is listened to for `steady`. The listener
 * is passive and coalesced to one update per animation frame; it reads `scrollY` only (no layout).
 * `expanded` (keyboard focus inside the bar; never the pointer) always gives `full`.
 */
export function useBarOnScroll(mode: BarOnScroll, expanded: boolean): BarState {
	const [track, setTrack] = useState<ScrollTrack>(() => initialTrack(typeof window === 'undefined' ? 0 : window.scrollY));
	const listens = mode !== 'steady';
	useEffect(() => {
		if (!listens) {
			return;
		}
		let frame = 0;
		const update = () => {
			frame = 0;
			setTrack((prev) => trackScroll(prev, window.scrollY));
		};
		const onScroll = () => {
			if (frame === 0) {
				frame = requestAnimationFrame(update);
			}
		};
		// The page may already be scrolled when the mode is switched on.
		update();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			if (frame !== 0) {
				cancelAnimationFrame(frame);
			}
		};
	}, [listens]);
	if (mode === 'steady' || expanded) {
		return 'full';
	}
	if (mode === 'hide') {
		return track.hidden ? 'hidden' : 'full';
	}
	return track.scrolled ? 'compact' : 'full';
}
