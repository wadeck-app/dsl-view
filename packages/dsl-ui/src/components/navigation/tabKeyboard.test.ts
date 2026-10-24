import { describe, expect, it } from 'vitest';

import { nextTabIndex } from './tabKeyboard.js';

describe('nextTabIndex', () => {
	it('ArrowRight goes to the next tab and wraps from the last to the first', () => {
		expect(nextTabIndex('ArrowRight', 0, 3)).toBe(1);
		expect(nextTabIndex('ArrowRight', 2, 3)).toBe(0);
	});

	it('ArrowLeft goes to the previous tab and wraps from the first to the last', () => {
		expect(nextTabIndex('ArrowLeft', 2, 3)).toBe(1);
		expect(nextTabIndex('ArrowLeft', 0, 3)).toBe(2);
	});

	it('Home and End jump to the bounds whatever the current index', () => {
		expect(nextTabIndex('Home', 2, 3)).toBe(0);
		expect(nextTabIndex('End', 0, 3)).toBe(2);
	});

	it('a single tab always maps to itself', () => {
		expect(nextTabIndex('ArrowRight', 0, 1)).toBe(0);
		expect(nextTabIndex('ArrowLeft', 0, 1)).toBe(0);
	});

	it('any other key is not a navigation key', () => {
		for (const key of ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'a', 'Tab']) {
			expect(nextTabIndex(key, 1, 3)).toBeNull();
		}
	});

	it('there is nowhere to go without tabs', () => {
		expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
		expect(nextTabIndex('End', 0, 0)).toBeNull();
	});
});
