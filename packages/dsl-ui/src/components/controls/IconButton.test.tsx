import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pencil } from 'lucide-react';
import { IconButton } from './IconButton.js';

describe('IconButton', () => {
	it('renders with aria-label', () => {
		render(<IconButton icon={<Pencil />} label="Edit" />);
		expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
	});

	it('calls onClick when clicked', () => {
		const onClick = vi.fn();
		render(<IconButton icon={<Pencil />} label="Edit" onClick={onClick} />);
		fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('is disabled when disabled prop is set', () => {
		render(<IconButton icon={<Pencil />} label="Edit" disabled />);
		expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
	});

	it('renders the icon', () => {
		render(<IconButton icon={<svg data-testid="test-icon" />} label="Action" />);
		expect(screen.getByTestId('test-icon')).toBeInTheDocument();
	});
});
