import { describe, expect, it } from 'vitest';

import { getErrorMessage } from './errors.js';

describe('getErrorMessage', () => {
	it('gives the message of an Error, including a subclass', () => {
		expect(getErrorMessage(new Error('boom'))).toBe('boom');
		expect(getErrorMessage(new RangeError('out of range'))).toBe('out of range');
	});

	it.each([['text', 'text', 'text'], ['a number', 42, '42'], ['null', null, 'null'], ['undefined', undefined, 'undefined']])('gives %s as text', (_label, thrown, text) => {
		expect(getErrorMessage(thrown)).toBe(text);
	});
});
