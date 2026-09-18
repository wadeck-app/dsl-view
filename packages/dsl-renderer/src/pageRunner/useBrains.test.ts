import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBrains } from './useBrains.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		'$vars': {},
		'$outputs': {},
		'$brains': {},
		...overrides,
	};
}

function makeParams(
	$brains: Record<string, import('./brainsTypes.js').RawBrainSpec>,
	ctx: Record<string, unknown>,
	overrides: Partial<Parameters<typeof useBrains>[0]> = {}
) {
	return {
		$brains,
		ctx,
		setVar: vi.fn(),
		loadSources: vi.fn().mockResolvedValue(undefined),
		invalidateSourceCache: vi.fn(),
		fetcher: vi.fn().mockResolvedValue({ content: 'hello', mimeType: 'text/plain' }),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBrains', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// -------------------------------------------------------------------------
	// Group: static brains (no reactive params) run once at init
	// -------------------------------------------------------------------------

	describe('static brains (no reactive params) run once at init', () => {
		it('runs once on mount and calls setVar with the static value', async () => {
			const setVar = vi.fn();
			const ctx = makeCtx();
			const { result } = renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$ctx.setVar',
							varName: 'greeting',
							value: 'hello',
						},
					},
					ctx,
					{ setVar }
				))
			);

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledTimes(1);
			});
			expect(setVar).toHaveBeenCalledWith('greeting', 'hello');
			// No output FIELDS for setVar, which declares no $outputs. The entry itself exists now
			// because every brain reports its own $pending/$error, whether it returns anything or not.
			expect(Object.keys(result.current.brainResults['brain1'] as object).filter(k => !k.startsWith('$')))
				.toEqual([]);
		});

		it('a brain with only static string params never re-triggers on re-render', async () => {
			const setVar = vi.fn();
			const ctx = makeCtx();
			const { rerender } = renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$ctx.setVar',
							varName: 'x',
							value: 'static',
						},
					},
					ctx,
					{ setVar }
				))
			);

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledTimes(1);
			});

			// Re-render with the same ctx - snapshot unchanged, brain must NOT fire again
			rerender();
			// Small wait to ensure no additional calls happen
			await act(async () => {});
			expect(setVar).toHaveBeenCalledTimes(1);
		});
	});

	// -------------------------------------------------------------------------
	// Group: reactive brains trigger on param change
	// -------------------------------------------------------------------------

	describe('reactive brains trigger on param change', () => {
		it('re-runs when $vars.x changes', async () => {
			const setVar = vi.fn();
			let ctx = makeCtx({ '$vars': { x: 'initial' } });

			const { rerender } = renderHook(
				({ currentCtx }: { currentCtx: Record<string, unknown> }) =>
					useBrains(makeParams(
						{
							brain1: {
								$brain: '$brains.$ctx.setVar',
								varName: 'result',
								value: '$vars.x',
							},
						},
						currentCtx,
						{ setVar }
					)),
				{ initialProps: { currentCtx: ctx } }
			);

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledWith('result', 'initial');
			});

			// Change $vars.x
			ctx = makeCtx({ '$vars': { x: 'changed' } });
			rerender({ currentCtx: ctx });

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledWith('result', 'changed');
			});
			expect(setVar).toHaveBeenCalledTimes(2);
		});

		it('re-runs when $outputs.btn.onClick changes', async () => {
			const setVar = vi.fn();
			let ctx = makeCtx({ '$outputs': { btn: { onClick: 'v1' } } });

			const { rerender } = renderHook(
				({ currentCtx }: { currentCtx: Record<string, unknown> }) =>
					useBrains(makeParams(
						{
							brain1: {
								$brain: '$brains.$ctx.setVar',
								varName: 'clicked',
								value: '$outputs.btn.onClick',
							},
						},
						currentCtx,
						{ setVar }
					)),
				{ initialProps: { currentCtx: ctx } }
			);

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledWith('clicked', 'v1');
			});

			ctx = makeCtx({ '$outputs': { btn: { onClick: 'v2' } } });
			rerender({ currentCtx: ctx });

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledWith('clicked', 'v2');
			});
			expect(setVar).toHaveBeenCalledTimes(2);
		});

		it('does NOT re-run when a non-reactive ctx key changes', async () => {
			const setVar = vi.fn();
			// Brain uses a static value - no reactive params
			let ctx = makeCtx({ loading: false });

			const { rerender } = renderHook(
				({ currentCtx }: { currentCtx: Record<string, unknown> }) =>
					useBrains(makeParams(
						{
							brain1: {
								$brain: '$brains.$ctx.setVar',
								varName: 'x',
								value: 'static',
							},
						},
						currentCtx,
						{ setVar }
					)),
				{ initialProps: { currentCtx: ctx } }
			);

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledTimes(1);
			});

			// Change only a non-reactive key
			ctx = makeCtx({ loading: true });
			rerender({ currentCtx: ctx });

			await act(async () => {});
			// Should still be 1 - no reactive param changed
			expect(setVar).toHaveBeenCalledTimes(1);
		});
	});

	// -------------------------------------------------------------------------
	// Group: $brains.$http.* calls fetcher
	// -------------------------------------------------------------------------

	describe('$brains.$http.* calls fetcher', () => {
		it('$brains.$http.post calls fetcher with url, body, authHeaders', async () => {
			const fetcher = vi.fn().mockResolvedValue({});
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$http.post',
							url: 'POST /api/books/',
							body: { title: 'New Book' },
						},
					},
					ctx,
					{ fetcher }
				))
			);

			await waitFor(() => {
				expect(fetcher).toHaveBeenCalledTimes(1);
			});
			// getToken not provided -> authHeaders = undefined
			expect(fetcher).toHaveBeenCalledWith(
				'POST /api/books/',
				undefined,
				{ title: 'New Book' },
				undefined
			);
		});

		it('$brains.$http.delete calls fetcher with no body', async () => {
			const fetcher = vi.fn().mockResolvedValue({});
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$http.delete',
							url: 'DELETE /api/books/1',
						},
					},
					ctx,
					{ fetcher }
				))
			);

			await waitFor(() => {
				expect(fetcher).toHaveBeenCalledTimes(1);
			});
			expect(fetcher).toHaveBeenCalledWith(
				'DELETE /api/books/1',
				undefined,
				undefined,
				undefined
			);
		});

		it('substitutes {id} URL placeholder in $brains.$http.patch', async () => {
			const fetcher = vi.fn().mockResolvedValue({});
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$http.patch',
							url: 'PATCH /api/books/{id}',
							id: '42',
							body: { title: 'Updated' },
						},
					},
					ctx,
					{ fetcher }
				))
			);

			await waitFor(() => {
				expect(fetcher).toHaveBeenCalledTimes(1);
			});
			expect(fetcher).toHaveBeenCalledWith(
				'PATCH /api/books/42',
				undefined,
				{ title: 'Updated' },
				undefined
			);
		});

		it('substitutes route params from routeParams into URL placeholders', async () => {
			const fetcher = vi.fn().mockResolvedValue({});
			const ctx = makeCtx();

			renderHook(() =>
				useBrains({
					$brains: {
						brain1: {
							$brain: '$brains.$http.post',
							url: 'POST /api/interventions/{interventionId}/respond',
							body: { message: 'ok' },
						},
					},
					ctx,
					setVar: vi.fn(),
					loadSources: vi.fn().mockResolvedValue(undefined),
					invalidateSourceCache: vi.fn(),
					fetcher,
					routeParams: { interventionId: 'int-99' },
				})
			);

			await waitFor(() => {
				expect(fetcher).toHaveBeenCalledTimes(1);
			});
			expect(fetcher).toHaveBeenCalledWith(
				'POST /api/interventions/int-99/respond',
				undefined,
				{ message: 'ok' },
				undefined
			);
		});
	});

	// -------------------------------------------------------------------------
	// Group: $brains.$ctx.setVar
	// -------------------------------------------------------------------------

	describe('$brains.$ctx.setVar', () => {
		it('calls setVar with correct varName and static value', async () => {
			const setVar = vi.fn();
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$ctx.setVar',
							varName: 'myVar',
							value: 'myValue',
						},
					},
					ctx,
					{ setVar }
				))
			);

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledWith('myVar', 'myValue');
			});
		});

		it('calls setVar again when reactive $vars.x changes', async () => {
			const setVar = vi.fn();
			let ctx = makeCtx({ '$vars': { x: 'first' } });

			const { rerender } = renderHook(
				({ currentCtx }: { currentCtx: Record<string, unknown> }) =>
					useBrains(makeParams(
						{
							brain1: {
								$brain: '$brains.$ctx.setVar',
								varName: 'copy',
								value: '$vars.x',
							},
						},
						currentCtx,
						{ setVar }
					)),
				{ initialProps: { currentCtx: ctx } }
			);

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledWith('copy', 'first');
			});

			ctx = makeCtx({ '$vars': { x: 'second' } });
			rerender({ currentCtx: ctx });

			await waitFor(() => {
				expect(setVar).toHaveBeenCalledWith('copy', 'second');
			});
			expect(setVar).toHaveBeenCalledTimes(2);
		});
	});

	// -------------------------------------------------------------------------
	// Group: $reload: sources
	// -------------------------------------------------------------------------

	describe('$reload: sources', () => {
		it('calls invalidateSourceCache and loadSources after a successful brain', async () => {
			const invalidateSourceCache = vi.fn();
			const loadSources = vi.fn().mockResolvedValue(undefined);
			const fetcher = vi.fn().mockResolvedValue({ id: 1 });
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$http.post',
							url: 'POST /api/books/',
							$reload: ['books'],
						},
					},
					ctx,
					{ fetcher, invalidateSourceCache, loadSources }
				))
			);

			await waitFor(() => {
				expect(invalidateSourceCache).toHaveBeenCalledWith('books');
			});
			expect(loadSources).toHaveBeenCalledWith(
				false,
				ctx,
				new Set(['books']),
				true
			);
		});

		it('does NOT call invalidateSourceCache or loadSources when the brain throws', async () => {
			const invalidateSourceCache = vi.fn();
			const loadSources = vi.fn().mockResolvedValue(undefined);
			const fetcher = vi.fn().mockRejectedValue(new Error('network error'));
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$http.post',
							url: 'POST /api/books/',
							$reload: ['books'],
						},
					},
					ctx,
					{ fetcher, invalidateSourceCache, loadSources }
				))
			);

			// Give async brain time to settle
			await act(async () => {
				await new Promise(r => setTimeout(r, 50));
			});

			expect(invalidateSourceCache).not.toHaveBeenCalled();
			expect(loadSources).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Group: brainResults
	// -------------------------------------------------------------------------

	describe('brainResults', () => {
		it('stores returned fields in brainResults[brainId] when $outputs is declared', async () => {
			const fetcher = vi.fn().mockResolvedValue({ content: 'hello', mimeType: 'text/plain', extra: 'ignored' });
			const ctx = makeCtx();

			const { result } = renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$http.get',
							url: 'GET /api/render/',
							$outputs: ['content', 'mimeType'],
						},
					},
					ctx,
					{ fetcher }
				))
			);

			// Waits for the brain to have SETTLED, not merely for its entry to exist. The entry is
			// created as soon as the brain starts, carrying { $pending: true }, so `toBeDefined()`
			// was satisfied immediately and the assertions below raced the fetcher's promise: it
			// happened to have resolved locally and had not on a slower CI runner, where the
			// received value was the pending placeholder.
			await waitFor(() => {
				expect(result.current.brainResults['brain1']?.['$pending']).toBe(false);
			});
			// toMatchObject, not toEqual: the entry also carries $pending/$error now.
			expect(result.current.brainResults['brain1']).toMatchObject({
				content: 'hello',
				mimeType: 'text/plain',
			});
			// 'extra' must not be included
			expect((result.current.brainResults['brain1'] as Record<string, unknown>)['extra']).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// Group: $chain execution
	// -------------------------------------------------------------------------

	describe('$chain execution', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('two-step chain passes step1 output to step2 via $chain reference', async () => {
			const fetcher = vi.fn().mockImplementation(async (url: string) => {
				if (url.includes('/api/step1/')) return { id: 42 };
				return {};
			});
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						myChain: {
							$chain: [
								{
									id: 'step1',
									$brain: '$brains.$http.get',
									url: 'GET /api/step1/',
									$outputs: ['id'],
								},
								{
									id: 'step2',
									$brain: '$brains.$http.post',
									url: 'POST /api/step2/{itemId}',
									itemId: '$chain.step1.id',
								},
							],
						},
					},
					ctx,
					{ fetcher }
				))
			);

			await waitFor(() => {
				expect(fetcher).toHaveBeenCalledTimes(2);
			});

			// Second call URL must contain the resolved id from step1
			const secondCallUrl = (fetcher.mock.calls as unknown[][])[1]?.[0] as string;
			expect(secondCallUrl).toContain('42');
		});

		it('chain $reload fires after all steps succeed', async () => {
			const fetcher = vi.fn().mockResolvedValue({ id: 1 });
			const invalidateSourceCache = vi.fn();
			const loadSources = vi.fn().mockResolvedValue(undefined);
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						myChain: {
							$chain: [
								{ id: 'step1', $brain: '$brains.$http.get', url: 'GET /api/step1/', $outputs: ['id'] },
								{ id: 'step2', $brain: '$brains.$http.post', url: 'POST /api/step2/', },
							],
							$reload: ['books'],
						},
					},
					ctx,
					{ fetcher, invalidateSourceCache, loadSources }
				))
			);

			await waitFor(() => {
				expect(invalidateSourceCache).toHaveBeenCalledWith('books');
			});
			expect(loadSources).toHaveBeenCalledWith(
				false,
				ctx,
				new Set(['books']),
				true
			);
			// Both steps must have run before $reload fired
			expect(fetcher).toHaveBeenCalledTimes(2);
		});

		it('chain aborts on step failure - subsequent steps and $reload are NOT triggered', async () => {
			const step2Fetcher = vi.fn().mockResolvedValue({});
			const fetcher = vi.fn().mockImplementation(async (url: string) => {
				if (url.includes('/api/step1/')) throw new Error('step1 failed');
				return await step2Fetcher(url);
			});
			const invalidateSourceCache = vi.fn();
			const loadSources = vi.fn().mockResolvedValue(undefined);
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						myChain: {
							$chain: [
								{ id: 'step1', $brain: '$brains.$http.get', url: 'GET /api/step1/', $outputs: ['id'] },
								{ id: 'step2', $brain: '$brains.$http.post', url: 'POST /api/step2/', },
							],
							$reload: ['books'],
						},
					},
					ctx,
					{ fetcher, invalidateSourceCache, loadSources }
				))
			);

			// Give the chain time to attempt step1 and catch the error
			await act(async () => {
				await new Promise(r => setTimeout(r, 50));
			});

			// step2 must not have been called
			expect(step2Fetcher).not.toHaveBeenCalled();
			// $reload must not have been triggered
			expect(invalidateSourceCache).not.toHaveBeenCalled();
			expect(loadSources).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Group: brainRegistry and unknown refs
	// -------------------------------------------------------------------------

	describe('brainRegistry and unknown refs', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('unknown brain ref logs error with "Unknown brain" message', async () => {
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.nonexistent.fn',
						},
					},
					ctx,
					{ brainRegistry: {} }
				))
			);

			try {
				await waitFor(() => {
					expect(
						(consoleError.mock.calls as unknown[][]).some(
							args =>
								args.some(
									a => typeof a === 'string' && a.toLowerCase().includes('unknown brain')
								)
						)
					).toBe(true);
				});
			} finally {
				consoleError.mockRestore();
			}
		});

		it('custom registry function is called with resolved params', async () => {
			const customFn = vi.fn().mockResolvedValue({ result: 'ok' });
			const brainRegistry = { 'myPkg.myBrain.fn': customFn };
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.myPkg.myBrain.fn',
							param1: 'value1',
						},
					},
					ctx,
					{ brainRegistry }
				))
			);

			await waitFor(() => {
				expect(customFn).toHaveBeenCalledTimes(1);
			});
			expect(customFn).toHaveBeenCalledWith(
				expect.objectContaining({ param1: 'value1' })
			);
		});
	});

	// -------------------------------------------------------------------------
	// Group: $ctx.setVar + $reload enriches ctx with new var value
	// -------------------------------------------------------------------------

	describe('$ctx.setVar with $reload passes updated var in ctx to loadSources', () => {
		it('loadSources receives ctx with the new var value, not the stale one', async () => {
			const loadSources = vi.fn().mockResolvedValue(undefined);
			const ctx = makeCtx({ '$vars': { currentPath: '/' } });

			renderHook(() =>
				useBrains(makeParams(
					{
						navigate: {
							$brain: '$brains.$ctx.setVar',
							varName: 'currentPath',
							value: '/documents',
							$reload: ['rows'],
						},
					},
					ctx,
					{ loadSources }
				))
			);

			await waitFor(() => {
				expect(loadSources).toHaveBeenCalledTimes(1);
			});

			// The ctx passed to loadSources must contain the NEW var value, not the old '/'
			const callArgs = (loadSources.mock.calls as unknown[][])[0];
			const passedCtx = callArgs?.[1] as Record<string, unknown>;
			const passedVars = passedCtx?.['$vars'] as Record<string, unknown> | undefined;
			expect(passedVars?.['currentPath']).toBe('/documents');
		});
	});

	// -------------------------------------------------------------------------
	// Group: concurrent brain executions
	// -------------------------------------------------------------------------

	describe('concurrent brain executions', () => {
		it('two independent brains firing simultaneously both complete without interfering', async () => {
			const fetcher = vi.fn().mockImplementation(async (url: string) => {
				if (url.includes('brain1')) return { result: 'one' };
				return { result: 'two' };
			});
			const ctx = makeCtx();

			const { result } = renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$http.get',
							url: 'GET /api/brain1/',
							$outputs: ['result'],
						},
						brain2: {
							$brain: '$brains.$http.get',
							url: 'GET /api/brain2/',
							$outputs: ['result'],
						},
					},
					ctx,
					{ fetcher }
				))
			);

			// Waits on the FIELD, not on the entry. An entry now appears as soon as a brain starts,
			// because it carries $pending, so "the entry exists" no longer means "the call finished"
			// and this waited on nothing.
			await waitFor(() => {
				expect((result.current.brainResults['brain1'] as Record<string, unknown>)['result']).toBe('one');
				expect((result.current.brainResults['brain2'] as Record<string, unknown>)['result']).toBe('two');
			});
		});
	});

	// -------------------------------------------------------------------------
	// Group: $brains.$ctx.navigate
	// -------------------------------------------------------------------------

	describe('$brains.$ctx.navigate', () => {
		it('$brains.$ctx.navigate sets window.location.href', async () => {
			// Replace window.location with a plain object so jsdom does not throw
			// on href assignment (jsdom's default location object is non-writable).
			delete (window as unknown as Record<string, unknown>)['location'];
			(window as unknown as Record<string, unknown>)['location'] = { href: '' };

			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$ctx.navigate',
							route: '/dashboard',
						},
					},
					ctx
				))
			);

			await waitFor(() => {
				expect(window.location.href).toBe('/dashboard');
			});
		});
	});

	// -------------------------------------------------------------------------
	// Group: auth headers via getToken
	// -------------------------------------------------------------------------

	describe('auth headers via getToken', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('passes auth headers from getToken to fetcher', async () => {
			const fetcher = vi.fn().mockResolvedValue({});
			const getToken = vi.fn().mockResolvedValue('bearer-token-123');
			const ctx = makeCtx();

			renderHook(() =>
				useBrains(makeParams(
					{
						brain1: {
							$brain: '$brains.$http.get',
							url: 'GET /api/secure/',
						},
					},
					ctx,
					{ fetcher, getToken }
				))
			);

			await waitFor(() => {
				expect(fetcher).toHaveBeenCalledTimes(1);
			});
			// 4th argument must be the auth headers object
			expect(fetcher).toHaveBeenCalledWith(
				'GET /api/secure/',
				undefined,
				undefined,
				{ Authorization: 'Bearer bearer-token-123' }
			);
		});
	});

	/*
	 * Brain-to-brain chaining through `$brains.<id>.<field>` was dead.
	 *
	 * useBrains is called with a ctx that has no `$brains` key at all - GenericPageRunner adds
	 * `$brains: brainResults` to a SECOND ctx, built after the hook returns, for rendering. So the
	 * reference resolved to undefined on the first render and on every render after it, the value
	 * never changed, and the downstream brain never fired.
	 *
	 * No test caught it because `makeCtx` above supplies `'$brains': {}` and the hook then filled it
	 * in from its own state - the double was more capable than the real caller.
	 */
	describe('a brain waiting on another brain', () => {
		it('fires once the upstream brain publishes its result', async () => {
			const fetcher = vi.fn().mockResolvedValue({ id: 'job-42' });
			const setVar = vi.fn();
			const $brains = {
				submit: { $brain: '$brains.$http.post', url: 'POST /api/jobs', $outputs: ['id'] },
				afterwards: { $brain: '$brains.$ctx.setVar', varName: 'created', value: '$brains.submit.id' },
			} as unknown as Record<string, import('./brainsTypes.js').RawBrainSpec>;

			renderHook(() => useBrains(makeParams($brains, makeCtx(), { fetcher, setVar })));

			// This is the assertion that failed before the fix, and the reason saving a job left the
			// page sitting on the form: the navigate brain was waiting on a value it could not see.
			await waitFor(() => {
				expect(setVar).toHaveBeenCalledWith('created', 'job-42');
			});
		});

		it('does not fire the downstream brain before the upstream one resolves', async () => {
			const setVar = vi.fn();
			const fetcher = vi.fn(() => new Promise(() => { /* never settles */ }));
			const $brains = {
				submit: { $brain: '$brains.$http.post', url: 'POST /api/jobs', $outputs: ['id'] },
				afterwards: { $brain: '$brains.$ctx.setVar', varName: 'created', value: '$brains.submit.id' },
			} as unknown as Record<string, import('./brainsTypes.js').RawBrainSpec>;

			renderHook(() => useBrains(makeParams($brains, makeCtx(), { fetcher, setVar })));

			await waitFor(() => {
				expect(fetcher).toHaveBeenCalled();
			});
			expect(setVar).not.toHaveBeenCalled();
		});
	});

	/*
	 * A page could not observe its own mutations. The brain owns the request, so a form's `loading`
	 * never flipped and its submit button stayed live through the save, while a rejection reached
	 * nothing but the console. "Save appears to do nothing" was both at once.
	 */
	describe('brain status is visible to the page', () => {
		function statusOf(results: Record<string, unknown>, id: string) {
			return results[id] as { $pending: boolean; $error: string | null } | undefined;
		}

		it('reports $pending while the request is in flight, and clears it after', async () => {
			let release: ((v: unknown) => void) | undefined;
			const fetcher = vi.fn(() => new Promise(res => { release = res; }));
			const $brains = {
				submit: { $brain: '$brains.$http.post', url: 'POST /api/jobs' },
			} as unknown as Record<string, import('./brainsTypes.js').RawBrainSpec>;

			const { result } = renderHook(() => useBrains(makeParams($brains, makeCtx(), { fetcher })));

			await waitFor(() => {
				expect(statusOf(result.current.brainResults, 'submit')?.$pending).toBe(true);
			});

			await act(async () => { release?.({}); });

			await waitFor(() => {
				expect(statusOf(result.current.brainResults, 'submit')?.$pending).toBe(false);
			});
		});

		it('publishes the failure message rather than only logging it', async () => {
			const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
			const fetcher = vi.fn().mockRejectedValue(new Error('Daemon RPC error 500'));
			const $brains = {
				submit: { $brain: '$brains.$http.post', url: 'POST /api/jobs' },
			} as unknown as Record<string, import('./brainsTypes.js').RawBrainSpec>;

			const { result } = renderHook(() => useBrains(makeParams($brains, makeCtx(), { fetcher })));

			await waitFor(() => {
				expect(statusOf(result.current.brainResults, 'submit')?.$error).toContain('500');
			});
			expect(statusOf(result.current.brainResults, 'submit')?.$pending).toBe(false);
			// Still logged: the console line is useful, it was just never the whole channel.
			expect(logged).toHaveBeenCalled();
			logged.mockRestore();
		});

		it('leaves $error null when the brain succeeds', async () => {
			const $brains = {
				submit: { $brain: '$brains.$http.post', url: 'POST /api/jobs' },
			} as unknown as Record<string, import('./brainsTypes.js').RawBrainSpec>;

			const { result } = renderHook(() => useBrains(makeParams($brains, makeCtx())));

			await waitFor(() => {
				expect(statusOf(result.current.brainResults, 'submit')?.$pending).toBe(false);
			});
			expect(statusOf(result.current.brainResults, 'submit')?.$error).toBeNull();
		});

		// $-prefixed so they cannot shadow a field the brain declares in its own $outputs.
		it('keeps status keys from colliding with declared output fields', async () => {
			const fetcher = vi.fn().mockResolvedValue({ id: 'x', $pending: 'not mine' });
			const $brains = {
				submit: { $brain: '$brains.$http.post', url: 'POST /api/jobs', $outputs: ['id'] },
			} as unknown as Record<string, import('./brainsTypes.js').RawBrainSpec>;

			const { result } = renderHook(() => useBrains(makeParams($brains, makeCtx(), { fetcher })));

			await waitFor(() => {
				expect(statusOf(result.current.brainResults, 'submit')?.$pending).toBe(false);
			});
			expect((result.current.brainResults['submit'] as Record<string, unknown>)['id']).toBe('x');
		});
	});
});
