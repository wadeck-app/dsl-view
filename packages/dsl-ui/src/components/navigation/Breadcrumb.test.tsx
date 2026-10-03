import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from './Breadcrumb.js';

describe('Breadcrumb', () => {
	it('renders the root link', () => {
		render(<Breadcrumb currentPath="/users/42" onNavigate={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Navigate to root' })).toBeInTheDocument();
	});

	// Was 16px; Pagination/BulkActionsToolbar use 14px for the same size="sm" role.
	it('renders the root icon at the 14px scale shared with other size="sm" buttons', () => {
		render(<Breadcrumb currentPath="/users/42" onNavigate={vi.fn()} />);
		const icon = screen.getByRole('button', { name: 'Navigate to root' }).querySelector('svg');
		expect(icon).toHaveClass('h-3.5', 'w-3.5');
		expect(icon).not.toHaveClass('h-4', 'w-4');
	});
});
