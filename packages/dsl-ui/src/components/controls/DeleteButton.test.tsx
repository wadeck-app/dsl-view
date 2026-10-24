import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

	it('variant and size cannot be overridden, even by props a DSL node carries at runtime', () => {
		const runtimeProps = { variant: 'primary', size: 'md' } as unknown as React.ComponentProps<typeof DeleteButton>;
		render(<DeleteButton {...runtimeProps} />);
		const btn = screen.getByRole('button');
		expect(btn).toHaveClass('bg-danger', 'px-3', 'py-1');
		expect(btn).not.toHaveClass('px-4', 'py-2');
	});

	it('forwards click and disabled like a button', () => {
		const onClick = vi.fn();
		const { rerender } = render(<DeleteButton onClick={onClick} />);
		fireEvent.click(screen.getByRole('button'));
		expect(onClick).toHaveBeenCalledTimes(1);
		rerender(<DeleteButton onClick={onClick} disabled />);
		expect(screen.getByRole('button')).toBeDisabled();
		fireEvent.click(screen.getByRole('button'));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('renders custom children instead of "Delete"', () => {
		render(<DeleteButton>Remove</DeleteButton>);
		expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
		expect(screen.queryByText('Delete')).not.toBeInTheDocument();
	});
});
