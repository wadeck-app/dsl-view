import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePersistentChoice } from './usePersistentChoice.js';
import { usePersistentSet } from './usePersistentSet.js';

beforeEach(() => {
	localStorage.clear();
	window.history.pushState({}, '', '/');
});
afterEach(() => {
	vi.restoreAllMocks();
});

describe('usePersistentSet', () => {
	it('starts empty without a stored value', () => {
		const { result } = renderHook(() => usePersistentSet('ab.set'));
		expect([...result.current[0]]).toEqual([]);
	});

	it('restores a stored list of strings', () => {
		localStorage.setItem('ab.set', '["a","b"]');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { result } = renderHook(() => usePersistentSet('ab.set'));
		expect([...result.current[0]]).toEqual(['a', 'b']);
		expect(warn).not.toHaveBeenCalled();
	});

	it.each([
		['an array holding something else than strings', '["a", 1]'],
		['an array of numbers', '[1, 2]'],
		['an object', '{"a":1}'],
		['a string', '"a"'],
		['text that is not JSON', '{not json'],
	])('reports %s and starts empty', (_name, stored) => {
		localStorage.setItem('ab.set', stored);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { result } = renderHook(() => usePersistentSet('ab.set'));
		expect([...result.current[0]]).toEqual([]);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain('"ab.set"');
		expect(warn.mock.calls[0]![0]).toContain(stored);
	});

	it('toggles an id in and out, and keeps the set in the storage', () => {
		const { result } = renderHook(() => usePersistentSet('ab.set'));
		act(() => result.current[1]('a'));
		act(() => result.current[1]('b'));
		expect([...result.current[0]]).toEqual(['a', 'b']);
		expect(JSON.parse(localStorage.getItem('ab.set')!)).toEqual(['a', 'b']);

		act(() => result.current[1]('a'));
		expect([...result.current[0]]).toEqual(['b']);
		expect(JSON.parse(localStorage.getItem('ab.set')!)).toEqual(['b']);
	});
});

describe('usePersistentChoice instances sharing a key', () => {
	const useChoice = () => usePersistentChoice('ab.k', ['a', 'b', 'c'] as const, 'a', 'test');

	it('agree within one tab: a choice made through one is applied by the others', () => {
		const first = renderHook(useChoice);
		const second = renderHook(useChoice);
		act(() => first.result.current[1]('b'));
		expect(second.result.current[0]).toBe('b');
	});

	it('keep agreeing after one of them unmounted (the others stay registered)', () => {
		const first = renderHook(useChoice);
		const second = renderHook(useChoice);
		first.unmount();
		// A third instance joins after the first one left: it must still reach the second one.
		const third = renderHook(useChoice);
		act(() => third.result.current[1]('c'));
		expect(second.result.current[0]).toBe('c');
	});

	it('read the stored value of a key another instance already changed', () => {
		const first = renderHook(useChoice);
		act(() => first.result.current[1]('b'));
		const later = renderHook(useChoice);
		expect(later.result.current[0]).toBe('b');
	});

	it('do nothing, and store nothing, when switched off', () => {
		localStorage.setItem('ab.k', 'b');
		const { result } = renderHook(() => usePersistentChoice('ab.k', ['a', 'b', 'c'] as const, 'a', 'test', 'ab.k', false));
		expect(result.current[0]).toBe('a');
		act(() => result.current[1]('c'));
		expect(result.current[0]).toBe('a');
		expect(localStorage.getItem('ab.k')).toBe('b');
	});
});

describe('when switched off', () => {
	it('usePersistentSet reads nothing, reports nothing and stores nothing', () => {
		localStorage.setItem('ab.set', '{not json');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { result } = renderHook(() => usePersistentSet('ab.set', false));
		expect([...result.current[0]]).toEqual([]);
		act(() => result.current[1]('a'));
		expect([...result.current[0]]).toEqual([]);
		expect(localStorage.getItem('ab.set')).toBe('{not json');
		expect(warn).not.toHaveBeenCalled();
	});
});
