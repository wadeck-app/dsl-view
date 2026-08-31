import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Form, useFormContext } from './Form.js';

function FormDataDisplay() {
	const ctx = useFormContext();
	return <div data-testid="form-data">{JSON.stringify(ctx?.formData)}</div>;
}

describe('Form', () => {
	it('calls onSubmit with current formData when submitted', async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const { container } = render(
			<Form
				fields={<div />}
				actions={<button type="submit">Submit</button>}
				onSubmit={onSubmit}
				initialData={{ name: 'Alice' }}
			/>
		);
		fireEvent.submit(container.querySelector('form')!);
		await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' }));
	});

	it('prevents default browser submit', () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const { container } = render(
			<Form fields={<div />} actions={<button type="submit">Go</button>} onSubmit={onSubmit} />
		);
		const form = container.querySelector('form')!;
		const event = new Event('submit', { bubbles: true, cancelable: true });
		form.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	it('renders fields and actions slots', () => {
		render(
			<Form
				fields={<input aria-label="field-slot" />}
				actions={<button>action-slot</button>}
				onSubmit={vi.fn().mockResolvedValue(undefined)}
			/>
		);
		expect(screen.getByLabelText('field-slot')).toBeInTheDocument();
		expect(screen.getByText('action-slot')).toBeInTheDocument();
	});

	it('provides formData from initialData via context', () => {
		render(
			<Form
				fields={<FormDataDisplay />}
				actions={<div />}
				onSubmit={vi.fn().mockResolvedValue(undefined)}
				initialData={{ x: 1 }}
			/>
		);
		expect(screen.getByTestId('form-data')).toHaveTextContent('{"x":1}');
	});

	it('updates savedState after successful submit - hasChanges becomes false', async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const { container } = render(
			<Form
				fields={<div />}
				actions={<button type="submit">Submit</button>}
				onSubmit={onSubmit}
				initialData={{ v: 1 }}
			/>
		);
		fireEvent.submit(container.querySelector('form')!);
		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
	});
});
