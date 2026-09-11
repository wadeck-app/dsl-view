import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BulkActionsToolbar } from './BulkActionsToolbar.js';

describe('BulkActionsToolbar', () => {
	it('renders without crashing', () => {
		const { container } = render(
			<BulkActionsToolbar selectedCount={0} onClearSelection={vi.fn()} />
		);
		expect(container).toBeInTheDocument();
	});

	it('is aria-hidden when selectedCount is 0', () => {
		render(
			<BulkActionsToolbar selectedCount={0} onClearSelection={vi.fn()} />
		);
		const toolbar = screen.getByTestId('bulk-actions-toolbar');
		expect(toolbar).toHaveAttribute('aria-hidden', 'true');
	});

	it('is not aria-hidden when selectedCount > 0', () => {
		render(
			<BulkActionsToolbar selectedCount={1} onClearSelection={vi.fn()} />
		);
		const toolbar = screen.getByTestId('bulk-actions-toolbar');
		expect(toolbar).not.toHaveAttribute('aria-hidden');
	});

	it('shows the correct singular count text for 1 item', () => {
		render(
			<BulkActionsToolbar selectedCount={1} onClearSelection={vi.fn()} />
		);
		expect(screen.getByText('1 item selected')).toBeInTheDocument();
	});

	it('shows the correct plural count text for multiple items', () => {
		render(
			<BulkActionsToolbar selectedCount={5} onClearSelection={vi.fn()} />
		);
		expect(screen.getByText('5 items selected')).toBeInTheDocument();
	});

	it('renders a clear button', () => {
		render(
			<BulkActionsToolbar selectedCount={3} onClearSelection={vi.fn()} />
		);
		expect(screen.getByTestId('bulk-actions-clear')).toBeInTheDocument();
	});

	it('calls onClearSelection when clear button is clicked', () => {
		const onClearSelection = vi.fn();
		render(
			<BulkActionsToolbar selectedCount={3} onClearSelection={onClearSelection} />
		);
		fireEvent.click(screen.getByTestId('bulk-actions-clear'));
		expect(onClearSelection).toHaveBeenCalledTimes(1);
	});

	it('renders children (action buttons)', () => {
		render(
			<BulkActionsToolbar selectedCount={2} onClearSelection={vi.fn()}>
				<button>Delete selected</button>
			</BulkActionsToolbar>
		);
		expect(screen.getByText('Delete selected')).toBeInTheDocument();
	});

	it('renders multiple children', () => {
		render(
			<BulkActionsToolbar selectedCount={2} onClearSelection={vi.fn()}>
				<button>Delete</button>
				<button>Archive</button>
			</BulkActionsToolbar>
		);
		expect(screen.getByText('Delete')).toBeInTheDocument();
		expect(screen.getByText('Archive')).toBeInTheDocument();
	});

	it('has role="toolbar" for accessibility', () => {
		render(
			<BulkActionsToolbar selectedCount={1} onClearSelection={vi.fn()} />
		);
		expect(screen.getByRole('toolbar')).toBeInTheDocument();
	});

	it('updates count text when selectedCount changes', () => {
		const { rerender } = render(
			<BulkActionsToolbar selectedCount={2} onClearSelection={vi.fn()} />
		);
		expect(screen.getByText('2 items selected')).toBeInTheDocument();
		rerender(
			<BulkActionsToolbar selectedCount={7} onClearSelection={vi.fn()} />
		);
		expect(screen.getByText('7 items selected')).toBeInTheDocument();
	});

	it('hides via aria-hidden when count goes back to 0', () => {
		const { rerender } = render(
			<BulkActionsToolbar selectedCount={3} onClearSelection={vi.fn()} />
		);
		expect(screen.getByTestId('bulk-actions-toolbar')).not.toHaveAttribute('aria-hidden');
		rerender(
			<BulkActionsToolbar selectedCount={0} onClearSelection={vi.fn()} />
		);
		expect(screen.getByTestId('bulk-actions-toolbar')).toHaveAttribute('aria-hidden', 'true');
	});
});
