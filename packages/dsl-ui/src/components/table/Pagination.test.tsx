import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UrlParamContext } from '../../context/UrlParamContext.js';
import type { UrlParamService } from '../../context/UrlParamContext.js';
import { Pagination } from './Pagination.js';

describe('Pagination (controlled mode)', () => {
	it('returns null when totalPages <= 1', () => {
		const { container } = render(<Pagination page={0} total={10} size={10} onPageChange={vi.fn()} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders "Page 1 / 3" format', () => {
		render(<Pagination page={0} total={30} size={10} onPageChange={vi.fn()} />);
		expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
	});

	it('Prev button is disabled on page 0', () => {
		render(<Pagination page={0} total={30} size={10} onPageChange={vi.fn()} />);
		expect(screen.getByText('Prev')).toBeDisabled();
	});

	it('Next button is disabled on last page', () => {
		render(<Pagination page={2} total={30} size={10} onPageChange={vi.fn()} />);
		expect(screen.getByText('Next')).toBeDisabled();
	});

	it('clicking Prev calls onPageChange(page - 1)', () => {
		const onPageChange = vi.fn();
		render(<Pagination page={2} total={50} size={10} onPageChange={onPageChange} />);
		fireEvent.click(screen.getByText('Prev'));
		expect(onPageChange).toHaveBeenCalledWith(1);
	});

	it('clicking Next calls onPageChange(page + 1)', () => {
		const onPageChange = vi.fn();
		render(<Pagination page={0} total={50} size={10} onPageChange={onPageChange} />);
		fireEvent.click(screen.getByText('Next'));
		expect(onPageChange).toHaveBeenCalledWith(1);
	});

	it('returns null when neither urlParam nor onPageChange is supplied', () => {
		const { container } = render(<Pagination total={50} size={10} />);
		expect(container).toBeEmptyDOMElement();
	});
});

describe('Pagination (urlParam mode)', () => {
	function withUrlParamService(initial: Record<string, string>) {
		const store = new Map(Object.entries(initial));
		const service: UrlParamService = {
			get: key => store.get(key) ?? null,
			set: (key, value) => {
				store.set(key, value);
			},
		};
		return service;
	}

	it('reads the current page from the url param, ignoring the page prop', () => {
		const service = withUrlParamService({ page: '2' });
		render(
			<UrlParamContext.Provider value={service}>
				<Pagination urlParam="page" page={0} total={50} size={10} />
			</UrlParamContext.Provider>
		);
		expect(screen.getByText('Page 3 / 5')).toBeInTheDocument();
	});

	it('defaults to page 0 when the url param is unset', () => {
		const service = withUrlParamService({});
		render(
			<UrlParamContext.Provider value={service}>
				<Pagination urlParam="page" total={50} size={10} />
			</UrlParamContext.Provider>
		);
		expect(screen.getByText('Page 1 / 5')).toBeInTheDocument();
	});

	it('clicking Next writes the incremented page to the url param service', () => {
		const service = withUrlParamService({ page: '0' });
		const setSpy = vi.spyOn(service, 'set');
		render(
			<UrlParamContext.Provider value={service}>
				<Pagination urlParam="page" total={50} size={10} />
			</UrlParamContext.Provider>
		);
		fireEvent.click(screen.getByText('Next'));
		expect(setSpy).toHaveBeenCalledWith('page', '1', { replace: true });
	});

	it('throws when urlParam is set but no UrlParamContext is provided', () => {
		expect(() => render(<Pagination urlParam="page" total={50} size={10} />)).toThrow(
			/requires UrlParamContext/
		);
	});
});
