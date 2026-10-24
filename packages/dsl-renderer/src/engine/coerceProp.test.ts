import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { coerceDate, coerceProp, coerceStringList, resetCoercionWarnings } from './coerceProp.js';

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	resetCoercionWarnings();
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	resetCoercionWarnings();
});

describe('coerceProp, string props', () => {
	it('keeps a string, including the empty one, by reference and quietly', () => {
		expect(coerceProp('text', 'Link.href', 'string', true)).toBe('text');
		expect(coerceProp('', 'Link.href', 'string', true)).toBe('');
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([['zero', 0, '0'], ['a number', 42, '42'], ['a negative number', -1.5, '-1.5']])('turns %s into its text without a warning', (_label, value, text) => {
		expect(coerceProp(value, 'Link.href', 'string', false)).toBe(text);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([['undefined', undefined], ['null', null]])('gives a missing REQUIRED string (%s) as \'\' and leaves an optional one as it was, quietly', (_label, value) => {
		expect(coerceProp(value, 'Breadcrumb.currentPath', 'string', true)).toBe('');
		expect(coerceProp(value, 'Breadcrumb.currentPath', 'string', false)).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([
		['false', false, 'boolean'],
		['true', true, 'boolean'],
		['a map', {}, 'a map'],
		['a list', ['a'], 'a list'],
		['a function', () => 'x', 'function'],
	])('ignores %s with one warning and gives \'\' (required) or undefined (optional)', (_label, value, received) => {
		expect(coerceProp(value, 'Link.href', 'string', true)).toBe('');
		expect(coerceProp(value, 'Link.href', 'string', false)).toBeUndefined();
		expect(warn).toHaveBeenCalledExactlyOnceWith(`[Link.href] expected a string but received ${received}; the value is ignored.`);
	});
});

describe('coerceProp, primitive props', () => {
	it.each([
		['a string', 'text'],
		['an empty string', ''],
		['zero', 0],
		['a number', 42],
		['false', false],
		['true', true],
		['undefined', undefined],
	])('keeps %s untouched and quiet', (_label, value) => {
		expect(coerceProp(value, 'Badge.label', 'primitive', true)).toBe(value);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([
		['a map', {}, 'a map'],
		['a map with content', { nested: { wrong: 1 } }, 'a map'],
		['a list', [], 'a list'],
		['a list with items', ['a'], 'a list'],
		['a function', () => 1, 'function'],
	])('ignores %s and names the received kind once', (_label, value, received) => {
		expect(coerceProp(value, 'Badge.label', 'primitive', false)).toBeUndefined();
		expect(warn).toHaveBeenCalledExactlyOnceWith(`[Badge.label] expected a string, number or boolean but received ${received}; the value is ignored.`);
	});
});

describe('coerceProp, array props', () => {
	it('returns a list as it is (same reference)', () => {
		const list = [1, 2];
		expect(coerceProp(list, 'FieldSelect.options', 'array', true)).toBe(list);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([['undefined', undefined], ['null', null]])('turns a missing REQUIRED list (%s) into [] without a warning (a source still loading)', (_label, value) => {
		expect(coerceProp(value, 'FieldSelect.options', 'array', true)).toStrictEqual([]);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([['undefined', undefined], ['null', null]])('leaves a missing OPTIONAL list (%s) absent', (_label, value) => {
		expect(coerceProp(value, 'DataTable.columns', 'array', false)).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([
		['a string', 'text', 'string'],
		['a number', 42, 'number'],
		['false', false, 'boolean'],
		['a map', { a: 1 }, 'a map'],
	])('ignores %s where a list is expected, warns once, and gives [] (required) or undefined (optional)', (_label, value, received) => {
		expect(coerceProp(value, 'Tabs.tabs', 'array', true)).toStrictEqual([]);
		expect(coerceProp(value, 'Tabs.tabs', 'array', false)).toBeUndefined();
		expect(warn).toHaveBeenCalledExactlyOnceWith(`[Tabs.tabs] expected a list but received ${received}; the value is ignored.`);
	});
});

describe('coerceProp, function props', () => {
	it('keeps a function and leaves undefined and null absent', () => {
		const fn = () => 1;
		expect(coerceProp(fn, 'DatePicker.isDateDisabled', 'function', false)).toBe(fn);
		expect(coerceProp(undefined, 'DatePicker.isDateDisabled', 'function', false)).toBeUndefined();
		expect(coerceProp(null, 'DatePicker.isDateDisabled', 'function', false)).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([['text', 'text'], ['a number', 3], ['a map', {}], ['a list', []]])('ignores %s and warns', (_label, value) => {
		expect(coerceProp(value, 'DatePicker.isDateDisabled', 'function', false)).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toMatch(/^\[DatePicker\.isDateDisabled\] expected a function but received /);
	});
});

describe('coerceProp, object props', () => {
	it('keeps a map by reference, and leaves a missing one absent', () => {
		const map = { a: 1 };
		expect(coerceProp(map, 'ThemeScope.tokens', 'object', false)).toBe(map);
		expect(coerceProp({}, 'ThemeScope.tokens', 'object', false)).toStrictEqual({});
		expect(coerceProp(undefined, 'ThemeScope.tokens', 'object', true)).toBeUndefined();
		expect(coerceProp(null, 'ThemeScope.tokens', 'object', false)).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([
		['a string', 'text', 'string'],
		['an empty string', '', 'string'],
		['zero', 0, 'number'],
		['false', false, 'boolean'],
		['a list', [], 'a list'],
		['a function', () => 1, 'function'],
	])('ignores %s where a map is expected and warns once', (_label, value, received) => {
		expect(coerceProp(value, 'ThemeScope.tokens', 'object', false)).toBeUndefined();
		expect(warn).toHaveBeenCalledExactlyOnceWith(`[ThemeScope.tokens] expected a map but received ${received}; the value is ignored.`);
	});
});

// A prop whose type does not accept null must never receive one (a component written for an absent prop does
// `value.startsWith(...)` after an `!== undefined` check); a prop typed `T | null` keeps it.
describe('coerceProp, null', () => {
	it.each([['string', 'a'], ['primitive', 3], ['array', [1]], ['function', () => 1]] as const)('is absent for a non-nullable %s prop, present values are untouched', (kind, valid) => {
		expect(coerceProp(null, 'X.p', kind, false)).toBeUndefined();
		expect(coerceProp(valid, 'X.p', kind, false)).toBe(valid);
	});

	it.each([['string'], ['primitive'], ['array'], ['function']] as const)('is kept for a nullable %s prop', (kind) => {
		expect(coerceProp(null, 'X.p', kind, true, true)).toBeNull();
		expect(warn).not.toHaveBeenCalled();
	});

	it('still turns a required missing value into the empty default when it was null', () => {
		expect(coerceProp(null, 'X.s', 'string', true)).toBe('');
		expect(coerceProp(null, 'X.a', 'array', true)).toStrictEqual([]);
	});
});

describe('coerceProp, warning policy', () => {
	it('warns once per prop and kind of received value, not once per render', () => {
		for (let i = 0; i < 5; i++) coerceProp({}, 'Badge.label', 'primitive', false);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('warns again for another prop or another received kind', () => {
		coerceProp({}, 'Badge.label', 'primitive', false);
		coerceProp({}, 'Badge.href', 'primitive', false);
		coerceProp([], 'Badge.label', 'primitive', false);
		expect(warn).toHaveBeenCalledTimes(3);
	});

	it('forgets earlier warnings after resetCoercionWarnings', () => {
		coerceProp({}, 'Badge.label', 'primitive', false);
		resetCoercionWarnings();
		coerceProp({}, 'Badge.label', 'primitive', false);
		expect(warn).toHaveBeenCalledTimes(2);
	});
});

describe('coerceStringList (the value of a bound list field)', () => {
	it('returns the strings of a list, in order, quietly', () => {
		expect(coerceStringList(['a', '', 'b'], 'FieldTags.value')).toStrictEqual(['a', '', 'b']);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([['undefined', undefined], ['null', null]])('gives [] for a missing value (%s) without a warning (a form that has not loaded)', (_label, value) => {
		expect(coerceStringList(value, 'FieldTags.value')).toStrictEqual([]);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([['text', 'a,b', 'string'], ['a number', 3, 'number'], ['a map', { a: 1 }, 'a map']])('gives [] for %s where a list is expected and warns', (_label, value, received) => {
		expect(coerceStringList(value, 'FieldTags.value')).toStrictEqual([]);
		expect(warn).toHaveBeenCalledExactlyOnceWith(`[FieldTags.value] expected a list but received ${received}; the value is ignored.`);
	});

	it('turns numbers and booleans into text and leaves out other entries with one warning', () => {
		expect(coerceStringList(['a', 2, false, {}, ['x'], null], 'FieldTags.value')).toStrictEqual(['a', '2', 'false']);
		// {} (a map), ['x'] (a list) and null are three kinds: one warning each.
		expect(warn).toHaveBeenCalledTimes(3);
		expect(warn).toHaveBeenCalledWith('[FieldTags.value] expected a list of text entries but received a map; the value is ignored.');
	});
});

describe('coerceDate (the value of a bound date field)', () => {
	it('returns a valid Date as it is', () => {
		const date = new Date(2024, 0, 15);
		expect(coerceDate(date, 'DatePicker.value')).toBe(date);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([['ISO text', '2024-01-15T10:00:00.000Z'], ['a timestamp', 1705312800000]])('parses %s', (_label, value) => {
		expect(coerceDate(value, 'DatePicker.value')).toStrictEqual(new Date(value));
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([['undefined', undefined], ['null', null], ['empty text', ''], ['false', false]])('is "no date" for %s, quietly', (_label, value) => {
		expect(coerceDate(value, 'DatePicker.value')).toBeNull();
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([
		['text that is no date', 'tomorrow-ish', 'string'],
		['NaN', NaN, 'number'],
		['an invalid Date', new Date('nope'), 'a map'],
		['a map', {}, 'a map'],
		['a list', [], 'a list'],
		['true', true, 'boolean'],
	])('is "no date" for %s and warns once', (_label, value, received) => {
		expect(coerceDate(value, 'DatePicker.value')).toBeNull();
		expect(warn).toHaveBeenCalledExactlyOnceWith(`[DatePicker.value] expected a date (ISO text or a timestamp) but received ${received}; the value is ignored.`);
	});
});
