import { act, render } from '@testing-library/react';
import React, { useContext } from 'react';
import { createMemoryRouter, RouterProvider as ReactRouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RouterContext } from '@dsl-ui/RouterContext.js';
import type { RouterService } from '@dsl-ui/RouterContext.js';
import { UrlParamContext } from '@dsl-ui/context/UrlParamContext.js';
import type { UrlParamService } from '@dsl-ui/context/UrlParamContext.js';
import { RouterProvider } from './RouterProvider.js';

// Captures the services RouterProvider hands to the tree so the tests can call them directly.
function Probe({ onServices }: { onServices: (services: { url: UrlParamService; router: RouterService }) => void }) {
	const url = useContext(UrlParamContext)!;
	const router = useContext(RouterContext)!;
	onServices({ url, router });
	return null;
}

function setup(initialEntries: string[] = ['/list?page=3&status=failed']) {
	const router = createMemoryRouter(
		[
			{ path: '/list', element: <RouterProvider><Probe onServices={s => (services = s)} /></RouterProvider> },
			{ path: '/other', element: <RouterProvider><Probe onServices={s => (services = s)} /></RouterProvider> },
		],
		{ initialEntries }
	);
	let services!: { url: UrlParamService; router: RouterService };
	const actions: string[] = [];
	router.subscribe(state => actions.push(state.historyAction));
	render(<ReactRouterProvider router={router} />);
	return { router, actions, get services() { return services; } };
}

describe('RouterProvider', () => {
	it('exposes the current search params through the UrlParamService', () => {
		const { services } = setup();
		expect(services.url.get('page')).toBe('3');
		expect(services.url.get('missing')).toBeNull();
	});

	it('set without options pushes a new history entry (replace defaults to false)', () => {
		const t = setup();
		act(() => t.services.url.set('status', 'ok'));
		expect(t.actions).toEqual(['PUSH']);
		expect(new URLSearchParams(t.router.state.location.search).get('status')).toBe('ok');
	});

	it('set with replace: true replaces the current entry', () => {
		const t = setup();
		act(() => t.services.url.set('status', 'ok', { replace: true }));
		expect(t.actions).toEqual(['REPLACE']);
	});

	it('set with replace: false pushes', () => {
		const t = setup();
		act(() => t.services.url.set('status', 'ok', { replace: false }));
		expect(t.actions).toEqual(['PUSH']);
	});

	it('keeps the other params and writes the key', () => {
		const t = setup();
		act(() => t.services.url.set('event', 'order'));
		const params = new URLSearchParams(t.router.state.location.search);
		expect(Object.fromEntries(params)).toEqual({ page: '3', status: 'failed', event: 'order' });
	});

	it('deletes the `remove` keys in the same update, keeps the rest and ignores keys that are absent', () => {
		const t = setup();
		act(() => t.services.url.set('event', 'order', { replace: true, remove: ['page', 'not-there'] }));
		expect(t.actions).toEqual(['REPLACE']);
		expect(Object.fromEntries(new URLSearchParams(t.router.state.location.search))).toEqual({ status: 'failed', event: 'order' });
	});

	it('an empty `remove` list changes nothing but the written key', () => {
		const t = setup();
		act(() => t.services.url.set('event', 'order', { remove: [] }));
		expect(Object.fromEntries(new URLSearchParams(t.router.state.location.search))).toEqual({ page: '3', status: 'failed', event: 'order' });
	});

	// react-router computes a functional setSearchParams update from the params of the last RENDER, not from the
	// latest write, so two writes in one tick used to start from the same stale base and the second erased the
	// first (the wdrive logs page lost `live=true` against its `date` and `size` writes).
	describe('writes in the same tick compose', () => {
		function paramsOf(t: ReturnType<typeof setup>) {
			return Object.fromEntries(new URLSearchParams(t.router.state.location.search));
		}

		it('two set() calls on different keys both end up in the URL, in order', async () => {
			const t = setup(['/list?status=failed']);
			await act(async () => {
				t.services.url.set('date', '2026-10-24', { replace: true });
				t.services.url.set('size', '50', { replace: true });
				t.services.url.set('live', 'true', { replace: true });
			});
			expect(paramsOf(t)).toEqual({ status: 'failed', date: '2026-10-24', size: '50', live: 'true' });
		});

		it('a later write to the same key wins over the earlier one', async () => {
			const t = setup(['/list']);
			await act(async () => {
				t.services.url.set('size', '10');
				t.services.url.set('size', '25');
			});
			expect(paramsOf(t)).toEqual({ size: '25' });
		});

		it('a `remove` of one write also removes what an earlier write of the same tick added', async () => {
			const t = setup(['/list?page=3']);
			await act(async () => {
				t.services.url.set('event', 'order', { remove: ['page'] });
				t.services.url.set('status', 'failed', { remove: ['event'] });
			});
			expect(paramsOf(t)).toEqual({ status: 'failed' });
		});

		it('keeps the history action of each write (replace, then push)', async () => {
			const t = setup(['/list']);
			await act(async () => {
				t.services.url.set('a', '1', { replace: true });
				t.services.url.set('b', '2', { replace: false });
			});
			expect(paramsOf(t)).toEqual({ a: '1', b: '2' });
			expect(t.actions).toContain('REPLACE');
			expect(t.actions).toContain('PUSH');
		});

		it('a write after a committed navigation starts from the new location, not from the earlier writes', async () => {
			const t = setup(['/list?status=failed']);
			await act(async () => {
				t.services.url.set('a', '1', { replace: true });
			});
			await act(async () => {
				await t.router.navigate('/list?fresh=yes');
			});
			await act(async () => {
				t.services.url.set('b', '2', { replace: true });
			});
			expect(paramsOf(t)).toEqual({ fresh: 'yes', b: '2' });
		});

		it('a write in the same tick as a navigation to another page is applied on top of what the navigation set up', async () => {
			const t = setup(['/list?status=failed']);
			await act(async () => {
				t.services.url.set('a', '1', { replace: true });
				await t.router.navigate('/other?x=1');
			});
			await act(async () => {
				t.services.url.set('b', '2', { replace: true });
			});
			expect(t.router.state.location.pathname).toBe('/other');
			expect(paramsOf(t).x).toBe('1');
			expect(paramsOf(t).b).toBe('2');
		});
	});

	it('keeps the RouterContext value identity across re-renders of its parent', () => {
		const seen: RouterService[] = [];
		function Parent() {
			const [, setTick] = React.useState(0);
			return (
				<RouterProvider>
					<button type="button" onClick={() => setTick(t => t + 1)}>tick</button>
					<Probe onServices={s => seen.push(s.router)} />
				</RouterProvider>
			);
		}
		const router = createMemoryRouter([{ path: '/', element: <Parent /> }], { initialEntries: ['/'] });
		const view = render(<ReactRouterProvider router={router} />);
		act(() => view.getByText('tick').click());
		expect(seen.length).toBeGreaterThan(1);
		expect(new Set(seen).size).toBe(1);
	});

	// `navigate` and `back` return the router's promise: a sync `act` handed that promise becomes an async act that
	// nobody awaits, which leaves React's act queue open and silently breaks every later render in the worker
	// (the next tests then see no component at all, only under a shuffled order). Await it.
	it('navigate pushes the path and back goes back one entry', async () => {
		const t = setup();
		await act(async () => {
			await t.services.router.navigate('/other');
		});
		expect(t.router.state.location.pathname).toBe('/other');
		await act(async () => {
			await t.services.router.back();
		});
		expect(t.router.state.location.pathname).toBe('/list');
	});
});
