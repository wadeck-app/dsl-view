import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSourceLoader } from './useSourceLoader.js';
import type { RawSourceSpec } from './pageRunnerUtils.js';

// Module-level so the reference is stable across renders.
const SOURCES_A_B: Record<string, RawSourceSpec> = { a: 'GET /api/a', b: 'GET /api/b' };
const SOURCES_A: Record<string, RawSourceSpec> = { a: 'GET /api/a' };
const SOURCES_POLL_WHEN_VARS: Record<string, RawSourceSpec> = {
	a: { url: 'GET /api/a', poll: '1s', pollWhen: '$vars.live' },
};
const SOURCES_POLL_WHEN_URL: Record<string, RawSourceSpec> = {
	a: { url: 'GET /api/a', poll: '1s', pollWhen: '$urlParam.live' },
};

function deferred<T = unknown>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>(r => {
		resolve = r;
	});
	return { promise, resolve };
}

// A fetcher whose answers are released by hand, in any order, per call.
function manualFetcher() {
	const calls: Array<{ url: string; d: ReturnType<typeof deferred> }> = [];
	const fetcher = vi.fn((url: string) => {
		const d = deferred();
		calls.push({ url, d });
		return d.promise;
	});
	return { fetcher, calls };
}

const params = (fetcher: ReturnType<typeof manualFetcher>['fetcher'], sources: Record<string, RawSourceSpec>) => ({
	$sources: sources,
	searchParams: new URLSearchParams(),
	fetcher: fetcher as never,
});

describe('useSourceLoader: overlapping loads', () => {
	it('keeps the answer of the NEWER load when an older, slower one resolves last', async () => {
		const { fetcher, calls } = manualFetcher();
		const { result } = renderHook(() => useSourceLoader(params(fetcher, SOURCES_A)));
		await waitFor(() => expect(calls).toHaveLength(1));

		// A second load (e.g. the user changed a filter) starts while the first is still pending.
		let second!: Promise<void>;
		act(() => {
			second = result.current.loadSources(false, {});
		});
		await waitFor(() => expect(calls).toHaveLength(2));

		await act(async () => calls[1]!.d.resolve('NEW'));
		await act(async () => second);
		expect(result.current.sourceData).toEqual({ a: 'NEW' });

		// The slow first answer arrives last and must not overwrite the newer data.
		await act(async () => calls[0]!.d.resolve('OLD'));
		expect(result.current.sourceData).toEqual({ a: 'NEW' });
	});

	it('stays loading until the last overlapping load settles, and initialLoading ends only then', async () => {
		const { fetcher, calls } = manualFetcher();
		const { result } = renderHook(() => useSourceLoader(params(fetcher, SOURCES_A)));
		await waitFor(() => expect(calls).toHaveLength(1));
		act(() => {
			void result.current.loadSources(false, {});
		});
		await waitFor(() => expect(calls).toHaveLength(2));

		// The newer load answers first; the older one is still in flight.
		await act(async () => calls[1]!.d.resolve('NEW'));
		await waitFor(() => expect(result.current.sourceData).toEqual({ a: 'NEW' }));
		await act(async () => calls[0]!.d.resolve('OLD'));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.initialLoading).toBe(false);
	});

	it('does not flip loading off when an older load settles first while a newer one is pending', async () => {
		const { fetcher, calls } = manualFetcher();
		const { result } = renderHook(() => useSourceLoader(params(fetcher, SOURCES_A)));
		await waitFor(() => expect(calls).toHaveLength(1));
		act(() => {
			void result.current.loadSources(false, {});
		});
		await waitFor(() => expect(calls).toHaveLength(2));

		await act(async () => calls[0]!.d.resolve('OLD'));
		// Still waiting for the newer load: the page must not read as loaded (and must not show OLD as final).
		expect(result.current.loading).toBe(true);
		expect(result.current.initialLoading).toBe(true);
		expect(result.current.sourceData).toEqual({});

		await act(async () => calls[1]!.d.resolve('NEW'));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.sourceData).toEqual({ a: 'NEW' });
	});

	it('a partial reload of one source never touches the answer of another', async () => {
		const { fetcher, calls } = manualFetcher();
		const { result } = renderHook(() => useSourceLoader(params(fetcher, SOURCES_A_B)));
		await waitFor(() => expect(calls).toHaveLength(2));
		await act(async () => {
			calls[0]!.d.resolve('a1');
			calls[1]!.d.resolve('b1');
		});
		await waitFor(() => expect(result.current.sourceData).toEqual({ a: 'a1', b: 'b1' }));

		act(() => {
			void result.current.loadSources(false, {}, new Set(['a']), true);
		});
		await waitFor(() => expect(calls).toHaveLength(3));
		await act(async () => calls[2]!.d.resolve('a2'));
		await waitFor(() => expect(result.current.sourceData).toEqual({ a: 'a2', b: 'b1' }));
	});

	it('a full reload keeps the stored value of a source a newer partial reload owns', async () => {
		const { fetcher, calls } = manualFetcher();
		const { result } = renderHook(() => useSourceLoader(params(fetcher, SOURCES_A_B)));
		await waitFor(() => expect(calls).toHaveLength(2));
		await act(async () => {
			calls[0]!.d.resolve('a1');
			calls[1]!.d.resolve('b1');
		});
		await waitFor(() => expect(result.current.sourceData).toEqual({ a: 'a1', b: 'b1' }));

		// Full reload starts (slow), then a partial reload of `a` starts and finishes first.
		act(() => {
			void result.current.loadSources(false, {});
		});
		await waitFor(() => expect(calls).toHaveLength(4));
		act(() => {
			void result.current.loadSources(false, {}, new Set(['a']), true);
		});
		await waitFor(() => expect(calls).toHaveLength(5));
		await act(async () => calls[4]!.d.resolve('a3'));
		await waitFor(() => expect(result.current.sourceData).toEqual({ a: 'a3', b: 'b1' }));

		// The full reload now answers: `a` is stale there (owned by the newer partial load), `b` is fresh.
		await act(async () => {
			calls[2]!.d.resolve('a2-stale');
			calls[3]!.d.resolve('b2');
		});
		await waitFor(() => expect(result.current.sourceData).toEqual({ a: 'a3', b: 'b2' }));
	});
});

describe('useSourceLoader: unsupported pollWhen', () => {
	it('says so loudly (naming the source and the supported form) instead of silently ignoring the condition', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { fetcher } = manualFetcher();
		renderHook(() => useSourceLoader(params(fetcher, SOURCES_POLL_WHEN_VARS)));
		await waitFor(() => expect(error).toHaveBeenCalled());
		const message = error.mock.calls.map(c => String(c[0])).find(m => m.includes('pollWhen'));
		expect(message).toContain('Source "a"');
		expect(message).toContain('"$vars.live"');
		expect(message).toContain('$urlParam.<name>');
		error.mockRestore();
	});

	it('stays quiet for the supported $urlParam form', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { fetcher } = manualFetcher();
		renderHook(() => useSourceLoader(params(fetcher, SOURCES_POLL_WHEN_URL)));
		// One macrotask turn: the load and its effects have all run, so a (wrong) error would be logged by now.
		await act(async () => {
			await new Promise<void>(resolve => setTimeout(resolve, 0));
		});
		expect(error.mock.calls.map(c => String(c[0])).filter(m => m.includes('pollWhen'))).toHaveLength(0);
		error.mockRestore();
	});
});
