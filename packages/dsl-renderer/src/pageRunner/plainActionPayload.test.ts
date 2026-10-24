import { describe, expect, it } from 'vitest';

import { plainActionPayload } from './pageRunnerUtils.js';

class Row {
	id = '1';
}

describe('plainActionPayload', () => {
	it('keeps a plain object as it is (same reference)', () => {
		const data = { id: '1', name: 'x' };
		expect(plainActionPayload(data)).toBe(data);
	});

	it('keeps an object without prototype and an empty object', () => {
		const bare = Object.create(null) as Record<string, unknown>;
		bare['a'] = 1;
		expect(plainActionPayload(bare)).toBe(bare);
		const empty = {};
		expect(plainActionPayload(empty)).toBe(empty);
	});

	it.each([
		['an Event', new Event('click')],
		['a class instance', new Row()],
		['an array', [{ id: '1' }]],
		['null', null],
		['undefined', undefined],
		['a string', 'click'],
		['a number', 3],
		['a boolean', true],
		['a function', () => undefined],
	])('drops %s', (_label, value) => {
		expect(plainActionPayload(value)).toBeUndefined();
	});
});
