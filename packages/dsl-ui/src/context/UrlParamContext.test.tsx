import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UrlParamContext, useOptionalUrlParam, useUrlParam } from './UrlParamContext.js';
import type { UrlParamService } from './UrlParamContext.js';

function service(params: Record<string, string> = {}) {
	const set = vi.fn<UrlParamService['set']>();
	return { get: (key: string) => params[key] ?? null, set };
}

function withService(svc: UrlParamService) {
	return ({ children }: { children: React.ReactNode }) => <UrlParamContext.Provider value={svc}>{children}</UrlParamContext.Provider>;
}

describe('useUrlParam', () => {
	it('reads the param and writes it as a soft (replace) update with no reset keys', () => {
		const svc = service({ q: 'abc' });
		const { result } = renderHook(() => useUrlParam('q'), { wrapper: withService(svc) });
		expect(result.current[0]).toBe('abc');
		result.current[1]('next');
		expect(svc.set).toHaveBeenCalledExactlyOnceWith('q', 'next', { replace: true });
	});

	it('returns null for an absent param', () => {
		const { result } = renderHook(() => useUrlParam('q'), { wrapper: withService(service()) });
		expect(result.current[0]).toBeNull();
	});

	it('throws a named error without a UrlParamContext provider', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => renderHook(() => useUrlParam('q'))).toThrow('useUrlParam requires UrlParamContext');
		spy.mockRestore();
	});
});

describe('useOptionalUrlParam', () => {
	it('without a key is an inert [null, no-op] that never touches the service', () => {
		const svc = service({ q: 'abc' });
		const { result } = renderHook(() => useOptionalUrlParam(undefined), { wrapper: withService(svc) });
		expect(result.current[0]).toBeNull();
		result.current[1]('x');
		expect(svc.set).not.toHaveBeenCalled();
	});

	it('without a key works even outside any provider', () => {
		const { result } = renderHook(() => useOptionalUrlParam(undefined));
		expect(result.current[0]).toBeNull();
	});

	it('with a key but no provider throws an error naming the key and the fix', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => renderHook(() => useOptionalUrlParam('page'))).toThrow('useOptionalUrlParam("page") requires UrlParamContext (wrap the app in RouterProvider)');
		spy.mockRestore();
	});

	it('keeps the original call shape when no reset is asked (hosts see no new `remove` key)', () => {
		const svc = service({ page: '2' });
		const { result } = renderHook(() => useOptionalUrlParam('page'), { wrapper: withService(svc) });
		expect(result.current[0]).toBe('2');
		result.current[1]('3');
		expect(svc.set.mock.calls[0]).toEqual(['page', '3', { replace: true }]);
		expect(svc.set.mock.calls[0]![2]).not.toHaveProperty('remove');
	});

	it('an empty resetUrlParams list behaves like none', () => {
		const svc = service();
		const { result } = renderHook(() => useOptionalUrlParam('q', { resetUrlParams: [] }), { wrapper: withService(svc) });
		result.current[1]('x');
		expect(svc.set.mock.calls[0]![2]).toEqual({ replace: true });
	});

	it('passes every reset key as `remove` in the same set call', () => {
		const svc = service();
		const { result } = renderHook(() => useOptionalUrlParam('q', { resetUrlParams: ['page', 'cursor'] }), { wrapper: withService(svc) });
		result.current[1]('x');
		expect(svc.set).toHaveBeenCalledExactlyOnceWith('q', 'x', { replace: true, remove: ['page', 'cursor'] });
	});

	it('does not rebuild the setter when a fresh array with the same keys is passed each render', () => {
		const svc = service();
		const { result, rerender } = renderHook(() => useOptionalUrlParam('q', { resetUrlParams: ['page'] }), { wrapper: withService(svc) });
		const first = result.current;
		rerender();
		expect(result.current).toBe(first);
	});

	it('rebuilds the setter when the reset keys change', () => {
		const svc = service();
		const { result, rerender } = renderHook(({ keys }: { keys: string[] }) => useOptionalUrlParam('q', { resetUrlParams: keys }), {
			wrapper: withService(svc),
			initialProps: { keys: ['page'] },
		});
		rerender({ keys: ['cursor'] });
		result.current[1]('x');
		expect(svc.set.mock.calls[0]![2]).toEqual({ replace: true, remove: ['cursor'] });
	});

	it.each([
		['not an array', 'page' as unknown as string[], /must be an array of non-empty URL param names, got "page"/],
		['an empty name', [''], /must be an array of non-empty URL param names/],
		['a non-string name', [1 as unknown as string], /must be an array of non-empty URL param names/],
	])('rejects resetUrlParams that is %s', (_label, keys, message) => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => renderHook(() => useOptionalUrlParam('q', { resetUrlParams: keys }), { wrapper: withService(service()) })).toThrow(message);
		spy.mockRestore();
	});

	it('rejects resetUrlParams without a urlParam key, naming the keys', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => renderHook(() => useOptionalUrlParam(undefined, { resetUrlParams: ['page', 'cursor'] }), { wrapper: withService(service()) })).toThrow(
			'resetUrlParams (page, cursor) requires "urlParam"'
		);
		spy.mockRestore();
	});

	it('accepts an empty resetUrlParams without a urlParam key (nothing to reset)', () => {
		const { result } = renderHook(() => useOptionalUrlParam(undefined, { resetUrlParams: [] }), { wrapper: withService(service()) });
		expect(result.current[0]).toBeNull();
	});

	it("rejects resetUrlParams containing the control's own key", () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => renderHook(() => useOptionalUrlParam('q', { resetUrlParams: ['page', 'q'] }), { wrapper: withService(service()) })).toThrow(
			`resetUrlParams must not contain the control's own urlParam "q"`
		);
		spy.mockRestore();
	});
});
