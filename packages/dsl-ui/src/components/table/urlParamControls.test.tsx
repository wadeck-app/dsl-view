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

	it('fails loudly when neither urlParam nor value/onChange is given', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<SearchBar />)).toThrow(/needs either "urlParam" or both "value" and "onChange"/);
		spy.mockRestore();
	});

	it('fails loudly (no silent fallback) when urlParam is set without a RouterProvider', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => render(<SearchBar urlParam="q" />)).toThrow(/requires UrlParamContext/);
		spy.mockRestore();
	});
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
