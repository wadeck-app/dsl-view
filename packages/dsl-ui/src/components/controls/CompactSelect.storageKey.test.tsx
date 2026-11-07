import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider as ReactRouterProvider } from 'react-router-dom';

import { CompactSelect, type CompactSelectProps } from './CompactSelect.js';
import { RouterProvider } from '../navigation/RouterProvider.js';

/*
 * `storageKey` remembers the choice of a URL-backed select in localStorage (raw option value, under exactly that key).
 * Precedence: URL param > localStorage > defaultValue. The URL stays what the page's sources read, so a restore writes it.
 * test-setup.ts clears localStorage, the URL and the once-only reports after every test.
 */

const KEY = 'toolbar.range';
const RANGES = [
	{ value: '1M', label: '1 month' },
	{ value: '6M', label: '6 months' },
	{ value: '1Y', label: '1 year' },
];

type Props = Partial<CompactSelectProps>;
const base = (props: Props = {}): CompactSelectProps => ({
	urlParam: 'range',
	storageKey: KEY,
	value: '',
	options: RANGES,
	onChange: () => {},
	ariaLabel: 'Period',
	...props,
});

function renderAt(url: string, props: Props = {}) {
	const router = createMemoryRouter([{ path: '/p', element: <RouterProvider><CompactSelect {...base(props)} /></RouterProvider> }], {
		initialEntries: [url],
	});
	const updates: Array<{ search: string; action: string }> = [];
	router.subscribe(state => updates.push({ search: state.location.search, action: state.historyAction }));
	const view = render(<ReactRouterProvider router={router} />);
	return { router, updates, ...view };
}

const select = () => screen.getByRole('combobox', { name: 'Period' });
// react-router keeps its own bookkeeping in sessionStorage (same Storage.prototype): only calls for another key count.
const keysOf = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map(c => c[0]).filter(k => k !== 'remix-router-transitions');
const warnSpy = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

function storageEvent(init: StorageEventInit) {
	act(() => {
		window.dispatchEvent(new StorageEvent('storage', { storageArea: localStorage, ...init }));
	});
}

describe('precedence: URL param > localStorage > defaultValue', () => {
	it.each([
		// [name, url, stored, default, shown, url after, stored after]
		['the URL wins over the stored value and the default', '/p?range=1Y', '1M', '6M', '1Y', '?range=1Y', '1Y'],
		['the stored value wins over the default and is written to the URL', '/p', '1M', '6M', '1M', '?range=1M', '1M'],
		['the stored value is used without a default', '/p', '1M', undefined, '1M', '?range=1M', '1M'],
		['the default is displayed when nothing is stored, and the URL stays empty', '/p', null, '6M', '6M', '', null],
		['the stored value equal to the default is displayed and the URL stays empty', '/p', '6M', '6M', '6M', '', '6M'],
		['the first option shows when there is no URL value, no stored value and no default', '/p', null, undefined, '1M', '', null],
	])('%s', (_name, url, stored, defaultValue, shown, urlAfter, storedAfter) => {
		if (stored !== null) {
			localStorage.setItem(KEY, stored);
		}
		const { router } = renderAt(url, { defaultValue });
		expect(select()).toHaveValue(shown);
		expect(router.state.location.search).toBe(urlAfter);
		expect(localStorage.getItem(KEY)).toBe(storedAfter);
	});

	it('the placeholder shows when nothing is stored and there is no default', () => {
		renderAt('/p', { placeholder: 'Any period' });
		expect(select()).toHaveValue('');
		expect(localStorage.getItem(KEY)).toBeNull();
	});
});

