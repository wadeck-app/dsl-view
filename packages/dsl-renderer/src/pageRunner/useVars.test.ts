import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useVars } from './useVars.js';

describe('useVars', () => {
	it('returns empty vars when called with no arguments', () => {
		const { result } = renderHook(() => useVars());
		expect(result.current.vars).toEqual({});
	});

	it('returns initial values when provided', () => {
		const { result } = renderHook(() => useVars({ count: 0, name: 'Alice' }));
		expect(result.current.vars).toEqual({ count: 0, name: 'Alice' });
	});

	it('setVar updates an existing key', () => {
		const { result } = renderHook(() => useVars({ count: 0 }));
		act(() => {
			result.current.setVar('count', 42);
		});
		expect(result.current.vars['count']).toBe(42);
	});

	it('setVar adds a new key', () => {
		const { result } = renderHook(() => useVars());
		act(() => {
			result.current.setVar('newKey', 'hello');
		});
		expect(result.current.vars['newKey']).toBe('hello');
	});

	it('setVar preserves other keys when updating one', () => {
		const { result } = renderHook(() => useVars({ count: 0, name: 'Alice' }));
		act(() => {
			result.current.setVar('count', 99);
		});
		expect(result.current.vars['name']).toBe('Alice');
		expect(result.current.vars['count']).toBe(99);
	});

	it('setVar(key, undefined) keeps the key, with an undefined value', () => {
		const { result } = renderHook(() => useVars({ count: 1 }));
		act(() => {
			result.current.setVar('count', undefined);
		});
		// toStrictEqual: toEqual would not tell a stored undefined from a removed key.
		expect(result.current.vars).toStrictEqual({ count: undefined });
	});

	it('does not mutate the initial object it was given', () => {
		const initial = { count: 0 };
		const { result } = renderHook(() => useVars(initial));
		act(() => {
			result.current.setVar('count', 5);
		});
		expect(initial).toStrictEqual({ count: 0 });
	});

	it('reads the initial vars only once, at mount: a new default on a re-render does not reset anything', () => {
		// This is why GenericPageRunner remounts the runner when the page document changes (pageKey):
		// the vars of a new page must come from a fresh mount, never from a re-render.
		const { result, rerender } = renderHook(({ initial }) => useVars(initial), { initialProps: { initial: { a: 1 } as Record<string, unknown> } });
		act(() => {
			result.current.setVar('a', 2);
		});
		rerender({ initial: { a: 100, b: 200 } });
		expect(result.current.vars).toStrictEqual({ a: 2 });
	});

	it('setVar is referentially stable across renders', () => {
		const { result, rerender } = renderHook(() => useVars({ count: 0 }));
		const firstRef = result.current.setVar;
		act(() => {
			result.current.setVar('count', 1);
		});
		rerender();
		expect(result.current.setVar).toBe(firstRef);
	});
});
