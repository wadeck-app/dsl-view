import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSourceLoader } from './useSourceLoader.js';
import type { RawSourceSpec } from './pageRunnerUtils.js';

// Module-level so the reference is stable across renders.
const SRC_CACHED: Record<string, RawSourceSpec> = { books: { url: 'GET /api/books', cache: '10m' } };
const SRC_PLAIN: Record<string, RawSourceSpec> = { books: 'GET /api/books' };
const SRC_CHAIN: Record<string, RawSourceSpec> = { a: 'GET /api/a', b: { url: 'GET /api/b', params: { x: '$source.a.id' } } };
const SRC_QUERY: Record<string, RawSourceSpec> = {
	items: { url: 'GET /api/items', params: { q: '$urlParam.q', page: '$urlParam.page', empty: '$urlParam.none' } },
};
const SRC_QUERY_AND_PATH: Record<string, RawSourceSpec> = {
	items: { url: 'GET /api/w/{wid}/items', params: { wid: '$urlParam.wid', q: '$urlParam.q' } },
};
const SRC_POLL: Record<string, RawSourceSpec> = { books: { url: 'GET /api/books', poll: '1s' } };
const SRC_POLL_WHEN: Record<string, RawSourceSpec> = { books: { url: 'GET /api/books', poll: '1s', pollWhen: '$urlParam.live' } };
const SRC_PARAM: Record<string, RawSourceSpec> = { books: { url: 'GET /api/books', params: { q: '$urlParam.q' } } };

const searchParamsCache = new Map<string, URLSearchParams>();
function sp(query = ''): URLSearchParams {
	let found = searchParamsCache.get(query);
	if (!found) {
		found = new URLSearchParams(query);
		searchParamsCache.set(query, found);
	}
	return found;
}

function deferred<T = unknown>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>(r => {
		resolve = r;
	});
	return { promise, resolve };
}

afterEach(() => {
	vi.useRealTimers();
});

describe('useSourceLoader: flags', () => {
	it('is not refreshing before, during and after a plain first load', async () => {
		const { result } = renderHook(() => useSourceLoader({ $sources: SRC_PLAIN, searchParams: sp(), fetcher: vi.fn().mockResolvedValue([1]) }));
		expect(result.current.isRefreshing).toBe(false);
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.isRefreshing).toBe(false);
	});

	it('initialLoading ends with the first load and does not come back on a later (non-polled) reload', async () => {
		const first = deferred();
		const second = deferred();
		const fetcher = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const { result } = renderHook(() => useSourceLoader({ $sources: SRC_PLAIN, searchParams: sp(), fetcher }));
		expect(result.current.initialLoading).toBe(true);
		await act(async () => first.resolve([1]));
		await waitFor(() => expect(result.current.initialLoading).toBe(false));

		act(() => {
			void result.current.loadSources(false, {}, undefined, true);
		});
		await waitFor(() => expect(result.current.loading).toBe(true));
		// A reload keeps the previous rows on screen: it is "loading", but not the very first load.
		expect(result.current.initialLoading).toBe(false);
		await act(async () => second.resolve([2]));
		await waitFor(() => expect(result.current.loading).toBe(false));
	});

	it('an empty $sources page is never loading and never "initially loading"', () => {
		const { result } = renderHook(() => useSourceLoader({ $sources: undefined, searchParams: sp(), fetcher: vi.fn() }));
		expect(result.current.loading).toBe(false);
		expect(result.current.initialLoading).toBe(false);
	});
});

describe('useSourceLoader: unmount', () => {
	it('does not start the next dependency level once unmounted', async () => {
		const a = deferred();
		const fetcher = vi.fn((url: string) => (url === 'GET /api/a' ? a.promise : Promise.resolve('b')));
		const { unmount } = renderHook(() => useSourceLoader({ $sources: SRC_CHAIN, searchParams: sp(), fetcher: fetcher as never }));
		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('GET /api/a', undefined, undefined, undefined));
		unmount();
		await act(async () => a.resolve({ id: '9' }));
		await Promise.resolve();
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
});

describe('useSourceLoader: request URL', () => {
	it('appends the non-empty params as an encoded query string, in order', async () => {
		const fetcher = vi.fn().mockResolvedValue([]);
		renderHook(() => useSourceLoader({ $sources: SRC_QUERY, searchParams: sp('q=a b&page=2'), fetcher }));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(fetcher).toHaveBeenCalledWith('GET /api/items?q=a%20b&page=2', undefined, undefined, undefined);
	});

	it('uses a param as a path placeholder OR as a query param, never both', async () => {
		const fetcher = vi.fn().mockResolvedValue([]);
		renderHook(() => useSourceLoader({ $sources: SRC_QUERY_AND_PATH, searchParams: sp('wid=W1&q=x'), fetcher }));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(fetcher).toHaveBeenCalledWith('GET /api/w/W1/items?q=x', undefined, undefined, undefined);
	});

	it('passes the auth header from getToken to the fetcher', async () => {
		const fetcher = vi.fn().mockResolvedValue([]);
		renderHook(() => useSourceLoader({ $sources: SRC_PLAIN, searchParams: sp(), fetcher, getToken: async () => 'tok' }));
		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('GET /api/books', undefined, undefined, { Authorization: 'Bearer tok' }));
	});
});

