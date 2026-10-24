import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Notification } from '../notifier.js';
import { useBrains } from './useBrains.js';
import type { RawBrainSpec } from './brainsTypes.js';

const ctx = { $vars: {}, $outputs: {}, $brains: {} };

function setup($brains: Record<string, RawBrainSpec>, overrides: Partial<Parameters<typeof useBrains>[0]> = {}) {
	const notifications: Notification[] = [];
	const params = {
		$brains,
		ctx,
		setVar: vi.fn(),
		loadSources: vi.fn().mockResolvedValue(undefined),
		invalidateSourceCache: vi.fn(),
		fetcher: vi.fn().mockResolvedValue({}),
		notify: (n: Notification) => notifications.push(n),
		...overrides,
	};
	const view = renderHook(() => useBrains(params));
	return { ...view, params, notifications };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('$brains.$ctx.setVar guard', () => {
	it('fails loudly (brain $error + notification) when varName is missing, instead of writing the key "undefined"', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { result, params, notifications } = setup({ save: { $brain: '$brains.$ctx.setVar', value: 1 } });
		await waitFor(() => expect(notifications).toHaveLength(1));
		expect(params.setVar).not.toHaveBeenCalled();
		expect(notifications[0]!.message).toContain('needs a non-empty "varName" (got nothing)');
		expect((result.current.brainResults['save'] as { $error: string }).$error).toContain('varName');
	});

	it('rejects an empty or non-string varName and shows what was given', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const empty = setup({ save: { $brain: '$brains.$ctx.setVar', varName: '', value: 1 } });
		await waitFor(() => expect(empty.notifications).toHaveLength(1));
		expect(empty.notifications[0]!.message).toContain('(got "")');
		const numeric = setup({ save: { $brain: '$brains.$ctx.setVar', varName: 5 as never, value: 1 } });
		await waitFor(() => expect(numeric.notifications).toHaveLength(1));
		expect(numeric.notifications[0]!.message).toContain('(got 5)');
	});

	it('still sets the var for a valid name', async () => {
		const { params } = setup({ save: { $brain: '$brains.$ctx.setVar', varName: 'x', value: 1 } });
		await waitFor(() => expect(params.setVar).toHaveBeenCalledWith('x', 1));
	});
});

describe('$http brains: empty URL placeholders', () => {
	it('warns (naming the brain type, url and placeholder) and still sends the request with an empty segment', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { params } = setup({ del: { $brain: '$brains.$http.delete', url: 'DELETE /api/items/{id}' } });
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledTimes(1));
		expect(params.fetcher).toHaveBeenCalledWith('DELETE /api/items/', undefined, undefined, undefined);
		expect(warn).toHaveBeenCalledWith('[useBrains] $brains.$http.delete: URL placeholder {id} has no value in "DELETE /api/items/{id}", substituting an empty string.');
	});

	it('does not warn when every placeholder has a value (from params or from the route)', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { params } = setup(
			{ get: { $brain: '$brains.$http.get', url: 'GET /api/w/{wid}/items/{id}', id: 'i1' } },
			{ routeParams: { wid: 'W1' } }
		);
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledWith('GET /api/w/W1/items/i1', undefined, undefined, undefined));
		expect(warn).not.toHaveBeenCalled();
	});

	it('gives brain params priority over route params, and skips null params', async () => {
		const { params } = setup(
			{ get: { $brain: '$brains.$http.get', url: 'GET /api/{id}/{other}', id: 'fromBrain', other: null as never } },
			{ routeParams: { id: 'fromRoute', other: 'routeOther' } }
		);
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledWith('GET /api/fromBrain/routeOther', undefined, undefined, undefined));
	});

	it('sends the body for POST/PUT and none for GET/DELETE', async () => {
		const { params } = setup({
			post: { $brain: '$brains.$http.post', url: 'POST /api/a', body: { x: 1 } as never },
			get: { $brain: '$brains.$http.get', url: 'GET /api/b', body: { x: 2 } as never },
			del: { $brain: '$brains.$http.delete', url: 'DELETE /api/c', body: { x: 3 } as never },
		});
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledTimes(3));
		expect(params.fetcher).toHaveBeenCalledWith('POST /api/a', undefined, { x: 1 }, undefined);
		expect(params.fetcher).toHaveBeenCalledWith('GET /api/b', undefined, undefined, undefined);
		expect(params.fetcher).toHaveBeenCalledWith('DELETE /api/c', undefined, undefined, undefined);
	});
});

describe('unknown brains and reactive refs through the shared path walker', () => {
	it('an unknown brain reference fails with its name', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { notifications } = setup({ nope: { $brain: '$brains.ghost' } });
		await waitFor(() => expect(notifications).toHaveLength(1));
		expect(notifications[0]!.message).toBe('[useBrains] Unknown brain: "$brains.ghost"');
		expect(notifications[0]!.action).toBe('nope');
	});

	it('resolves $sources.*, $vars.* and $outputs.* params, and treats a broken path as not-ready (undefined)', async () => {
		const received: Array<Record<string, unknown>> = [];
		const { params } = setup(
			{
				probe: {
					$brain: 'probe',
					fromSource: '$sources.books.0.title' as never,
					fromVars: '$vars.user.name' as never,
					fromOutputs: '$outputs.picker.id' as never,
					broken: '$vars.user.name.first.x' as never,
				},
			},
			{
				brainRegistry: {
					probe: async p => {
						received.push(p);
					},
				},
				ctx: { $vars: { user: { name: 'Ada' } }, $outputs: { picker: { id: 'p1' } }, $brains: {}, books: [{ title: 'T' }] },
			}
		);
		await waitFor(() => expect(received).toHaveLength(1));
		expect(received[0]).toEqual({ fromSource: 'T', fromVars: 'Ada', fromOutputs: 'p1', broken: undefined });
		expect(params.fetcher).not.toHaveBeenCalled();
	});

	it('a bare $sources reference (no source name) resolves to nothing', async () => {
		const received: Array<Record<string, unknown>> = [];
		// A second, defined reactive param makes the brain fire on mount (all-undefined reactive params would hold it back).
		setup(
			{ probe: { $brain: 'probe', bare: '$sources.' as never, ready: '$vars.a' as never, other: 'literal' as never } },
			{
				brainRegistry: { probe: async p => void received.push(p) },
				ctx: { $vars: { a: 1 }, $outputs: {}, $brains: {} },
			}
		);
		await waitFor(() => expect(received).toHaveLength(1));
		expect(received[0]!['other']).toBe('literal');
		expect(received[0]!['bare']).toBeUndefined();
	});
});
