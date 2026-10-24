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

	it('navigate pushes the path and back goes back one entry', () => {
		const t = setup();
		act(() => t.services.router.navigate('/other'));
		expect(t.router.state.location.pathname).toBe('/other');
		act(() => t.services.router.back());
		expect(t.router.state.location.pathname).toBe('/list');
	});
});
