import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ButtonSave } from './ButtonSave.js';
import { Form } from './Form.js';

describe('ButtonSave', () => {
	it('renders "Save" by default', () => {
		render(<ButtonSave onClick={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
	});

	it('renders custom label', () => {
		render(<ButtonSave label="Apply" onClick={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
	});

	it('calls onClick on click', () => {
		const onClick = vi.fn();
		render(<ButtonSave onClick={onClick} />);
		fireEvent.click(screen.getByRole('button'));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('is disabled when isPending=true', () => {
		render(<ButtonSave onClick={vi.fn()} isPending={true} />);
		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('shows "Saving..." when isPending=true', () => {
		render(<ButtonSave onClick={vi.fn()} isPending={true} />);
		expect(screen.getByText('Saving...')).toBeInTheDocument();
	});

	it('is disabled when hasChanges=false', () => {
		render(<ButtonSave onClick={vi.fn()} hasChanges={false} />);
		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('is enabled when hasChanges=true', () => {
		render(<ButtonSave onClick={vi.fn()} hasChanges={true} />);
		expect(screen.getByRole('button')).not.toBeDisabled();
	});

	it('is enabled when hasChanges is undefined', () => {
		render(<ButtonSave onClick={vi.fn()} />);
		expect(screen.getByRole('button')).not.toBeDisabled();
	});

	it('shows implicit tooltip "No changes to save" when hasChanges=false', () => {
		render(<ButtonSave onClick={vi.fn()} hasChanges={false} />);
		expect(screen.getByRole('tooltip')).toHaveTextContent('No changes to save');
	});

	it('shows explicit disabledReason in tooltip', () => {
		render(<ButtonSave onClick={vi.fn()} hasChanges={false} disabledReason="Custom reason" />);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Custom reason');
	});

	it('uses type="submit" when inside FormContext with no onClick', () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(
			<Form fields={<ButtonSave />} actions={<div />} onSubmit={onSubmit} />
		);
		expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
	});

	it('reads isPending from FormContext', async () => {
		let resolve!: () => void;
		const onSubmit = vi.fn().mockImplementation(() => new Promise<void>(r => { resolve = r; }));
		const { container } = render(
			<Form
				fields={<ButtonSave />}
				actions={<button type="submit">Go</button>}
				onSubmit={onSubmit}
			/>
		);
		fireEvent.submit(container.querySelector('form')!);
		await waitFor(() => expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument());
		resolve();
	});

	it('reads hasChanges from FormContext - disabled when no changes', () => {
		render(
			<Form fields={<ButtonSave />} actions={<div />} onSubmit={vi.fn().mockResolvedValue(undefined)} initialData={{ x: 1 }} />
		);
		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
	});
});