describe('restoring the stored value', () => {
	it('writes the URL once, with replace, keeping the other params', () => {
		localStorage.setItem(KEY, '1Y');
		const { router, updates } = renderAt('/p?keep=1&page=3', { defaultValue: '6M' });

		const params = new URLSearchParams(router.state.location.search);
		expect(params.get('range')).toBe('1Y');
		expect(params.get('keep')).toBe('1');
		expect(params.get('page')).toBe('3');
		expect(updates).toHaveLength(1);
		expect(updates[0]!.action).toBe('REPLACE');
		expect(select()).toHaveValue('1Y');
	});

	it('writes nothing when the stored value equals the default', () => {
		localStorage.setItem(KEY, '6M');
		const { updates } = renderAt('/p?keep=1', { defaultValue: '6M' });
		expect(updates).toHaveLength(0);
	});

	it('writes nothing when the URL already carries a value', () => {
		localStorage.setItem(KEY, '1M');
		const { updates } = renderAt('/p?range=1Y');
		expect(updates).toHaveLength(0);
	});

	it('makes an explicit URL value the stored choice', () => {
		localStorage.setItem(KEY, '1M');
		renderAt('/p?range=1Y');
		expect(localStorage.getItem(KEY)).toBe('1Y');
	});

	// A present but empty param is a choice (the placeholder): shown, not replaced by the stored value, and the stored
	// value is forgotten rather than kept to come back later. The empty text itself is never stored.
	it('an empty URL param is the placeholder choice: no restore, and the stored entry is removed', () => {
		localStorage.setItem(KEY, '1M');
		const { router, updates } = renderAt('/p?range=', { placeholder: 'Any period', defaultValue: '6M' });
		expect(select()).toHaveValue('');
		expect(router.state.location.search).toBe('?range=');
		expect(updates).toHaveLength(0);
		expect(localStorage.getItem(KEY)).toBeNull();
	});

	it('a URL value that is not an option is shown as Unknown and is not stored; the entry stays', () => {
		localStorage.setItem(KEY, '1M');
		renderAt('/p?range=2Y');
		expect(screen.getByRole('option', { name: 'Unknown: 2Y' })).toHaveProperty('selected', true);
		expect(localStorage.getItem(KEY)).toBe('1M');
	});

	it('shows Unknown for a restored value once the options no longer carry it', () => {
		localStorage.setItem(KEY, '1M');
		let setOptions: (o: typeof RANGES) => void = () => {};
		function Harness() {
			const [options, set] = useState(RANGES);
			setOptions = set;
			return <CompactSelect {...base({ options })} />;
		}
		const router = createMemoryRouter([{ path: '/p', element: <RouterProvider><Harness /></RouterProvider> }], { initialEntries: ['/p'] });
		render(<ReactRouterProvider router={router} />);
		expect(select()).toHaveValue('1M');

		act(() => setOptions(RANGES.filter(o => o.value !== '1M')));

		expect(screen.getByRole('option', { name: 'Unknown: 1M' })).toHaveProperty('selected', true);
	});

	it('waits for options that load later: no report while the list is empty, then the restore happens', () => {
		localStorage.setItem(KEY, '1Y');
		const warn = warnSpy();
		let setOptions: (o: typeof RANGES) => void = () => {};
		function Harness() {
			const [options, set] = useState<typeof RANGES>([]);
			setOptions = set;
			return <CompactSelect {...base({ options })} />;
		}
		const router = createMemoryRouter([{ path: '/p', element: <RouterProvider><Harness /></RouterProvider> }], { initialEntries: ['/p'] });
		render(<ReactRouterProvider router={router} />);
		expect(warn).not.toHaveBeenCalled();
		expect(router.state.location.search).toBe('');

		act(() => setOptions(RANGES));

		expect(router.state.location.search).toBe('?range=1Y');
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('a stored value that is not an option', () => {
	it('is reported once naming the key, kept in place, and the select shows the default', () => {
		localStorage.setItem(KEY, 'gone');
		const warn = warnSpy();
		const { router, updates } = renderAt('/p', { defaultValue: '6M' });

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain(`"${KEY}"`);
		expect(warn.mock.calls[0]![0]).toContain('"gone"');
		expect(warn.mock.calls[0]![0]).toContain('1M, 6M, 1Y');
		expect(localStorage.getItem(KEY)).toBe('gone');
		expect(select()).toHaveValue('6M');
		expect(updates).toHaveLength(0);
		expect(router.state.location.search).toBe('');
		expect(screen.queryByRole('option', { name: /^Unknown/ })).toBeNull();

		// Another render, and a second select with the same mistake, do not repeat it.
		fireEvent.change(select(), { target: { value: '6M' } });
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('shows the placeholder when there is no default', () => {
		localStorage.setItem(KEY, 'gone');
		warnSpy();
		renderAt('/p', { placeholder: 'Any period' });
		expect(select()).toHaveValue('');
	});

	it('picking an option replaces the entry', () => {
		localStorage.setItem(KEY, 'gone');
		warnSpy();
		renderAt('/p');
		fireEvent.change(select(), { target: { value: '1Y' } });
		expect(localStorage.getItem(KEY)).toBe('1Y');
	});

	it('is reported again for another value', () => {
		const warn = warnSpy();
		localStorage.setItem(KEY, 'gone');
		const first = renderAt('/p');
		first.unmount();
		localStorage.setItem(KEY, 'gone too');
		renderAt('/p');
		expect(warn).toHaveBeenCalledTimes(2);
	});

	it('an empty stored text is no choice: not reported, not restored', () => {
		localStorage.setItem(KEY, '');
		const warn = warnSpy();
		const { updates } = renderAt('/p', { placeholder: 'Any period' });
		expect(warn).not.toHaveBeenCalled();
		expect(updates).toHaveLength(0);
		expect(select()).toHaveValue('');
	});
});

describe('a localStorage that throws', () => {
	it('is reported once and the select keeps working from the URL alone', () => {
		const denied = new Error('denied by the browser');
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw denied; });
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw denied; });
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw denied; });
		const warn = warnSpy();
		const { router } = renderAt('/p?range=1Y', { defaultValue: '6M' });

		expect(select()).toHaveValue('1Y');
		fireEvent.change(select(), { target: { value: '1M' } });
		expect(router.state.location.search).toBe('?range=1M');
		expect(select()).toHaveValue('1M');
		fireEvent.change(select(), { target: { value: '' } });

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain(`"${KEY}"`);
		expect(warn.mock.calls[0]![0]).toContain('denied by the browser');
	});

	it('a read that throws leaves the default in place and writes no URL', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
		warnSpy();
		const { updates } = renderAt('/p', { defaultValue: '6M' });
		expect(select()).toHaveValue('6M');
		expect(updates).toHaveLength(0);
	});
});

