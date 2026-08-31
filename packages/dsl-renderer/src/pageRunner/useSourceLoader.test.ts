import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSourceLoader } from './useSourceLoader.js';
import type { RawSourceSpec } from './pageRunnerUtils.js';

// Stable $sources definitions - module-level consts so the object reference
// never changes between renders (a new object each render causes an infinite
// re-render loop via useMemo -> useCallback -> useEffect).
const SOURCES_BOOKS: Record<string, RawSourceSpec> = { books: 'GET /api/books/' };
const SOURCES_BOOKS_WITH_CACHE: Record<string, RawSourceSpec> = {
	books: { url: 'GET /api/books/', cache: '10s' },
};
// parsePollMs only accepts "Ns" / "Nm" format - "100ms" would throw at runtime.
// Use "1s" + real timers: waitFor uses setTimeout internally and breaks with fake timers.
const SOURCES_BOOKS_POLL_1S: Record<string, RawSourceSpec> = {
	books: { url: 'GET /api/books/', poll: '1s' },
};
const SOURCES_BOOKS_POLL_WHEN_1S: Record<string, RawSourceSpec> = {
	books: { url: 'GET /api/books/', poll: '1s', pollWhen: '$urlParam.live' },
};
const SOURCES_ITEM_ROUTE_PARAM: Record<string, RawSourceSpec> = {
	item: { url: 'GET /api/items/{id}', params: { id: '$route.itemId' } },
};
const SOURCES_LOGS_URL_PARAM: Record<string, RawSourceSpec> = {
	logs: { url: 'GET /api/logs/', params: { date: '$urlParam.date' } },
};
const SOURCES_LOGS_PATH_PARAM: Record<string, RawSourceSpec> = {
	logs: { url: 'GET /api/logs/{date}', params: { date: '$urlParam.date' } },
};
const SOURCES_FILES_PATH_MISSING: Record<string, RawSourceSpec> = {
	files: { url: 'GET /api/files/{id}', params: { id: '$urlParam.id' } },
};
const SOURCES_A_B: Record<string, RawSourceSpec> = {
	a: 'GET /api/a/',
	b: { url: 'GET /api/b/', params: { id: '$source.a.id' } },
};

// Build a deferred promise whose resolver is captured synchronously (the
// Promise executor runs synchronously, so `resolve` is assigned before
// renderHook fires any effects).
function deferred<T = unknown>(): { promise: Promise<T>; resolve: (v: T) => void } {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>(r => {
		resolve = r;
	});
	return { promise, resolve };
}

// ---------------------------------------------------------------------------
// Basic loading
// ---------------------------------------------------------------------------

