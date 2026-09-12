import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { DeleteButton } from './DeleteButton.js';

describe('DeleteButton', () => {
	it('always has the danger background color class', () => {
		render(<DeleteButton />);
		expect(screen.getByRole('button')).toHaveClass('bg-danger');
	});

	it('always has sm size classes', () => {
		render(<DeleteButton />);
		const btn = screen.getByRole('button');
		expect(btn).toHaveClass('px-3', 'py-1', 'text-xs');
	});

	it('renders "Delete" by default', () => {
		render(<DeleteButton />);
		expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
	});

	it('renders custom children instead of "Delete"', () => {
		render(<DeleteButton>Remove</DeleteButton>);
		expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
		expect(screen.queryByText('Delete')).not.toBeInTheDocument();
	});
});
