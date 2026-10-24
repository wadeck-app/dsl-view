import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Notification } from '../notifier.js';
import { useBrains } from './useBrains.js';
import type { RawBrainSpec } from './brainsTypes.js';

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

describe('$brains.$ctx.navigate', () => {
	const realLocation = Object.getOwnPropertyDescriptor(window, 'location')!;
	function fakeLocation() {
		Object.defineProperty(window, 'location', { value: { href: 'unchanged' }, writable: true, configurable: true });
	}
	afterEach(() => {
		Object.defineProperty(window, 'location', realLocation);
	});

	it('fills {placeholders} from the brain params and the route params, and never from to / route / _event', async () => {
		fakeLocation();
		setup(
			{ go: { $brain: '$brains.$ctx.navigate', to: '/w/{wid}/jobs/{id}', id: 'j1', _event: 'e', route: 'ignored' } },
			{ routeParams: { wid: 'W1' } }
		);
		await waitFor(() => expect(window.location.href).toBe('/w/W1/jobs/j1'));
	});

	it('prefers a brain param over a route param of the same name', async () => {
		fakeLocation();
		setup({ go: { $brain: '$brains.$ctx.navigate', to: '/jobs/{id}', id: 'fromBrain' } }, { routeParams: { id: 'fromRoute' } });
		await waitFor(() => expect(window.location.href).toBe('/jobs/fromBrain'));
	});

	it('uses `route` when `to` is absent and prefers `to` when both are given', async () => {
		fakeLocation();
		setup({ go: { $brain: '$brains.$ctx.navigate', route: '/via-route' } });
		await waitFor(() => expect(window.location.href).toBe('/via-route'));
		fakeLocation();
		setup({ go: { $brain: '$brains.$ctx.navigate', to: '/via-to', route: '/via-route' } });
		await waitFor(() => expect(window.location.href).toBe('/via-to'));
	});

	it('does not navigate, and says why, when neither `to` nor `route` is given (or the value is empty)', async () => {
		fakeLocation();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { result } = setup({ go: { $brain: '$brains.$ctx.navigate' }, goEmpty: { $brain: '$brains.$ctx.navigate', to: '' } });
		await waitFor(() => expect(result.current.brainResults['go']).toStrictEqual({ $pending: false, $error: null }));
		await waitFor(() => expect(result.current.brainResults['goEmpty']).toStrictEqual({ $pending: false, $error: null }));
		expect(window.location.href).toBe('unchanged');
		const message = '[useBrains] $brains.$ctx.navigate has no "to" (or "route"): there is nowhere to navigate to. Set one in the brain.';
		expect(warn.mock.calls.filter(call => call[0] === message)).toHaveLength(2);
	});

	it('warns about a placeholder without a value (a null param counts as missing) and still navigates', async () => {
		fakeLocation();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		setup({ go: { $brain: '$brains.$ctx.navigate', to: '/jobs/{id}', id: null as never } });
		await waitFor(() => expect(window.location.href).toBe('/jobs/'));
		expect(warn).toHaveBeenCalledWith('[useBrains] $brains.$ctx.navigate: URL placeholder {id} has no value in "/jobs/{id}", substituting an empty string.');
	});
});

describe('$chain parameter references', () => {
	it('resolves $chain.<param> from the brain params and $chain.<step>.<field> from an earlier step output', async () => {
		const seen: Array<Record<string, unknown>> = [];
		const probe = async (p: Record<string, unknown>) => {
			seen.push(p);
			return { id: 'created-1', other: 'x' };
		};
		setup(
			{
				flow: {
					seed: 'S',
					$chain: [
						{ id: 'first', $brain: 'probe', $outputs: ['id'] },
						{ id: 'second', $brain: 'probe', fromSeed: '$chain.seed', fromStep: '$chain.first.id', literal: 'L' },
					],
				} as never,
			},
			{ brainRegistry: { probe } }
		);
		await waitFor(() => expect(seen).toHaveLength(2));
		// A registry brain still receives the step id with the other params (built-in $http / navigate steps do not: see useBrains.strictParams.test.ts).
		expect(seen[1]).toEqual({ id: 'second', fromSeed: 'S', fromStep: 'created-1', literal: 'L' });
	});

	it('only keeps the declared $outputs fields of a step', async () => {
		const seen: Array<Record<string, unknown>> = [];
		const probe = async (p: Record<string, unknown>) => {
			seen.push(p);
			return { id: 'a', secret: 'b' };
		};
		setup(
			{
				flow: {
					$chain: [
						{ id: 'first', $brain: 'probe', $outputs: ['id'] },
						{ id: 'second', $brain: 'probe', leaked: '$chain.first.secret' },
					],
				} as never,
			},
			{ brainRegistry: { probe } }
		);
		await waitFor(() => expect(seen).toHaveLength(2));
		expect(seen[1]).toEqual({ id: 'second', leaked: undefined });
	});
});

