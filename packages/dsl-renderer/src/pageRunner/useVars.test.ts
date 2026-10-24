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

describe('useVars: a variable declared with an expression is seeded once', () => {
	const declared = { payload: '$sources.event.exampleText', mode: 'edit', count: 0 };
	const sources: Record<string, unknown> = {};
	const resolve = (expression: string): unknown => (expression === '$sources.event.exampleText' ? sources['text'] : undefined);

	it('starts without the expression variable: the expression text is never the value', () => {
		delete sources['text'];
		const { result } = renderHook(() => useVars(declared));
		// toStrictEqual: the key must be absent, not a stored undefined or the literal "$sources..." string.
		expect(result.current.vars).toStrictEqual({ mode: 'edit', count: 0 });
	});

	it('seeds the variable the first time the expression resolves, and keeps the literal ones', () => {
		delete sources['text'];
		const { result } = renderHook(() => useVars(declared));
		act(() => result.current.seedFrom(resolve));
		expect(result.current.vars).toStrictEqual({ mode: 'edit', count: 0 });

		sources['text'] = '{"a":1}';
		act(() => result.current.seedFrom(resolve));
		expect(result.current.vars).toStrictEqual({ mode: 'edit', count: 0, payload: '{"a":1}' });
	});

	it('seeds a falsy value (empty string, 0, false, null): only undefined means "not available yet"', () => {
		for (const falsy of ['', 0, false, null]) {
			sources['text'] = falsy;
			const { result } = renderHook(() => useVars({ payload: '$sources.event.exampleText' }));
			act(() => result.current.seedFrom(resolve));
			expect(result.current.vars).toStrictEqual({ payload: falsy });
		}
	});

	it('never overwrites a value the user set after the seed: a poll that re-sends the source keeps the edit', () => {
		sources['text'] = 'first';
		const { result } = renderHook(() => useVars(declared));
		act(() => result.current.seedFrom(resolve));
		act(() => result.current.setVar('payload', 'edited'));

		sources['text'] = 'second (from the poll)';
		act(() => result.current.seedFrom(resolve));
		expect(result.current.vars['payload']).toBe('edited');
	});

	it('never overwrites an edit made BEFORE the source arrived', () => {
		delete sources['text'];
		const { result } = renderHook(() => useVars(declared));
		act(() => result.current.setVar('payload', 'typed early'));

		sources['text'] = 'late source value';
		act(() => result.current.seedFrom(resolve));
		expect(result.current.vars['payload']).toBe('typed early');
	});

	it('seeds only once: a source value that changes later does not re-seed an untouched variable', () => {
		sources['text'] = 'first';
		const { result } = renderHook(() => useVars(declared));
		act(() => result.current.seedFrom(resolve));

		sources['text'] = 'second';
		act(() => result.current.seedFrom(resolve));
		expect(result.current.vars['payload']).toBe('first');
	});

	it('seedFrom is referentially stable, and a seed call with nothing to seed renders nothing new', () => {
		sources['text'] = 'v';
		let renders = 0;
		const { result } = renderHook(() => {
			renders++;
			return useVars(declared);
		});
		const first = result.current.seedFrom;
		act(() => result.current.seedFrom(resolve));
		const afterSeed = renders;
		act(() => result.current.seedFrom(resolve));
		expect(result.current.seedFrom).toBe(first);
		expect(renders).toBe(afterSeed);
	});
});
