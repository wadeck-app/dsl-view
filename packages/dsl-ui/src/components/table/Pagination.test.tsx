import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './Pagination.js';

describe('Pagination', () => {
	it('returns null when totalPages <= 1', () => {
		const { container } = render(
			<Pagination page={0} total={10} size={10} onPageChange={vi.fn()} onSizeChange={vi.fn()} />
		);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders "Page 1 / 3" format', () => {
		render(<Pagination page={0} total={30} size={10} onPageChange={vi.fn()} onSizeChange={vi.fn()} />);
		expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
	});

	it('Prev button is disabled on page 0', () => {
		render(<Pagination page={0} total={30} size={10} onPageChange={vi.fn()} onSizeChange={vi.fn()} />);
		expect(screen.getByText('Prev')).toBeDisabled();
	});

	it('Next button is disabled on last page', () => {
		render(<Pagination page={2} total={30} size={10} onPageChange={vi.fn()} onSizeChange={vi.fn()} />);
		expect(screen.getByText('Next')).toBeDisabled();
	});

	it('clicking Prev calls onPageChange(page - 1)', () => {
		const onPageChange = vi.fn();
		render(<Pagination page={2} total={50} size={10} onPageChange={onPageChange} onSizeChange={vi.fn()} />);
		fireEvent.click(screen.getByText('Prev'));
		expect(onPageChange).toHaveBeenCalledWith(1);
	});

	it('clicking Next calls onPageChange(page + 1)', () => {
		const onPageChange = vi.fn();
		render(<Pagination page={0} total={50} size={10} onPageChange={onPageChange} onSizeChange={vi.fn()} />);
		fireEvent.click(screen.getByText('Next'));
		expect(onPageChange).toHaveBeenCalledWith(1);
	});
});
