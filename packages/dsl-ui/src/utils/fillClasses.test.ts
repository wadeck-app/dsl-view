import { describe, expect, it } from 'vitest';
import { FILL_CLASSES, fillClasses, joinClasses } from './fillClasses.js';

describe('fillClasses', () => {
	it('is exactly the three classes the contract relies on (percent height, flex share, shrinkable)', () => {
		expect(FILL_CLASSES.split(' ').sort()).toStrictEqual(['flex-1', 'h-full', 'min-h-0']);
	});

	it('returns the classes only for the boolean true', () => {
		expect(fillClasses(true)).toBe(FILL_CLASSES);
	});

	it.each([false, undefined, null, 0, 1, '', 'true', 'yes', {}, []])('returns nothing for %j: a YAML value that merely looks truthy must not switch it on', (value) => {
		expect(fillClasses(value)).toBe('');
	});
});

describe('joinClasses', () => {
	it('joins names with one space and drops empty, false and undefined parts', () => {
		expect(joinClasses('a', '', false, undefined, 'b')).toBe('a b');
	});

	it('returns an empty string when nothing is left', () => {
		expect(joinClasses('', false, undefined)).toBe('');
	});
});
