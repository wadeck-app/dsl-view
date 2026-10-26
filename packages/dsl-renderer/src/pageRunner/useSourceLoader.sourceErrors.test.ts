import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSourceLoader } from './useSourceLoader.js';
import type { RawSourceSpec } from './pageRunnerUtils.js';

const SOURCES_A_B: Record<string, RawSourceSpec> = { a: 'GET /api/a', b: 'GET /api/b' };
const SOURCES_A: Record<string, RawSourceSpec> = { a: 'GET /api/a' };

function deferred() {
	let resolve!: (v: unknown) => void;
	let reject!: (e: unknown) => void;
	const promise = new Promise<unknown>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

const base = (fetcher: unknown, sources: Record<string, RawSourceSpec>, onLoadError?: never) => ({
	$sources: sources,
	searchParams: new URLSearchParams(),
	fetcher: fetcher as never,
	onLoadError,
});

describe('useSourceLoader: sourceErrors', () => {
	it('records the failing source with its message and numeric status, and names it to onLoadError', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failure = Object.assign(new Error('Service Unavailable'), { status: 503 });
		const fetcher = vi.fn(async (url: string) => {
			if (url.includes('/b')) {
				throw failure;
			}
			return { ok: true };
		});
		const onLoadError = vi.fn();
		const { result } = renderHook(() => useSourceLoader(base(fetcher, SOURCES_A_B, onLoadError as never)));

		await waitFor(() => expect(onLoadError).toHaveBeenCalledTimes(1));
		expect(onLoadError).toHaveBeenCalledWith(failure, { source: 'b', trigger: 'initial' });
		expect(result.current.sourceErrors).toStrictEqual({ b: { message: 'Service Unavailable', status: 503 } });
		expect(result.current.sourceOfFailure(failure)).toBe('b');
		// Another error object is not attributed to a source.
		expect(result.current.sourceOfFailure(new Error('other'))).toBeUndefined();
	});

	it('a status that is not a number is left out, and a non-Error rejection keeps its text', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetcher = vi.fn().mockRejectedValue('offline');
		const { result } = renderHook(() => useSourceLoader(base(fetcher, SOURCES_A)));
		await waitFor(() => expect(result.current.sourceErrors).toStrictEqual({ a: { message: 'offline' } }));
	});

	it('does not re-render for an identical failure on every poll-like reload (same state object)', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetcher = vi.fn().mockRejectedValue(new Error('down'));
		const { result } = renderHook(() => useSourceLoader(base(fetcher, SOURCES_A)));
		await waitFor(() => expect(result.current.sourceErrors['a']).toBeDefined());
		const before = result.current.sourceErrors;

		await act(async () => {
			await result.current.loadSources(true, {}, undefined, true).catch(() => undefined);
		});

		expect(result.current.sourceErrors).toBe(before);
	});

	it('is emptied for a source once a later load of it succeeds, leaving the other failing sources alone', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		let aDown = true;
		const fetcher = vi.fn(async (url: string) => {
			if (url.includes('/b') || aDown) {
				throw new Error(url.includes('/b') ? 'b down' : 'a down');
			}
			return { ok: 1 };
		});
		const { result } = renderHook(() => useSourceLoader(base(fetcher, SOURCES_A_B)));
		await waitFor(() => expect(Object.keys(result.current.sourceErrors).sort()).toStrictEqual(['a', 'b']));

		aDown = false;
		await act(async () => {
			await result.current.loadSources(false, {}, new Set(['a']), true);
		});

		expect(result.current.sourceErrors).toStrictEqual({ b: { message: 'b down' } });
		expect(result.current.sourceData['a']).toStrictEqual({ ok: 1 });
	});

	it('a stale failure from an older load does not mark a source the newer load answered', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const calls: Array<ReturnType<typeof deferred>> = [];
		const fetcher = vi.fn(() => {
			const d = deferred();
			calls.push(d);
			return d.promise;
		});
		const { result } = renderHook(() => useSourceLoader(base(fetcher, SOURCES_A)));
		await waitFor(() => expect(calls).toHaveLength(1));

		let second!: Promise<void>;
		act(() => {
			second = result.current.loadSources(false, {}, undefined, true);
		});
		await waitFor(() => expect(calls).toHaveLength(2));

		await act(async () => {
			calls[1]!.resolve({ fresh: true });
			await second;
		});
		await act(async () => {
			calls[0]!.reject(new Error('slow and stale'));
		});

		expect(result.current.sourceData['a']).toStrictEqual({ fresh: true });
		expect(result.current.sourceErrors).toStrictEqual({});
	});

	it('records nothing after unmount', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const d = deferred();
		const fetcher = vi.fn(() => d.promise);
		const { unmount } = renderHook(() => useSourceLoader(base(fetcher, SOURCES_A)));
		await waitFor(() => expect(fetcher).toHaveBeenCalled());
		unmount();
		const errors = vi.spyOn(console, 'error');
		await act(async () => {
			d.reject(new Error('late'));
		});
		expect(errors.mock.calls.some(call => String(call[0]).includes('unmounted'))).toBe(false);
	});
});
