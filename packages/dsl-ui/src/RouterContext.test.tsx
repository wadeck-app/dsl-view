import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { RouterService } from './RouterContext.js';
import { RouterContext, useRouter } from './RouterContext.js';

describe('useRouter', () => {
	it('returns the service the provider supplies, with both operations working', () => {
		const service: RouterService = { navigate: vi.fn(), back: vi.fn() };
		const wrapper = ({ children }: { children: React.ReactNode }) => <RouterContext.Provider value={service}>{children}</RouterContext.Provider>;

		const { result } = renderHook(() => useRouter(), { wrapper });
		result.current.navigate('/x');
		result.current.back();

		expect(result.current).toBe(service);
		expect(service.navigate).toHaveBeenCalledWith('/x');
		expect(service.back).toHaveBeenCalledTimes(1);
	});

	it('throws a message that names the fix when there is no provider', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);

		expect(() => renderHook(() => useRouter())).toThrow('useRouter() requires RouterContext -- wrap your app in <RouterProvider>');
	});
});
