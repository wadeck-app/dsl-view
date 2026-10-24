import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UrlParamContext } from '../../context/UrlParamContext.js';
import type { UrlParamService } from '../../context/UrlParamContext.js';
import { CompactSelect } from '../controls/CompactSelect.js';
import { SearchBar } from './SearchBar.js';

// A page filters a $sources entry with `$urlParam.<key>`; these controls are what write that key.
function serviceWith(initial: Record<string, string>) {
	const store = new Map(Object.entries(initial));
	const set = vi.fn((key: string, value: string) => {
		store.set(key, value);
	});
	const service: UrlParamService = { get: (key) => store.get(key) ?? null, set };
	return { service, set };
}

describe('SearchBar urlParam mode', () => {
	it('shows the current url param and ignores the value prop', () => {
		const { service } = serviceWith({ q: 'from-url' });
		render(
			<UrlParamContext.Provider value={service}>
				<SearchBar urlParam="q" value="ignored" onChange={() => {}} />
			</UrlParamContext.Provider>
		);
		expect(screen.getByRole('searchbox')).toHaveValue('from-url');
	});

	it('writes the typed text to the url param (not to onChange)', () => {
		const { service, set } = serviceWith({});
		const onChange = vi.fn();
		render(
			<UrlParamContext.Provider value={service}>
				<SearchBar urlParam="q" onChange={onChange} debounceMs={0} />
			</UrlParamContext.Provider>
		);
		fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'billing' } });
		expect(set).toHaveBeenCalledWith('q', 'billing', { replace: true });
		expect(onChange).not.toHaveBeenCalled();
	});

	// Default debounce (300 ms) is what a YAML page gets: a keystroke must not hit the URL (and refetch) before it expires.
	it('debounces the url write with the default delay and writes only the last text', () => {
		vi.useFakeTimers();
		try {
			const { service, set } = serviceWith({});
			render(
				<UrlParamContext.Provider value={service}>
					<SearchBar urlParam="q" />
				</UrlParamContext.Provider>
			);
			const input = screen.getByRole('searchbox');
			fireEvent.change(input, { target: { value: 'b' } });
			fireEvent.change(input, { target: { value: 'bi' } });
			vi.advanceTimersByTime(299);
			expect(set).not.toHaveBeenCalled();
			vi.advanceTimersByTime(1);
			expect(set).toHaveBeenCalledTimes(1);
			expect(set).toHaveBeenCalledWith('q', 'bi', { replace: true });
		} finally {
			vi.useRealTimers();
		}
	});

	it('the clear button writes an empty string to the url param immediately', () => {
		const { service, set } = serviceWith({ q: 'billing' });
		render(
			<UrlParamContext.Provider value={service}>
				<SearchBar urlParam="q" />
			</UrlParamContext.Provider>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
		expect(set).toHaveBeenCalledExactlyOnceWith('q', '', { replace: true });
	});

	// The props-error and missing-context errors are asserted once, in SearchBar.test.tsx (misconfiguration).
});

describe('CompactSelect urlParam mode', () => {
	const options = [
		{ value: 'failed', label: 'Failed' },
		{ value: 'ok', label: 'Ok' },
	];

	it('selects the url param value and writes the new choice back to it', () => {
		const { service, set } = serviceWith({ status: 'failed' });
		const onChange = vi.fn();
		render(
			<UrlParamContext.Provider value={service}>
				<CompactSelect urlParam="status" value="ignored" options={options} onChange={onChange} ariaLabel="Status" placeholder="Any" />
			</UrlParamContext.Provider>
		);
		const select = screen.getByRole('combobox', { name: 'Status' });
		expect(select).toHaveValue('failed');
		fireEvent.change(select, { target: { value: 'ok' } });
		expect(set).toHaveBeenCalledWith('status', 'ok', { replace: true });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('keeps the controlled behaviour when urlParam is absent', () => {
		const onChange = vi.fn();
		render(<CompactSelect value="ok" options={options} onChange={onChange} ariaLabel="Status" />);
		fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'failed' } });
		expect(onChange).toHaveBeenCalledWith('failed');
	});
});
