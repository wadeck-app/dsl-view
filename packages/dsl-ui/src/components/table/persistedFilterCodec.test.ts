import { describe, expect, it } from 'vitest';

import { decodeFilterValue, encodeFilterValue } from './persistedFilterCodec.js';

describe('encodeFilterValue', () => {
	it('writes a single value as is, a list joined by a literal comma', () => {
		expect(encodeFilterValue('failed')).toBe('failed');
		expect(encodeFilterValue(['failed', 'done'])).toBe('failed,done');
	});

	it('escapes the comma and the percent sign inside a value so they cannot be mistaken for a separator', () => {
		expect(encodeFilterValue('Smith, John')).toBe('Smith%2C John');
		expect(encodeFilterValue('50%')).toBe('50%25');
		expect(encodeFilterValue(['a,b', 'c%'])).toBe('a%2Cb,c%25');
	});

	it('escapes the percent sign before the comma, so the escape of a comma is not escaped again', () => {
		expect(encodeFilterValue('%,')).toBe('%25%2C');
	});

	it('stringifies numbers and booleans, including the falsy ones', () => {
		expect(encodeFilterValue(0)).toBe('0');
		expect(encodeFilterValue(false)).toBe('false');
		expect(encodeFilterValue([0, false])).toBe('0,false');
	});
});

describe('decodeFilterValue', () => {
	it('reads a value without a comma as one string and a comma-separated value as a list', () => {
		expect(decodeFilterValue('failed')).toBe('failed');
		expect(decodeFilterValue('failed,done')).toStrictEqual(['failed', 'done']);
	});

	it('drops empty parts of a list', () => {
		expect(decodeFilterValue('failed,,done,')).toStrictEqual(['failed', 'done']);
	});

	it('reads an escaped comma as part of ONE value (it is not a list)', () => {
		expect(decodeFilterValue('Smith%2C John')).toBe('Smith, John');
	});

	it('is case-insensitive for the escape sequences and decodes each of them once', () => {
		expect(decodeFilterValue('a%2cb')).toBe('a,b');
		// "%252C" is an escaped percent sign followed by "2C": it must NOT become a comma.
		expect(decodeFilterValue('%252C')).toBe('%2C');
	});

	it('reads values written before the escaping existed unchanged', () => {
		expect(decodeFilterValue('GET')).toBe('GET');
		expect(decodeFilterValue('2xx,4xx')).toStrictEqual(['2xx', '4xx']);
		expect(decodeFilterValue('100% done')).toBe('100% done');
	});

	it('an empty value stays an empty string, not an empty list', () => {
		expect(decodeFilterValue('')).toBe('');
	});
});

describe('round trip', () => {
	it.each([
		['plain', 'failed'],
		['a comma', 'Smith, John'],
		['a percent', '50%'],
		['an encoded-looking text', '%2C'],
		['the escape of a percent', '%252C'],
		['spaces and unicode', 'été  ☃'],
	])('a single value with %s comes back identical', (_label, value) => {
		expect(decodeFilterValue(encodeFilterValue(value))).toBe(value);
	});

	it('a lone comma value is escaped, so it reads back as that character and not as an empty list', () => {
		expect(decodeFilterValue(encodeFilterValue(','))).toBe(',');
	});

	it.each([
		[['failed', 'done']],
		[['a,b', 'c']],
		[['%', ',']],
		[['x%2Cy', 'z']],
	])('a list of at least two items %j comes back identical', list => {
		expect(decodeFilterValue(encodeFilterValue(list))).toStrictEqual(list);
	});

	it('a duplicate in a list is kept as written (the codec does not deduplicate)', () => {
		expect(decodeFilterValue(encodeFilterValue(['a', 'a', 'b']))).toStrictEqual(['a', 'a', 'b']);
	});
});
