import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useOutputs } from './useOutputs.js';

describe('useOutputs', () => {
	it('starts with an empty outputs object', () => {
		const { result } = renderHook(() => useOutputs());
		expect(result.current.outputs).toEqual({});
	});

	it('publishOutput creates a namespace with the output value', () => {
		const { result } = renderHook(() => useOutputs());
		act(() => {
			result.current.publishOutput('nav', 'selectedFile', { id: 1 });
		});
		expect(result.current.outputs['nav']?.['selectedFile']).toEqual({ id: 1 });
	});

	it('publishOutput merges multiple outputs within the same namespace', () => {
		const { result } = renderHook(() => useOutputs());
		act(() => {
			result.current.publishOutput('nav', 'selectedFile', { id: 1 });
			result.current.publishOutput('nav', 'hoveredFile', { id: 2 });
		});
		expect(result.current.outputs['nav']?.['selectedFile']).toEqual({ id: 1 });
		expect(result.current.outputs['nav']?.['hoveredFile']).toEqual({ id: 2 });
	});

	it('publishOutput from different ids are independent namespaces', () => {
		const { result } = renderHook(() => useOutputs());
		act(() => {
			result.current.publishOutput('a', 'value', 'fromA');
			result.current.publishOutput('b', 'value', 'fromB');
		});
		expect(result.current.outputs['a']?.['value']).toBe('fromA');
		expect(result.current.outputs['b']?.['value']).toBe('fromB');
	});

	it('undefined value is stored as a tick object', () => {
		const { result } = renderHook(() => useOutputs());
		act(() => {
			result.current.publishOutput('btn', 'onClick', undefined);
		});
		const stored = result.current.outputs['btn']?.['onClick'] as { $tick: number } | undefined;
		expect(stored).toBeDefined();
		expect(typeof stored?.$tick).toBe('number');
	});

	it('two successive undefined publishes produce different tick values', () => {
		const { result } = renderHook(() => useOutputs());
		act(() => {
			result.current.publishOutput('btn', 'onClick', undefined);
		});
		const first = (result.current.outputs['btn']?.['onClick'] as { $tick: number }).$tick;

		act(() => {
			result.current.publishOutput('btn', 'onClick', undefined);
		});
		const second = (result.current.outputs['btn']?.['onClick'] as { $tick: number }).$tick;

		expect(second).toBeGreaterThan(first);
	});

	it('publishOutput is referentially stable across renders', () => {
		const { result, rerender } = renderHook(() => useOutputs());
		const firstRef = result.current.publishOutput;
		act(() => {
			result.current.publishOutput('x', 'y', 'z');
		});
		rerender();
		expect(result.current.publishOutput).toBe(firstRef);
	});
});
