import { describe, expect, it } from 'vitest';
import { BAR_SCROLL_THRESHOLD_PX, BAR_TOP_PX, initialTrack, trackScroll } from './useBarOnScroll.js';

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
