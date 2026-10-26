import { describe, expect, it } from 'vitest';
import { BAR_SCROLL_THRESHOLD_PX, BAR_TOP_PX, initialTrack, trackScroll, type ScrollTrack } from './useBarOnScroll.js';

const run = (offsets: number[], from = initialTrack(0)) => offsets.reduce(trackScroll, from);

describe('trackScroll: scrolled (shrink / icons)', () => {
	it('turns on only past the threshold, not at it', () => {
		expect(run([BAR_SCROLL_THRESHOLD_PX]).scrolled).toBe(false);
		expect(run([BAR_SCROLL_THRESHOLD_PX + 1]).scrolled).toBe(true);
	});

	it('stays on while scrolling back, down to the top zone, and turns off only there (hysteresis)', () => {
		const down = run([50]);
		expect(down.scrolled).toBe(true);
		// Back below the enter threshold but not at the top: still on, no flicker.
		expect(trackScroll(down, BAR_SCROLL_THRESHOLD_PX - 1).scrolled).toBe(true);
		expect(trackScroll(down, BAR_TOP_PX + 1).scrolled).toBe(true);
		expect(trackScroll(down, BAR_TOP_PX).scrolled).toBe(false);
		expect(trackScroll(down, 0).scrolled).toBe(false);
	});

	it('starts on when the page already loaded scrolled', () => {
		expect(initialTrack(300).scrolled).toBe(true);
		expect(initialTrack(0).scrolled).toBe(false);
	});
});

describe('trackScroll: hidden (hide)', () => {
	it('needs more than the threshold of travel down', () => {
		const at20 = initialTrack(20);
		expect(run([20 + BAR_SCROLL_THRESHOLD_PX], at20).hidden).toBe(false);
		expect(run([20 + BAR_SCROLL_THRESHOLD_PX + 1], at20).hidden).toBe(true);
	});

	it('comes back after more than the threshold of travel up', () => {
		const hidden = run([100, 200]);
		expect(hidden.hidden).toBe(true);
		expect(trackScroll(hidden, 200 - BAR_SCROLL_THRESHOLD_PX).hidden).toBe(true);
		expect(trackScroll(hidden, 200 - BAR_SCROLL_THRESHOLD_PX - 1).hidden).toBe(false);
	});

	it('a direction change restarts the travel: small wiggles never hide or show', () => {
		const shown = run([104, 100, 104, 100, 104], initialTrack(100));
		expect(shown.hidden).toBe(false);
		const hidden = run([200, 196, 200, 196, 200], initialTrack(100));
		expect(hidden.hidden).toBe(true);
	});

	it('is shown at the top whatever the travel', () => {
		const hidden = run([100, 200]);
		expect(trackScroll(hidden, BAR_TOP_PX).hidden).toBe(false);
	});

	it('an unchanged offset changes nothing', () => {
		const s = run([100, 200]);
		expect(trackScroll(s, 200)).toBe(s);
	});
});

// The bar changing height can move the scroll offset by a few pixels (the browser clamps it when the document gets
// shorter). Whatever it does, the state must not flip back and forth: that would restart the motion in a loop.
describe('trackScroll: drift caused by the bar own change does not make it oscillate', () => {
	const wiggle = (size: number, count = 20): number[] => Array.from({ length: count }, (_, i) => (i % 2 === 0 ? -size : size));
	const drift = (start: number, size: number, from: ScrollTrack): ScrollTrack[] => {
		const states: ScrollTrack[] = [];
		let y = start;
		let state = from;
		for (const step of wiggle(size)) {
			y += step;
			state = trackScroll(state, y);
			states.push(state);
		}
		return states;
	};

	// Entered at 9px, the browser pushes the offset back down by up to `size` px and forth again: the leave zone starts
	// BAR_TOP_PX, so any drift that stays above it (up to THRESHOLD - TOP - 1 px) keeps the compact state.
	for (let size = 1; size <= BAR_SCROLL_THRESHOLD_PX - BAR_TOP_PX - 1; size += 1) {
		it(`scrolled stays on through a ${size}px back-and-forth below the enter threshold`, () => {
			const entered = run([BAR_SCROLL_THRESHOLD_PX + 1]);
			expect(entered.scrolled).toBe(true);
			for (const state of drift(BAR_SCROLL_THRESHOLD_PX + 1, size, entered)) {
				expect(state.scrolled).toBe(true);
			}
		});
	}

	it(`a drift all the way to ${BAR_TOP_PX}px is the top: it leaves, as designed`, () => {
		const entered = run([BAR_SCROLL_THRESHOLD_PX + 1]);
		expect(trackScroll(entered, BAR_TOP_PX).scrolled).toBe(false);
	});

	for (let size = 1; size <= BAR_SCROLL_THRESHOLD_PX; size += 1) {
		it(`scrolled stays off through a ${size}px back-and-forth at the top`, () => {
			// The offset goes between 0 and `size` and never past the enter threshold (it is "more than", not "at").
			for (const state of drift(size, size, initialTrack(size))) {
				expect(state.scrolled).toBe(false);
			}
		});

		it(`hidden keeps its value through a ${size}px back-and-forth`, () => {
			const hidden = run([100, 200]);
			expect(hidden.hidden).toBe(true);
			for (const state of drift(200, size, hidden)) {
				expect(state.hidden).toBe(true);
			}
			const shown = run([100, 200, 150]);
			expect(shown.hidden).toBe(false);
			for (const state of drift(150, size, shown)) {
				expect(state.hidden).toBe(false);
			}
		});
	}

	it('the scrolled enter threshold is strictly above the leave zone, so a bar change of up to the gap cannot re-trigger it', () => {
		expect(BAR_SCROLL_THRESHOLD_PX - BAR_TOP_PX).toBeGreaterThanOrEqual(6);
	});
});
