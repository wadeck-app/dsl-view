import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { createMemoryRouter, RouterProvider as ReactRouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { UrlParamContext } from '../../context/UrlParamContext.js';
import type { UrlParamService } from '../../context/UrlParamContext.js';
import { CompactSelect } from '../controls/CompactSelect.js';
import { PageSizeSelect } from '../controls/PageSizeSelect.js';
import { RouterProvider } from '../navigation/RouterProvider.js';
import { SearchBar } from './SearchBar.js';

// A filter that narrows the result set must not leave `page=3` behind: the page would be empty.
// These tests run through the real RouterProvider, so they cover the actual URL update.
function renderAt(url: string, element: React.ReactElement) {
	const router = createMemoryRouter([{ path: '/history', element: <RouterProvider>{element}</RouterProvider> }], {
		initialEntries: [url],
	});
	const updates: Array<{ search: string; action: string }> = [];
	router.subscribe(state => updates.push({ search: state.location.search, action: state.historyAction }));
	render(<ReactRouterProvider router={router} />);
	return { router, updates };
}

describe('resetUrlParams', () => {
	it('SearchBar: removes page in the same replace update and keeps the other params', () => {
		const { router, updates } = renderAt(
			'/history?page=3&status=failed',
			<SearchBar urlParam="event" resetUrlParams={['page']} debounceMs={0} />
		);
		fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'order' } });
		const params = new URLSearchParams(router.state.location.search);
		expect(params.get('event')).toBe('order');
		expect(params.get('status')).toBe('failed');
		expect(params.has('page')).toBe(false);
		// One navigation, replacing the current entry: no extra history entry, no intermediate URL.
		expect(updates).toHaveLength(1);
		expect(updates[0]!.action).toBe('REPLACE');
	});

	it('CompactSelect: removes every listed param', () => {
		const { router, updates } = renderAt(
			'/history?page=3&cursor=abc&keep=1',
			<CompactSelect
				urlParam="status"
				resetUrlParams={['page', 'cursor']}
				value=""
				options={[{ value: 'failed', label: 'Failed' }]}
				onChange={() => {}}
				ariaLabel="Status"
				placeholder="Any"
			/>
		);
		fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'failed' } });
		const params = new URLSearchParams(router.state.location.search);
		expect(params.get('status')).toBe('failed');
		expect(params.get('keep')).toBe('1');
		expect(params.has('page')).toBe(false);
		expect(params.has('cursor')).toBe(false);
		expect(updates).toHaveLength(1);
		expect(updates[0]!.action).toBe('REPLACE');
	});

	it('PageSizeSelect: removes page when the size changes', () => {
		const { router } = renderAt('/history?page=3', <PageSizeSelect urlParam="size" resetUrlParams={['page']} options={[10, 25]} />);
		fireEvent.change(screen.getByRole('combobox', { name: 'Page size' }), { target: { value: '25' } });
		const params = new URLSearchParams(router.state.location.search);
		expect(params.get('size')).toBe('25');
		expect(params.has('page')).toBe(false);
	});

	it('SearchBar: the clear button also removes page, and empties the param', () => {
		const { router, updates } = renderAt(
			'/history?page=3&event=order&status=failed',
			<SearchBar urlParam="event" resetUrlParams={['page']} debounceMs={0} />
		);
		fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
		const params = new URLSearchParams(router.state.location.search);
		expect(params.get('event') ?? '').toBe('');
		expect(params.get('status')).toBe('failed');
		expect(params.has('page')).toBe(false);
		expect(updates).toHaveLength(1);
	});

	it('SearchBar: follows a url change made elsewhere (back button, link) without writing it back', async () => {
		const { router, updates } = renderAt('/history?event=order', <SearchBar urlParam="event" resetUrlParams={['page']} debounceMs={0} />);
		expect(screen.getByRole('searchbox')).toHaveValue('order');
		await act(async () => {
			await router.navigate('/history?event=refund&page=2');
		});
		expect(screen.getByRole('searchbox')).toHaveValue('refund');
		// The sync is read-only: page=2 stays, the bar did not rewrite the URL by itself.
		expect(new URLSearchParams(router.state.location.search).get('page')).toBe('2');
		expect(updates.every(update => update.action !== 'REPLACE')).toBe(true);
	});

	it('CompactSelect: going back to the empty choice clears the param and still removes page', () => {
		const { router } = renderAt(
			'/history?page=3&status=failed',
			<CompactSelect
				urlParam="status"
				resetUrlParams={['page']}
				value=""
				options={[{ value: 'failed', label: 'Failed' }]}
				onChange={() => {}}
				ariaLabel="Status"
				placeholder="Any"
			/>
		);
		expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('failed');
		fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: '' } });
		const params = new URLSearchParams(router.state.location.search);
		expect(params.get('status') ?? '').toBe('');
		expect(params.has('page')).toBe(false);
	});

	it('without resetUrlParams the other params are untouched (existing behaviour)', () => {
		const { router } = renderAt('/history?page=3', <SearchBar urlParam="event" debounceMs={0} />);
		fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'order' } });
		expect(new URLSearchParams(router.state.location.search).get('page')).toBe('3');
	});

	it('keeps the original set() call shape when no reset is requested', () => {
		const set = vi.fn();
		const service: UrlParamService = { get: () => null, set };
		render(
			<UrlParamContext.Provider value={service}>
				<SearchBar urlParam="q" debounceMs={0} />
			</UrlParamContext.Provider>
		);
		fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'x' } });
		expect(set).toHaveBeenCalledWith('q', 'x', { replace: true });
	});

	it('hands the keys to the host service as opts.remove', () => {
		const set = vi.fn();
		const service: UrlParamService = { get: () => null, set };
		render(
			<UrlParamContext.Provider value={service}>
				<SearchBar urlParam="q" resetUrlParams={['page']} debounceMs={0} />
			</UrlParamContext.Provider>
		);
		fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'x' } });
		expect(set).toHaveBeenCalledWith('q', 'x', { replace: true, remove: ['page'] });
	});

	it('does not rebuild the setter when a new array with the same keys is passed each render', () => {
		const set = vi.fn();
		const service: UrlParamService = { get: () => null, set };
		const { rerender } = render(
			<UrlParamContext.Provider value={service}>
				<SearchBar urlParam="q" resetUrlParams={['page']} debounceMs={0} />
			</UrlParamContext.Provider>
		);
		rerender(
			<UrlParamContext.Provider value={service}>
				<SearchBar urlParam="q" resetUrlParams={['page']} debounceMs={0} />
			</UrlParamContext.Provider>
		);
		act(() => {
			fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'y' } });
		});
		expect(set).toHaveBeenCalledTimes(1);
	});

	describe('invalid configuration fails loudly', () => {
		function expectThrow(element: React.ReactElement, message: RegExp) {
			const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const service: UrlParamService = { get: () => null, set: () => {} };
			expect(() =>
				render(<UrlParamContext.Provider value={service}>{element}</UrlParamContext.Provider>)
			).toThrow(message);
			spy.mockRestore();
		}

		it('rejects the control\'s own urlParam', () => {
			expectThrow(<SearchBar urlParam="q" resetUrlParams={['q']} debounceMs={0} />, /must not contain the control's own urlParam "q"/);
		});

		it('rejects resetUrlParams without urlParam', () => {
			expectThrow(
				<SearchBar value="" onChange={() => {}} resetUrlParams={['page']} />,
				/requires "urlParam"/
			);
		});

		it('rejects non-string or empty entries', () => {
			expectThrow(
				<SearchBar urlParam="q" resetUrlParams={['page', ''] as string[]} debounceMs={0} />,
				/array of non-empty URL param names/
			);
			expectThrow(
				<SearchBar urlParam="q" resetUrlParams={'page' as unknown as string[]} debounceMs={0} />,
				/array of non-empty URL param names/
			);
		});
	});
});
