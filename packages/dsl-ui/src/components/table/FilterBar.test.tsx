import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FilterBar } from './FilterBar.js';
import type { FilterBarFilter } from './FilterBar.js';

const filters: FilterBarFilter[] = [
	{ key: 'status', label: 'Active', value: 'active', active: true, color: 'green' },
	{ key: 'type', label: 'Admin', value: 'admin', active: false, color: 'blue' },
];

describe('FilterBar', () => {
	it('renders search input when onSearchChange is provided', () => {
		render(<FilterBar search="" onSearchChange={vi.fn()} />);
		expect(screen.getByRole('search')).toBeInTheDocument();
	});

	it('search input has placeholder text when prop provided', () => {
		render(<FilterBar search="" onSearchChange={vi.fn()} placeholder="Search items…" />);
		expect(screen.getByPlaceholderText('Search items…')).toBeInTheDocument();
	});

	it('renders filter chip labels', () => {
		render(<FilterBar filters={filters} />);
		expect(screen.getByText('Active')).toBeInTheDocument();
		expect(screen.getByText('Admin')).toBeInTheDocument();
	});

	it('clicking an active chip calls onFilterChange with active=false', () => {
		const onFilterChange = vi.fn();
		render(<FilterBar filters={filters} onFilterChange={onFilterChange} />);
		fireEvent.click(screen.getByText('Active'));
		expect(onFilterChange).toHaveBeenCalledWith('status', 'active', false);
	});

	it('active chip has aria-pressed="true"', () => {
		render(<FilterBar filters={filters} />);
		// "Active" chip has active=true
		const btn = screen.getByText('Active').closest('button');
		expect(btn).toHaveAttribute('aria-pressed', 'true');
	});

	it('inactive chip has aria-pressed="false"', () => {
		render(<FilterBar filters={filters} />);
		// "Admin" chip has active=false
		const btn = screen.getByText('Admin').closest('button');
		expect(btn).toHaveAttribute('aria-pressed', 'false');
	});

	it('shows "Clear all" button when a filter is active', () => {
		render(<FilterBar filters={filters} search="" onSearchChange={vi.fn()} />);
		expect(screen.getByText('Clear all')).toBeInTheDocument();
	});

	it('"Clear all" button is NOT shown when no filters are active and search is empty', () => {
		const inactiveFilters: FilterBarFilter[] = [
			{ key: 'status', label: 'Active', value: 'active', active: false },
		];
		render(<FilterBar filters={inactiveFilters} search="" onSearchChange={vi.fn()} />);
		expect(screen.queryByText('Clear all')).toBeNull();
	});

	it('clicking "Clear all" calls onClearAll', () => {
		const onClearAll = vi.fn();
		render(<FilterBar filters={filters} search="" onSearchChange={vi.fn()} onClearAll={onClearAll} />);
		fireEvent.click(screen.getByText('Clear all'));
		expect(onClearAll).toHaveBeenCalledTimes(1);
	});

	it('does not render SearchBar when onSearchChange is not provided', () => {
		render(<FilterBar filters={filters} />);
		expect(screen.queryByRole('search')).toBeNull();
	});

	it('renders correctly with no filters (filters=[])', () => {
		render(<FilterBar search="" onSearchChange={vi.fn()} filters={[]} />);
		expect(screen.getByRole('search')).toBeInTheDocument();
		expect(screen.queryByText('Clear all')).toBeNull();
	});
});