describe('useSourceLoader', () => {
	describe('basic loading', () => {
		it('initial load fires fetcher and populates sourceData', async () => {
			const fetcher = vi.fn().mockResolvedValue([{ id: 1 }]);

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.sourceData['books']).toEqual([{ id: 1 }]);
			expect(fetcher).toHaveBeenCalledWith('GET /api/books/', undefined, undefined, undefined);
		});

		it('loading starts true, ends false', async () => {
			// Build the deferred promise BEFORE renderHook so resolve is always defined.
			const { promise, resolve } = deferred<unknown>();
			const fetcher = vi.fn().mockReturnValue(promise);

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);

			// loading is initialised to true by useState(sourceKeys.length > 0) -
			// checked synchronously before any effects settle.
			expect(result.current.loading).toBe(true);

			await act(async () => {
				resolve([]);
			});

			await waitFor(() => expect(result.current.loading).toBe(false));
		});

		it('empty $sources keeps loading false from the start', () => {
			const fetcher = vi.fn().mockResolvedValue([]);
			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: undefined,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);
			expect(result.current.loading).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// URL param resolution
	// ---------------------------------------------------------------------------

	describe('URL param resolution', () => {
		it('params resolved from searchParams are appended as query string', async () => {
			const fetcher = vi.fn().mockResolvedValue([]);
			const searchParams = new URLSearchParams('date=2026-01-01');

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_LOGS_URL_PARAM,
					searchParams,
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(fetcher).toHaveBeenCalledWith(
				expect.stringContaining('2026-01-01'),
				undefined,
				undefined,
				undefined
			);
		});

		it('path placeholder is substituted from searchParams', async () => {
			const fetcher = vi.fn().mockResolvedValue([]);
			const searchParams = new URLSearchParams('date=2026-01-01');

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_LOGS_PATH_PARAM,
					searchParams,
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(fetcher).toHaveBeenCalledWith(
				'GET /api/logs/2026-01-01',
				undefined,
				undefined,
				undefined
			);
		});

		it('missing path placeholder skips the source', async () => {
			const fetcher = vi.fn().mockResolvedValue([]);
			const searchParams = new URLSearchParams(); // no 'id' param

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_FILES_PATH_MISSING,
					searchParams,
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(fetcher).not.toHaveBeenCalled();
		});

		it('reloads url-param-dependent sources when searchParams changes', async () => {
			const fetcher = vi.fn().mockResolvedValue([]);
			const initialSearchParams = new URLSearchParams('date=2026-01-01');

			const { rerender } = renderHook(
				({ sp }: { sp: URLSearchParams }) =>
					useSourceLoader({
						$sources: SOURCES_LOGS_PATH_PARAM,
						searchParams: sp,
						fetcher,
					}),
				{ initialProps: { sp: initialSearchParams } }
			);

			// Wait for initial load with the first date
			await waitFor(() =>
				expect(fetcher).toHaveBeenCalledWith(
					expect.stringContaining('2026-01-01'),
					undefined,
					undefined,
					undefined
				)
			);

			const callsAfterInitial = fetcher.mock.calls.length;

			// Update searchParams with a new date
			rerender({ sp: new URLSearchParams('date=2026-01-02') });

			// Should fire fetcher again with the new date
			await waitFor(() =>
				expect(fetcher).toHaveBeenCalledWith(
					expect.stringContaining('2026-01-02'),
					undefined,
					undefined,
					undefined
				)
			);
			expect(fetcher.mock.calls.length).toBeGreaterThan(callsAfterInitial);
		});

		it('resolves $route.* params in source URL', async () => {
			const fetcher = vi.fn().mockResolvedValue([]);
			const routeParams = { itemId: '99' };

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_ITEM_ROUTE_PARAM,
					searchParams: new URLSearchParams(),
					routeParams,
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(fetcher).toHaveBeenCalledWith(
				expect.stringContaining('99'),
				undefined,
				undefined,
				undefined
			);
		});
	});

	// ---------------------------------------------------------------------------
	// Topological ordering
	// ---------------------------------------------------------------------------

	describe('topological ordering', () => {
		it('dependent source loads after its dependency and receives resolved param', async () => {
			const callOrder: string[] = [];
			const fetcher = vi.fn().mockImplementation(async (url: string) => {
				if (url === 'GET /api/a/') {
					callOrder.push('a');
					return { id: 42 };
				}
				callOrder.push('b');
				return [];
			});

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_A_B,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));

			// 'a' must load before 'b'
			expect(callOrder).toEqual(['a', 'b']);
			// The url passed to 'b' must contain the resolved id=42
			const bCall = (fetcher.mock.calls as unknown[][]).find(
				c => typeof c[0] === 'string' && (c[0] as string).includes('42')
			);
			expect(bCall).toBeDefined();
		});
	});

	// ---------------------------------------------------------------------------
	// Cache
	// ---------------------------------------------------------------------------

	describe('cache', () => {
		it('TTL cache: second loadSources call within TTL does not re-fetch', async () => {
			const fetcher = vi.fn().mockResolvedValue([{ id: 1 }]);

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS_WITH_CACHE,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(fetcher).toHaveBeenCalledTimes(1);

			// Second call - no bypassCache flag, so the cache is hit
			await act(async () => {
				await result.current.loadSources();
			});

			expect(fetcher).toHaveBeenCalledTimes(1);
		});

		it('invalidateSourceCache forces re-fetch on next loadSources', async () => {
			const fetcher = vi.fn().mockResolvedValue([{ id: 1 }]);

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS_WITH_CACHE,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(fetcher).toHaveBeenCalledTimes(1);

			// Invalidate the cache entry — the next non-bypass call must go to the fetcher
			act(() => {
				result.current.invalidateSourceCache('books');
			});

			// bypassCache=false: cache should be checked, but since we invalidated it,
			// the fetcher must be called again. This proves invalidateSourceCache is not a no-op.
			await act(async () => {
				await result.current.loadSources(false, {}, undefined, false);
			});

			expect(fetcher).toHaveBeenCalledTimes(2);
		});
	});

	// ---------------------------------------------------------------------------
	// Polling
	// Tests use real timers. Poll interval is "1s" (shortest valid format).
	// waitFor retries on real time; fake timers break waitFor's internal setTimeout.
	// ---------------------------------------------------------------------------

	describe('polling', () => {
		it('fetcher called again after poll interval', async () => {
			const fetcher = vi.fn().mockResolvedValue([]);

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS_POLL_1S,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));
			const countAfterMount = fetcher.mock.calls.length;
			expect(countAfterMount).toBeGreaterThanOrEqual(1);

			// Wait for at least one 1s poll tick to fire (timeout 3s)
			await waitFor(
				() => expect(fetcher.mock.calls.length).toBeGreaterThan(countAfterMount),
				{ timeout: 3000 }
			);
		}, 5000);

		it('pollWhen: false skips polling when the urlParam is absent', async () => {
			const fetcher = vi.fn().mockResolvedValue([]);
			const searchParams = new URLSearchParams(); // 'live' is absent

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS_POLL_WHEN_1S,
					searchParams,
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));
			const countAfterMount = fetcher.mock.calls.length;

			// Wait 1.5s - if polling were active the count would increase
			await new Promise(resolve => setTimeout(resolve, 1500));

			expect(fetcher.mock.calls.length).toBe(countAfterMount);
		}, 5000);

		it('polls when pollWhen urlParam is truthy', async () => {
			const fetcher = vi.fn().mockResolvedValue([]);
			// 'live=1' is truthy — polling should be enabled
			const searchParams = new URLSearchParams('live=1');

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS_POLL_WHEN_1S,
					searchParams,
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));
			const countAfterMount = fetcher.mock.calls.length;
			expect(countAfterMount).toBeGreaterThanOrEqual(1);

			// Wait for at least one 1s poll tick (timeout 3s)
			await waitFor(
				() => expect(fetcher.mock.calls.length).toBeGreaterThan(countAfterMount),
				{ timeout: 3000 }
			);
		}, 5000);
	});

	// ---------------------------------------------------------------------------
	// isRefreshing
	// Tested by calling loadSources(true, ...) directly - no timer machinery needed.
	// ---------------------------------------------------------------------------

	describe('isRefreshing', () => {
		it('isRefreshing is true during a polled reload and false after', async () => {
			// Hold the second fetch in-flight so we can observe isRefreshing=true.
			const secondFetch = deferred<unknown>();
			let callCount = 0;
			const fetcher = vi.fn().mockImplementation(() => {
				callCount++;
				return callCount === 1 ? Promise.resolve([]) : secondFetch.promise;
			});

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);

			await waitFor(() => expect(result.current.loading).toBe(false));

			// Kick off a polled reload manually (isPolled=true) - fetch is held open
			act(() => {
				void result.current.loadSources(true);
			});

			// isRefreshing must flip to true while the fetch is pending
			await waitFor(() => expect(result.current.isRefreshing).toBe(true));

			// Resolve the polled fetch
			await act(async () => {
				secondFetch.resolve([{ id: 99 }]);
			});

			await waitFor(() => expect(result.current.isRefreshing).toBe(false));
		});
	});

	// ---------------------------------------------------------------------------
	// Fetcher rejection
	// ---------------------------------------------------------------------------

	describe('fetcher rejection', () => {
		it('fetcher rejection resets loading to false and preserves existing sourceData', async () => {
			// Suppress the expected console.error from the catch block in the initial load effect
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

			const fetcher = vi.fn().mockRejectedValue(new Error('network error'));

			const { result } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);

			try {
				await waitFor(() => expect(result.current.loading).toBe(false));

				// sourceData must not contain a partial/corrupted value for 'books'
				expect(result.current.sourceData['books']).toBeUndefined();
			} finally {
				consoleError.mockRestore();
			}
		});
	});

	// ---------------------------------------------------------------------------
	// Unmount safety
	// ---------------------------------------------------------------------------

	describe('unmount safety', () => {
		it('results ignored after unmount - no state update warning', async () => {
			const consoleError = vi.spyOn(console, 'error');

			// Build the deferred promise before renderHook so resolve is defined.
			const { promise, resolve } = deferred<unknown>();
			const fetcher = vi.fn().mockReturnValue(promise);

			const { unmount } = renderHook(() =>
				useSourceLoader({
					$sources: SOURCES_BOOKS,
					searchParams: new URLSearchParams(),
					fetcher,
				})
			);

			// Confirm the fetcher was called (effect fired, fetch is in-flight)
			await waitFor(() => expect(fetcher).toHaveBeenCalled());

			// Unmount before the fetch resolves
			unmount();

			// Resolve after unmount - no state update should occur
			await act(async () => {
				resolve([{ id: 1 }]);
			});

			try {
				// No "Warning: Can't perform a React state update on an unmounted component"
				expect(
					(consoleError.mock.calls as unknown[][]).some(
						args => typeof args[0] === 'string' && (args[0] as string).includes('unmounted')
					)
				).toBe(false);
			} finally {
				consoleError.mockRestore();
			}
		});
	});
});
