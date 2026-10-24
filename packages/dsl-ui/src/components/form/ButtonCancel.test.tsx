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

	it('disabled blocks the click', () => {
		const onCancel = vi.fn();
		render(<ButtonCancel onCancel={onCancel} disabled />);
		expect(screen.getByRole('button')).toBeDisabled();
		fireEvent.click(screen.getByRole('button'));
		expect(onCancel).not.toHaveBeenCalled();
	});

	// A bare <button> inside a <form> submits it: Cancel in a form would save the form.
	it('is a plain button, so it never submits the form it sits in', () => {
		const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<ButtonCancel onCancel={vi.fn()} />
			</form>,
		);
		expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
		fireEvent.click(screen.getByRole('button'));
		expect(onSubmit).not.toHaveBeenCalled();
	});
});