describe('useSourceLoader: cache', () => {
	async function cachedHook() {
		const fetcher = vi.fn().mockResolvedValue([1]);
		const hook = renderHook(() => useSourceLoader({ $sources: SRC_CACHED, searchParams: sp(), fetcher }));
		await waitFor(() => expect(hook.result.current.loading).toBe(false));
		expect(fetcher).toHaveBeenCalledTimes(1);
		return { ...hook, fetcher };
	}

	it('serves a second plain load from the cache', async () => {
		const { result, fetcher } = await cachedHook();
		await act(async () => result.current.loadSources(false, {}));
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('bypassCache refetches even though a fresh entry exists', async () => {
		const { result, fetcher } = await cachedHook();
		await act(async () => result.current.loadSources(false, {}, undefined, true));
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('a polled load never reads the cache', async () => {
		const { result, fetcher } = await cachedHook();
		await act(async () => result.current.loadSources(true, {}));
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('a polled load does not populate the cache either', async () => {
		const fetcher = vi.fn().mockResolvedValue([1]);
		const { result } = renderHook(() => useSourceLoader({ $sources: SRC_CACHED, searchParams: sp(), fetcher }));
		await waitFor(() => expect(result.current.loading).toBe(false));
		act(() => result.current.invalidateSourceCache('books'));
		await act(async () => result.current.loadSources(true, {}));
		expect(fetcher).toHaveBeenCalledTimes(2);
		// The poll answered but must not have been stored: the next plain load fetches again.
		await act(async () => result.current.loadSources(false, {}));
		expect(fetcher).toHaveBeenCalledTimes(3);
	});
});

describe('useSourceLoader: polling', () => {
	it('flags a poll tick as refreshing (not loading) and bypasses the cache', async () => {
		vi.useFakeTimers();
		const tick = deferred();
		const fetcher = vi.fn().mockResolvedValueOnce([1]).mockReturnValueOnce(tick.promise);
		const cached: Record<string, RawSourceSpec> = { books: { url: 'GET /api/books', poll: '1s', cache: '10m' } };
		const { result } = renderHook(() => useSourceLoader({ $sources: cached, searchParams: sp(), fetcher }));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});
		expect(result.current.loading).toBe(false);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000);
		});
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(result.current.isRefreshing).toBe(true);
		expect(result.current.loading).toBe(false);
		await act(async () => tick.resolve([2]));
		expect(result.current.isRefreshing).toBe(false);
		expect(result.current.sourceData).toEqual({ books: [2] });
	});

	it.each(['0', 'false', ''])('does not poll while pollWhen "$urlParam.live" is "%s"', async live => {
		vi.useFakeTimers();
		const fetcher = vi.fn().mockResolvedValue([1]);
		renderHook(() => useSourceLoader({ $sources: SRC_POLL_WHEN, searchParams: sp(live === '' ? '' : `live=${live}`), fetcher }));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(3500);
		});
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('polls while pollWhen is truthy, once per interval', async () => {
		vi.useFakeTimers();
		const fetcher = vi.fn().mockResolvedValue([1]);
		renderHook(() => useSourceLoader({ $sources: SRC_POLL_WHEN, searchParams: sp('live=1'), fetcher }));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2500);
		});
		expect(fetcher).toHaveBeenCalledTimes(3);
	});

	it('stops polling on unmount', async () => {
		vi.useFakeTimers();
		const fetcher = vi.fn().mockResolvedValue([1]);
		const { unmount } = renderHook(() => useSourceLoader({ $sources: SRC_POLL, searchParams: sp(), fetcher }));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000);
		});
		const callsBefore = fetcher.mock.calls.length;
		unmount();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5000);
		});
		expect(fetcher).toHaveBeenCalledTimes(callsBefore);
	});

	it('logs an unparseable poll interval and keeps the page working', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const bad: Record<string, RawSourceSpec> = { books: { url: 'GET /api/books', poll: 'often' } };
		const { result } = renderHook(() => useSourceLoader({ $sources: bad, searchParams: sp(), fetcher: vi.fn().mockResolvedValue([1]) }));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(error).toHaveBeenCalledWith('Unparseable poll interval: "often". Expected format like "10s" or "1m".');
		error.mockRestore();
	});
});

describe('useSourceLoader: url-param refetch', () => {
	it('refetches the url-param dependent sources as a background refresh, not as a loading page', async () => {
		const second = deferred();
		const fetcher = vi.fn().mockResolvedValueOnce([1]).mockReturnValueOnce(second.promise);
		const { result, rerender } = renderHook(({ q }) => useSourceLoader({ $sources: SRC_PARAM, searchParams: sp(`q=${q}`), fetcher }), {
			initialProps: { q: 'a' },
		});
		await waitFor(() => expect(result.current.loading).toBe(false));
		rerender({ q: 'b' });
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
		expect(fetcher).toHaveBeenLastCalledWith('GET /api/books?q=b', undefined, undefined, undefined);
		expect(result.current.isRefreshing).toBe(true);
		expect(result.current.loading).toBe(false);
		await act(async () => second.resolve([2]));
		expect(result.current.isRefreshing).toBe(false);
		expect(result.current.sourceData).toEqual({ books: [2] });
	});

	it('does not refetch on the first render, nor when no source depends on a url param', async () => {
		const fetcher = vi.fn().mockResolvedValue([1]);
		const { result, rerender } = renderHook(({ q }) => useSourceLoader({ $sources: SRC_PLAIN, searchParams: sp(`q=${q}`), fetcher }), {
			initialProps: { q: 'a' },
		});
		await waitFor(() => expect(result.current.loading).toBe(false));
		rerender({ q: 'b' });
		await Promise.resolve();
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
});
