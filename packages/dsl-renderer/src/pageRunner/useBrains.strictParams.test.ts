import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Notification } from '../notifier.js';
import type { RawBrainSpec } from './brainsTypes.js';
import { useBrains } from './useBrains.js';

const baseCtx = { $vars: {}, $outputs: {}, $brains: {} };

function setup($brains: Record<string, RawBrainSpec>, overrides: Partial<Parameters<typeof useBrains>[0]> = {}) {
	const notifications: Notification[] = [];
	const params = {
		$brains,
		ctx: baseCtx,
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

describe('$http brains: strictParams', () => {
	it('keeps the lenient default: values are substituted as given (already encoded values stay as they are)', async () => {
		const { params } = setup({ del: { $brain: '$brains.$http.delete', url: '/api/items/{name}', name: 'a%20b' } });
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledTimes(1));
		expect(params.fetcher).toHaveBeenCalledWith('/api/items/a%20b', undefined, undefined, undefined);
	});

	it('percent-encodes every substituted value when strictParams is true', async () => {
		const { params } = setup({ del: { $brain: '$brains.$http.delete', url: '/api/items/{name}', name: 'a b/c?d#e', strictParams: true } });
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledTimes(1));
		expect(params.fetcher).toHaveBeenCalledWith('/api/items/a%20b%2Fc%3Fd%23e', undefined, undefined, undefined);
	});

	it('fails before any request on a placeholder without a value, naming the brain, the key and what was available', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { params, result, notifications } = setup(
			{ del: { $brain: '$brains.$http.delete', url: '/api/items/{id}', other: 'x', strictParams: true } },
			{ routeParams: { wid: 'W1' } }
		);
		await waitFor(() => expect((result.current.brainResults['del'] as { $error: string | null }).$error).not.toBeNull());
		expect(params.fetcher).not.toHaveBeenCalled();
		const message = (result.current.brainResults['del'] as { $error: string }).$error;
		expect(message).toContain('del');
		expect(message).toContain('{id}');
		expect(message).toContain('/api/items/{id}');
		expect(message).toContain('available: wid, other');
		expect(notifications).toHaveLength(1);
		expect(notifications[0]).toMatchObject({ kind: 'error', action: 'del' });
	});

	it('treats an empty string like a missing value in strict mode', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { params, result } = setup({ del: { $brain: '$brains.$http.delete', url: '/api/items/{id}', id: '', strictParams: true } });
		await waitFor(() => expect((result.current.brainResults['del'] as { $error: string | null }).$error).not.toBeNull());
		expect(params.fetcher).not.toHaveBeenCalled();
	});

	it('does not hand strictParams to the brain as a parameter (registry brains and URL placeholders never see it)', async () => {
		const seen: Array<Record<string, unknown>> = [];
		setup({ probe: { $brain: 'probe', strictParams: true, kept: 'k' } }, { brainRegistry: { probe: async p => void seen.push(p) } });
		await waitFor(() => expect(seen).toHaveLength(1));
		expect(seen[0]).toStrictEqual({ kept: 'k' });
	});

	it('route params still fill a placeholder in strict mode, and a brain param still wins over a route param', async () => {
		const { params } = setup(
			{ get: { $brain: '$brains.$http.get', url: '/w/{wid}/jobs/{id}', id: 'j 1', strictParams: true } },
			{ routeParams: { wid: 'W1', id: 'fromRoute' } }
		);
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledTimes(1));
		expect(params.fetcher).toHaveBeenCalledWith('/w/W1/jobs/j%201', undefined, undefined, undefined);
	});
});

describe('$ctx.navigate: strictParams', () => {
	const realLocation = Object.getOwnPropertyDescriptor(window, 'location')!;
	function fakeLocation() {
		Object.defineProperty(window, 'location', { value: { href: 'unchanged' }, writable: true, configurable: true });
	}
	afterEach(() => {
		Object.defineProperty(window, 'location', realLocation);
	});

	it('encodes the substituted values when strictParams is true, and not by default', async () => {
		fakeLocation();
		setup({ go: { $brain: '$brains.$ctx.navigate', to: '/files/{name}', name: 'a b/c', strictParams: true } });
		await waitFor(() => expect(window.location.href).toBe('/files/a%20b%2Fc'));
		fakeLocation();
		setup({ go: { $brain: '$brains.$ctx.navigate', to: '/files/{name}', name: 'a b/c' } });
		await waitFor(() => expect(window.location.href).toBe('/files/a b/c'));
	});

	it('does not navigate on a missing placeholder in strict mode and publishes the error', async () => {
		fakeLocation();
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const { result } = setup({ go: { $brain: '$brains.$ctx.navigate', to: '/jobs/{id}', strictParams: true } });
		await waitFor(() => expect((result.current.brainResults['go'] as { $error: string | null }).$error).toContain('{id}'));
		expect(window.location.href).toBe('unchanged');
	});
});

describe('$chain: strictParams and the step id', () => {
	it('lets a chain-level strictParams apply to every step and a step override it', async () => {
		const { params } = setup({
			flow: {
				strictParams: true,
				$chain: [
					{ id: 'a', $brain: '$brains.$http.get', url: '/x/{v}', v: 'p q' },
					{ id: 'b', $brain: '$brains.$http.get', url: '/y/{v}', v: 'p q', strictParams: false },
				],
			} as never,
		});
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledTimes(2));
		expect(params.fetcher).toHaveBeenNthCalledWith(1, '/x/p%20q', undefined, undefined, undefined);
		expect(params.fetcher).toHaveBeenNthCalledWith(2, '/y/p q', undefined, undefined, undefined);
	});

	it('does not hand strictParams to a registry brain of a step', async () => {
		const seen: Array<Record<string, unknown>> = [];
		setup(
			{ flow: { $chain: [{ id: 's', $brain: 'probe', strictParams: true, kept: 1 }] } as never },
			{ brainRegistry: { probe: async p => void seen.push(p) } }
		);
		await waitFor(() => expect(seen).toHaveLength(1));
		expect(seen[0]).toStrictEqual({ id: 's', kept: 1 });
	});

	it('never lets the step id shadow a URL {id} placeholder of a built-in $http step: the route param fills it', async () => {
		const { params } = setup(
			{ flow: { $chain: [{ id: 'fetch', $brain: '$brains.$http.get', url: '/api/jobs/{id}' }] } as never },
			{ routeParams: { id: '7' } }
		);
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledTimes(1));
		expect(params.fetcher).toHaveBeenCalledWith('/api/jobs/7', undefined, undefined, undefined);
	});

	it('reports {id} as missing (instead of sending the step id) when nothing provides it', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { params } = setup({ flow: { $chain: [{ id: 'fetch', $brain: '$brains.$http.get', url: '/api/jobs/{id}' }] } as never });
		await waitFor(() => expect(params.fetcher).toHaveBeenCalledTimes(1));
		expect(params.fetcher).toHaveBeenCalledWith('/api/jobs/', undefined, undefined, undefined);
		expect(warn).toHaveBeenCalledWith('[useBrains] $brains.$http.get: URL placeholder {id} has no value in "/api/jobs/{id}", substituting an empty string.');
	});
});
