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

	it('renders a clickable button inside the th', () => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn label="Status" sortKey="status" currentSort={null} onSort={vi.fn()} />
			</tr></thead></table>
		);
		expect(container.querySelector('th button')).toBeInTheDocument();
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
		// Active button should have text-content class
		const button = container.querySelector('th button');
		expect(button?.className).toContain('text-content');
	});

	it('renders a sort icon (svg) inside the button', () => {
		const { container } = render(
			<table><thead><tr>
				<SortableColumn label="Name" sortKey="name" currentSort={null} onSort={vi.fn()} />
			</tr></thead></table>
		);
		expect(container.querySelector('th button svg')).toBeInTheDocument();
	});
});
