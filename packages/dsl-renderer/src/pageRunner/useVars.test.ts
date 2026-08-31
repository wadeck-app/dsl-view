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
