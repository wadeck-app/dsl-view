import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SortableColumn } from './SortableColumn.js';

describe('SortableColumn', () => {
	it('renders the label text', () => {
		render(
			<table><thead><tr>
				<SortableColumn label="Name" sortKey="name" currentSort={null} onSort={vi.fn()} />
			</tr></thead></table>
		);
		expect(screen.getByText('Name')).toBeInTheDocument();
	});

	it('renders as a <th> element', () => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn label="Name" sortKey="name" currentSort={null} onSort={vi.fn()} />
			</tr></thead></table>
		);
		expect(container.querySelector('th')).toBeInTheDocument();
	});

	it('sets aria-sort="none" when not the active sort column', () => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn label="Name" sortKey="name" currentSort={null} onSort={vi.fn()} />
			</tr></thead></table>
		);
		expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'none');
	});

	it('sets aria-sort="none" when a different column is active', () => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn
					label="Name"
					sortKey="name"
					currentSort={{ key: 'age', dir: 'asc' }}
					onSort={vi.fn()}
				/>
			</tr></thead></table>
		);
		expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'none');
	});

	it('sets aria-sort="ascending" when active and dir is asc', () => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn
					label="Name"
					sortKey="name"
					currentSort={{ key: 'name', dir: 'asc' }}
					onSort={vi.fn()}
				/>
			</tr></thead></table>
		);
		expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'ascending');
	});

	it('sets aria-sort="descending" when active and dir is desc', () => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn
					label="Name"
					sortKey="name"
					currentSort={{ key: 'name', dir: 'desc' }}
					onSort={vi.fn()}
				/>
			</tr></thead></table>
		);
		expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'descending');
	});

	it('calls onSort with the correct key when clicked', () => {
		const onSort = vi.fn();
		render(
			<table><thead><tr>
				<SortableColumn label="Email" sortKey="email" currentSort={null} onSort={onSort} />
			</tr></thead></table>
		);
		fireEvent.click(screen.getByText('Email'));
		expect(onSort).toHaveBeenCalledWith('email');
	});

	it('calls onSort once per click', () => {
		const onSort = vi.fn();
		render(
			<table><thead><tr>
				<SortableColumn label="Age" sortKey="age" currentSort={null} onSort={onSort} />
			</tr></thead></table>
		);
		fireEvent.click(screen.getByText('Age'));
		expect(onSort).toHaveBeenCalledTimes(1);
	});

	it('exposes a button named after the label (the icon is hidden from assistive technology)', () => {
		render(
			<table><thead><tr>
				<SortableColumn label="Status" sortKey="status" currentSort={null} onSort={vi.fn()} />
			</tr></thead></table>
		);
		expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument();
	});

	it('clicking the column that is already sorted still reports its key (toggling is the parent\'s job)', () => {
		const onSort = vi.fn();
		render(
			<table><thead><tr>
				<SortableColumn label="Name" sortKey="name" currentSort={{ key: 'name', dir: 'asc' }} onSort={onSort} />
			</tr></thead></table>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Name' }));
		expect(onSort).toHaveBeenCalledExactlyOnceWith('name');
	});

	it('passes the sortKey (not the label) to onSort', () => {
		const onSort = vi.fn();
		render(
			<table><thead><tr>
				<SortableColumn label="Created At" sortKey="created_at" currentSort={null} onSort={onSort} />
			</tr></thead></table>
		);
		fireEvent.click(screen.getByText('Created At'));
		expect(onSort).toHaveBeenCalledWith('created_at');
	});

	it('applies active styling when this column is sorted', () => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn
					label="Name"
					sortKey="name"
					currentSort={{ key: 'name', dir: 'asc' }}
					onSort={vi.fn()}
				/>
			</tr></thead></table>
		);
		// Exactly one text colour: the active one (two competing utilities would resolve by stylesheet order).
		const tokens = container.querySelector('th button')!.className.split(/\s+/);
		expect(tokens).toContain('text-content');
		expect(tokens).not.toContain('text-muted');
	});

	it('uses the muted colour (content only on hover) when this column is not sorted', () => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn label="Name" sortKey="name" currentSort={{ key: 'age', dir: 'asc' }} onSort={vi.fn()} />
			</tr></thead></table>
		);
		const tokens = container.querySelector('th button')!.className.split(/\s+/);
		expect(tokens).toContain('text-muted');
		expect(tokens).toContain('hover:text-content');
		expect(tokens).not.toContain('text-content');
	});

	it.each([
		['unsorted', null, 'lucide-chevrons-up-down', true],
		['another column sorted', { key: 'age', dir: 'asc' as const }, 'lucide-chevrons-up-down', true],
		['ascending', { key: 'name', dir: 'asc' as const }, 'lucide-chevron-up', false],
		['descending', { key: 'name', dir: 'desc' as const }, 'lucide-chevron-down', false],
	])('shows the right icon, dimmed only when inactive (%s)', (_label, currentSort, iconClass, dimmed) => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn label="Name" sortKey="name" currentSort={currentSort} onSort={vi.fn()} />
			</tr></thead></table>
		);
		const icon = container.querySelector('th button svg')!;
		expect(icon.getAttribute('class')).toContain(iconClass);
		expect(icon).toHaveAttribute('aria-hidden', 'true');
		expect(icon.getAttribute('class')!.split(/\s+/).includes('opacity-30')).toBe(dimmed);
	});
});
