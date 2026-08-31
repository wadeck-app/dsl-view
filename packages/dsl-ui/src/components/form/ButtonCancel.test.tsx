import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ButtonCancel } from './ButtonCancel.js';

describe('ButtonCancel', () => {
	it('renders "Cancel" by default', () => {
		render(<ButtonCancel onCancel={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
	});

	it('renders custom label', () => {
		render(<ButtonCancel label="Discard" onCancel={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
	});

	it('calls onCancel on click', () => {
		const onCancel = vi.fn();
		render(<ButtonCancel onCancel={onCancel} />);
		fireEvent.click(screen.getByRole('button'));
		expect(onCancel).toHaveBeenCalledOnce();
	});
});
