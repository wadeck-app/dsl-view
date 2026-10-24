import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Breadcrumb } from './Breadcrumb.js';

describe('Breadcrumb', () => {
	it('at the root there is only the home button', () => {
		render(<Breadcrumb currentPath="/" onNavigate={vi.fn()} />);

		expect(screen.getAllByRole('button')).toHaveLength(1);
		expect(screen.getByRole('button', { name: 'Navigate to root' })).toBeInTheDocument();
	});

	it('turns every folder into a button that navigates to its own full path, and the last segment into plain text', () => {
		const onNavigate = vi.fn();
		render(<Breadcrumb currentPath="/files/reports/2024" onNavigate={onNavigate} />);

		fireEvent.click(screen.getByRole('button', { name: 'Navigate to /files' }));
		fireEvent.click(screen.getByRole('button', { name: 'Navigate to /files/reports' }));
		fireEvent.click(screen.getByRole('button', { name: 'Navigate to root' }));

		expect(onNavigate.mock.calls).toStrictEqual([['/files'], ['/files/reports'], ['/']]);
		expect(screen.queryByRole('button', { name: 'Navigate to /files/reports/2024' })).toBeNull();
		expect(screen.getByText('2024')).toBeInTheDocument();
		expect(screen.getByText('2024').tagName).toBe('SPAN');
	});

	it('ignores repeated and trailing slashes', () => {
		render(<Breadcrumb currentPath="//files//reports/" onNavigate={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Navigate to /files' })).toBeInTheDocument();
		expect(screen.getByText('reports')).toBeInTheDocument();
	});

	// Was 16px; Pagination/BulkActionsToolbar use 14px for the same size="sm" role.
	it('renders the root icon at the 14px scale shared with other size="sm" buttons', () => {
		render(<Breadcrumb currentPath="/users/42" onNavigate={vi.fn()} />);

		const icon = screen.getByRole('button', { name: 'Navigate to root' }).querySelector('svg');
		expect(icon).toHaveClass('h-3.5', 'w-3.5');
		expect(icon).not.toHaveClass('h-4', 'w-4');
	});

	it('an empty path behaves like the root', () => {
		render(<Breadcrumb currentPath="" onNavigate={vi.fn()} />);

		expect(screen.getAllByRole('button')).toHaveLength(1);
	});
});
