import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BAR_MOTION_MS, createBarHeightMotion, easeOut } from './barHeightMotion.js';

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

function setup(initial = 2.75) {
	const seen: number[] = [];
	const motion = createBarHeightMotion(initial, (rem) => seen.push(rem));
	return { motion, seen, last: () => seen[seen.length - 1] };
}

describe('easeOut (cubic-bezier 0, 0, 0.2, 1: the Tailwind ease-out of the other transitions)', () => {
	it('starts at 0, ends at 1, never overshoots and only goes up', () => {
		expect(easeOut(0)).toBe(0);
		expect(easeOut(1)).toBe(1);
		let prev = 0;
		for (let i = 1; i <= 100; i += 1) {
			const v = easeOut(i / 100);
			expect(v).toBeGreaterThanOrEqual(prev);
			expect(v).toBeLessThanOrEqual(1);
			prev = v;
		}
	});

	it('is front-loaded: well past half way at half the time (ease-out, not linear)', () => {
		expect(easeOut(0.5)).toBeGreaterThan(0.75);
	});
});

describe('createBarHeightMotion', () => {
	it('moves in between over BAR_MOTION_MS, then lands exactly on the target', () => {
		const { motion, seen, last } = setup(2.75);
		motion.go(1.5, true);
		// Nothing is written synchronously: the old value stays until the first frame.
		expect(seen).toEqual([]);
		vi.advanceTimersByTime(BAR_MOTION_MS / 2);
		expect(last()).toBeLessThan(2.75);
		expect(last()).toBeGreaterThan(1.5);
		vi.advanceTimersByTime(BAR_MOTION_MS);
		expect(last()).toBe(1.5);
		expect(motion.value).toBe(1.5);
	});

	it('goes down monotonically with no value outside [target, start] (no gap, no overshoot)', () => {
		const { motion, seen } = setup(2.75);
		motion.go(0, true);
		vi.advanceTimersByTime(BAR_MOTION_MS * 2);
		expect(seen.length).toBeGreaterThan(3);
		for (let i = 1; i < seen.length; i += 1) {
			expect(seen[i]!).toBeLessThanOrEqual(seen[i - 1]!);
		}
		expect(Math.min(...seen)).toBe(0);
		expect(Math.max(...seen)).toBeLessThanOrEqual(2.75);
	});

	it('stops asking for frames once it landed', () => {
		const { motion, seen } = setup(2.75);
		motion.go(1.5, true);
		vi.advanceTimersByTime(BAR_MOTION_MS * 2);
		const count = seen.length;
		vi.advanceTimersByTime(1000);
		expect(seen).toHaveLength(count);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('animate=false (reduced motion, first mount) writes the target at once and schedules nothing', () => {
		const { motion, seen } = setup(2.75);
		motion.go(1.5, false);
		expect(seen).toEqual([1.5]);
		expect(motion.value).toBe(1.5);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('a new target mid-way starts from where the bar is now, not from the old start (no jump)', () => {
		const { motion, seen, last } = setup(2.75);
		motion.go(1.5, true);
		vi.advanceTimersByTime(BAR_MOTION_MS / 2);
		const mid = last()!;
		motion.go(2.75, true);
		vi.advanceTimersByTime(16);
		// The first frames of the way back stay close to where it was, they do not snap to either end.
		expect(Math.abs(last()! - mid)).toBeLessThan(0.3);
		vi.advanceTimersByTime(BAR_MOTION_MS * 2);
		expect(last()).toBe(2.75);
	});

	it('the same target again does not restart anything', () => {
		const { motion, seen } = setup(2.75);
		motion.go(2.75, true);
		expect(seen).toEqual([]);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('stop() cancels the pending frame and keeps the value reached', () => {
		const { motion, seen } = setup(2.75);
		motion.go(0, true);
		vi.advanceTimersByTime(BAR_MOTION_MS / 2);
		motion.stop();
		const count = seen.length;
		vi.advanceTimersByTime(1000);
		expect(seen).toHaveLength(count);
		expect(vi.getTimerCount()).toBe(0);
	});
});