describe('no localStorage at all', () => {
	let afterTest = () => {};
	afterEach(() => afterTest());
	it('renders from the URL and the default, without a report', () => {
		const getter = vi.spyOn(window, 'localStorage', 'get').mockReturnValue(undefined as unknown as Storage);
		// Restored here, not left to restoreMocks: test-setup.ts clears localStorage in an afterEach that may run first.
		afterTest = () => getter.mockRestore();
		const warn = warnSpy();
		const { router } = renderAt('/p', { defaultValue: '6M' });
		expect(select()).toHaveValue('6M');
		fireEvent.change(select(), { target: { value: '1Y' } });
		expect(router.state.location.search).toBe('?range=1Y');
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('another tab', () => {
	it('a storage event with an option updates the select and the URL (replace)', () => {
		const { router, updates } = renderAt('/p?range=1M&keep=1');
		storageEvent({ key: KEY, newValue: '1Y' });

		expect(select()).toHaveValue('1Y');
		const params = new URLSearchParams(router.state.location.search);
		expect(params.get('range')).toBe('1Y');
		expect(params.get('keep')).toBe('1');
		expect(updates.at(-1)!.action).toBe('REPLACE');
	});

	it('does not write the received value back to the storage (no echo between tabs)', () => {
		renderAt('/p?range=1M');
		const setItem = vi.spyOn(Storage.prototype, 'setItem');
		localStorage.setItem(KEY, '1Y');
		setItem.mockClear();
		storageEvent({ key: KEY, newValue: '1Y' });
		expect(keysOf(setItem)).toStrictEqual([]);
		expect(localStorage.getItem(KEY)).toBe('1Y');
	});

	it('a value arriving while the URL has none is restored like a stored one', () => {
		const { router } = renderAt('/p', { defaultValue: '6M' });
		localStorage.setItem(KEY, '1Y');
		storageEvent({ key: KEY, newValue: '1Y' });
		expect(select()).toHaveValue('1Y');
		expect(router.state.location.search).toBe('?range=1Y');
	});

	it('ignores another key, a removal, and another storage area', () => {
		const { updates } = renderAt('/p?range=1M');
		const before = updates.length;
		storageEvent({ key: 'other', newValue: '1Y' });
		storageEvent({ key: KEY, newValue: null });
		act(() => {
			window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: '1Y', storageArea: sessionStorage }));
		});
		expect(select()).toHaveValue('1M');
		expect(updates).toHaveLength(before);
	});

	it('a value that is not an option is reported and does not change the select', () => {
		const warn = warnSpy();
		const { updates } = renderAt('/p?range=1M');
		const before = updates.length;
		storageEvent({ key: KEY, newValue: 'gone' });
		expect(select()).toHaveValue('1M');
		expect(updates).toHaveLength(before);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain('"gone"');
	});

	it('stops listening on unmount', () => {
		const removeListener = vi.spyOn(window, 'removeEventListener');
		const { router, unmount } = renderAt('/p?range=1M');
		unmount();

		expect(removeListener.mock.calls.filter(([type]) => type === 'storage')).toHaveLength(1);
		const before = router.state.location.search;
		storageEvent({ key: KEY, newValue: '1Y' });
		expect(router.state.location.search).toBe(before);
	});
});

describe('a user change', () => {
	it('writes the URL and the localStorage, as the raw option value under exactly the key', () => {
		const { router } = renderAt('/p?keep=1');
		fireEvent.change(select(), { target: { value: '1Y' } });

		expect(new URLSearchParams(router.state.location.search).get('range')).toBe('1Y');
		expect(localStorage.getItem(KEY)).toBe('1Y');
		expect(localStorage.length).toBe(1);
	});

	it('picking the placeholder writes an empty URL param and forgets the stored choice', () => {
		localStorage.setItem(KEY, '1M');
		const { router } = renderAt('/p', { placeholder: 'Any period' });
		expect(select()).toHaveValue('1M');

		fireEvent.change(select(), { target: { value: '' } });

		expect(new URLSearchParams(router.state.location.search).get('range')).toBe('');
		expect(localStorage.getItem(KEY)).toBeNull();
		expect(select()).toHaveValue('');
	});

	it('picking the default option stores it', () => {
		renderAt('/p', { defaultValue: '6M' });
		fireEvent.change(select(), { target: { value: '1Y' } });
		fireEvent.change(select(), { target: { value: '6M' } });
		expect(localStorage.getItem(KEY)).toBe('6M');
	});

	it('is announced to another select of the same tab sharing the key', () => {
		const router = createMemoryRouter([{
			path: '/p',
			element: (
				<RouterProvider>
					<CompactSelect {...base({ ariaLabel: 'First' })} />
					<CompactSelect {...base({ ariaLabel: 'Second', urlParam: 'other' })} />
				</RouterProvider>
			),
		}], { initialEntries: ['/p?range=1M&other=1M'] });
		render(<ReactRouterProvider router={router} />);

		fireEvent.change(screen.getByRole('combobox', { name: 'First' }), { target: { value: '1Y' } });

		expect(screen.getByRole('combobox', { name: 'Second' })).toHaveValue('1Y');
	});
});

describe('without urlParam', () => {
	it('is ignored with one report, nothing is read or written', () => {
		const warn = warnSpy();
		const getItem = vi.spyOn(Storage.prototype, 'getItem');
		const setItem = vi.spyOn(Storage.prototype, 'setItem');
		localStorage.setItem(KEY, '1M');
		setItem.mockClear();
		const onChange = vi.fn();
		render(<CompactSelect {...base({ urlParam: undefined, value: '1Y', onChange })} />);

		expect(select()).toHaveValue('1Y');
		fireEvent.change(select(), { target: { value: '6M' } });

		expect(onChange).toHaveBeenCalledWith('6M');
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain('storageKey');
		expect(warn.mock.calls[0]![0]).toContain('urlParam');
		expect(keysOf(getItem)).toStrictEqual([]);
		expect(keysOf(setItem)).toStrictEqual([]);
		expect(localStorage.getItem(KEY)).toBe('1M');
	});
});

describe('storageKey with odd input', () => {
	it.each([
		['a number', 42],
		['zero', 0],
		['an empty text', ''],
		['an object', {}],
		['a list', ['k']],
		['true', true],
	])('%s is ignored with one report; the select works from the URL', (_name, odd) => {
		const warn = warnSpy();
		const getItem = vi.spyOn(Storage.prototype, 'getItem');
		const setItem = vi.spyOn(Storage.prototype, 'setItem');
		const { router } = renderAt('/p', { storageKey: odd as unknown as string, defaultValue: '6M' });

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]![0]).toContain('storageKey');
		expect(warn.mock.calls[0]![0]).toContain('non-empty text');
		fireEvent.change(select(), { target: { value: '1Y' } });
		expect(router.state.location.search).toBe('?range=1Y');
		expect(keysOf(getItem)).toStrictEqual([]);
		expect(keysOf(setItem)).toStrictEqual([]);
	});

	// Same convention as every prop: null (a YAML `key:` with nothing) and undefined mean "no value".
	it.each([
		['null', null],
		['undefined', undefined],
	])('%s means no storage: no report, nothing read', (_name, odd) => {
		const warn = warnSpy();
		const getItem = vi.spyOn(Storage.prototype, 'getItem');
		renderAt('/p', { storageKey: odd as unknown as string });
		expect(warn).not.toHaveBeenCalled();
		expect(keysOf(getItem)).toStrictEqual([]);
	});

	it('a circular object does not break the report', () => {
		warnSpy();
		const circular: Record<string, unknown> = {};
		circular['self'] = circular;
		expect(() => renderAt('/p', { storageKey: circular as unknown as string })).not.toThrow();
	});
});
