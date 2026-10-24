import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UrlParamContext } from '@dsl-ui/context/UrlParamContext.js';
import type { UrlParamService } from '@dsl-ui/context/UrlParamContext.js';
import { Pagination } from './Pagination.js';

describe('Pagination (controlled mode)', () => {
	it('returns null when totalPages <= 1', () => {
		const { container } = render(<Pagination page={0} total={10} size={10} onPageChange={vi.fn()} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders nothing (not "Page NaN / NaN") while total or size is not loaded yet', () => {
		const unloaded = undefined as unknown as number;
		const { container, rerender } = render(<Pagination page={0} total={unloaded} size={10} onPageChange={vi.fn()} />);
		expect(container).toBeEmptyDOMElement();
		rerender(<Pagination page={0} total={30} size={unloaded} onPageChange={vi.fn()} />);
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

	it('renders nothing for a zero page size (a single page, no division by zero)', () => {
		const { container } = render(<Pagination page={0} total={50} size={0} onPageChange={vi.fn()} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders nothing when there are no rows', () => {
		const { container } = render(<Pagination page={0} total={0} size={10} onPageChange={vi.fn()} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('rounds the page count up: 31 rows of 10 are 4 pages', () => {
		render(<Pagination page={0} total={31} size={10} onPageChange={vi.fn()} />);
		expect(screen.getByText('Page 1 / 4')).toBeInTheDocument();
	});

	it('clamps a negative page up to the first page', () => {
		render(<Pagination page={-5} total={30} size={10} onPageChange={vi.fn()} />);
		expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
		expect(screen.getByText('Prev')).toBeDisabled();
	});

	it('enables both buttons on a middle page', () => {
		render(<Pagination page={1} total={30} size={10} onPageChange={vi.fn()} />);
		expect(screen.getByText('Prev')).toBeEnabled();
		expect(screen.getByText('Next')).toBeEnabled();
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

	it('clamps a page beyond the total down to the last page', () => {
		const service = withUrlParamService({ page: '999' });
		render(
			<UrlParamContext.Provider value={service}>
				<Pagination urlParam="page" total={50} size={10} />
			</UrlParamContext.Provider>
		);
		expect(screen.getByText('Page 5 / 5')).toBeInTheDocument();
		expect(screen.getByText('Next')).toBeDisabled();
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

	it('clicking Prev writes the decremented page', () => {
		const service = withUrlParamService({ page: '3' });
		const setSpy = vi.spyOn(service, 'set');
		render(
			<UrlParamContext.Provider value={service}>
				<Pagination urlParam="page" total={50} size={10} />
			</UrlParamContext.Provider>
		);
		fireEvent.click(screen.getByText('Prev'));
		expect(setSpy).toHaveBeenCalledWith('page', '2', { replace: true });
	});

	it('treats a non-numeric page param as the first page', () => {
		const service = withUrlParamService({ page: 'abc' });
		render(
			<UrlParamContext.Provider value={service}>
				<Pagination urlParam="page" total={50} size={10} />
			</UrlParamContext.Provider>
		);
		expect(screen.getByText('Page 1 / 5')).toBeInTheDocument();
	});

	it('throws when urlParam is set but no UrlParamContext is provided', () => {
		expect(() => render(<Pagination urlParam="page" total={50} size={10} />)).toThrow(
			/requires UrlParamContext/
		);
	});
});