describe('$reload after a brain', () => {
	it('keeps the other vars when a setVar brain reloads, adding the new value', async () => {
		const loadSources = vi.fn().mockResolvedValue(undefined);
		const invalidate = vi.fn();
		setup(
			{ pick: { $brain: '$brains.$ctx.setVar', varName: 'b', value: 2, $reload: ['rows'] } },
			{ loadSources, invalidateSourceCache: invalidate, ctx: { $vars: { a: 1 }, $outputs: {}, $brains: {} } as never }
		);
		await waitFor(() => expect(loadSources).toHaveBeenCalledTimes(1));
		const passed = loadSources.mock.calls[0]![1] as { $vars: Record<string, unknown> };
		expect(passed.$vars).toEqual({ a: 1, b: 2 });
		expect(invalidate).toHaveBeenCalledWith('rows');
		expect(loadSources.mock.calls[0]![2]).toEqual(new Set(['rows']));
		expect(loadSources.mock.calls[0]![3]).toBe(true);
	});

	it('works when the page declares no $vars at all', async () => {
		const loadSources = vi.fn().mockResolvedValue(undefined);
		setup(
			{ pick: { $brain: '$brains.$ctx.setVar', varName: 'b', value: 2, $reload: ['rows'] } },
			{ loadSources, ctx: { $outputs: {}, $brains: {} } as never }
		);
		await waitFor(() => expect(loadSources).toHaveBeenCalledTimes(1));
		expect((loadSources.mock.calls[0]![1] as { $vars: unknown }).$vars).toEqual({ b: 2 });
	});

	it('does not touch the vars for any other brain, and reloads nothing for a setVar brain without $reload', async () => {
		const loadSources = vi.fn().mockResolvedValue(undefined);
		const { params } = setup(
			{
				other: { $brain: 'noop', $reload: ['rows'] },
				plain: { $brain: '$brains.$ctx.setVar', varName: 'b', value: 2 },
			},
			{ loadSources, brainRegistry: { noop: async () => ({}) }, ctx: { $vars: { a: 1 }, $outputs: {}, $brains: {} } as never }
		);
		await waitFor(() => expect(loadSources).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(params.setVar).toHaveBeenCalledWith('b', 2));
		expect((loadSources.mock.calls[0]![1] as { $vars: Record<string, unknown> }).$vars).toStrictEqual({ a: 1 });
		expect(loadSources).toHaveBeenCalledTimes(1);
	});

	it('a chain reloads the listed sources, invalidating each, with the cache bypassed', async () => {
		const loadSources = vi.fn().mockResolvedValue(undefined);
		const invalidate = vi.fn();
		setup(
			{ flow: { $chain: [{ id: 's', $brain: 'noop' }], $reload: ['a', 'b'] } as never },
			{ loadSources, invalidateSourceCache: invalidate, brainRegistry: { noop: async () => ({}) } }
		);
		await waitFor(() => expect(loadSources).toHaveBeenCalledTimes(1));
		expect(invalidate.mock.calls.map(c => c[0])).toEqual(['a', 'b']);
		expect(loadSources.mock.calls[0]![2]).toEqual(new Set(['a', 'b']));
		expect(loadSources.mock.calls[0]![3]).toBe(true);
	});
});

describe('brain status and notifications', () => {
	it('exposes $pending while running and clears it after, with $error null', async () => {
		let release!: () => void;
		const slow = () =>
			new Promise<void>(resolve => {
				release = resolve;
			});
		const { result } = setup({ job: { $brain: 'slow' } }, { brainRegistry: { slow } });
		await waitFor(() => expect(result.current.brainResults['job']).toEqual({ $pending: true, $error: null }));
		release();
		await waitFor(() => expect(result.current.brainResults['job']).toEqual({ $pending: false, $error: null }));
	});

	it('always notifies a failure: the retired $notify key (true or false) does not silence it and is reported once', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const failing = async () => {
			throw new Error('nope');
		};
		const { notifications } = setup(
			{
				defaultOn: { $brain: 'failing' },
				explicitOn: { $brain: 'failing', $notify: true } as never,
				off: { $brain: 'failing', $notify: false } as never,
			},
			{ brainRegistry: { failing } }
		);
		await waitFor(() => expect(notifications).toHaveLength(3));
		expect(notifications.map(n => n.action).sort()).toEqual(['defaultOn', 'explicitOn', 'off']);
		expect(notifications.every(n => n.kind === 'error' && n.message === 'nope')).toBe(true);
		// One warning per brain that still carries the key, naming the brain and the reason; none for the brain without it.
		const warned = consoleWarn.mock.calls.map(call => String(call[0])).filter(text => text.includes('$notify'));
		expect(warned).toHaveLength(2);
		expect(warned.some(text => text.includes('"off"') && text.includes('always'))).toBe(true);
		expect(warned.some(text => text.includes('"explicitOn"'))).toBe(true);
		expect(warned.some(text => text.includes('"defaultOn"'))).toBe(false);
	});

	it('does not break when a brain fails and the host gave no notifier', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failing = async () => {
			throw new Error('nope');
		};
		const { result } = setup({ job: { $brain: 'failing' } }, { brainRegistry: { failing }, notify: undefined });
		await waitFor(() => expect((result.current.brainResults['job'] as { $error: string }).$error).toBe('nope'));
	});

	it('a path through a null value is "not ready", not a crash', async () => {
		const seen: Array<Record<string, unknown>> = [];
		setup(
			{ probe: { $brain: 'probe', viaNull: '$vars.user.name' as never, ready: '$vars.a' as never } },
			{ brainRegistry: { probe: async p => void seen.push(p) }, ctx: { $vars: { user: null, a: 1 }, $outputs: {}, $brains: {} } as never }
		);
		await waitFor(() => expect(seen).toHaveLength(1));
		expect(seen[0]).toEqual({ viaNull: undefined, ready: 1 });
	});
});
