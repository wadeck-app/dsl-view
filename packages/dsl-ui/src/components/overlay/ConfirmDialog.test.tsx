import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog.js';

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
	const onOpenChange = vi.fn();
	const onConfirm = vi.fn();
	render(<ConfirmDialog open title="Delete entry" message="This cannot be undone." onOpenChange={onOpenChange} onConfirm={onConfirm} {...props} />);
	return { onOpenChange, onConfirm };
}

describe('ConfirmDialog', () => {
	it('shows the title and the message inside a dialog while open, and nothing when closed', () => {
		const { rerender } = render(<ConfirmDialog open title="Delete entry" message="This cannot be undone." onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText('Delete entry')).toBeInTheDocument();
		expect(within(dialog).getByText('This cannot be undone.')).toBeInTheDocument();

		rerender(<ConfirmDialog open={false} title="Delete entry" message="This cannot be undone." onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('Cancel asks to close and does not confirm', async () => {
		const { onOpenChange, onConfirm } = renderDialog();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('the confirm button runs onConfirm once, and by itself does not close the dialog (the caller decides)', async () => {
		const { onOpenChange, onConfirm } = renderDialog();

		await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm' }));

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('uses a custom confirm label, and the danger variant unless told otherwise', () => {
		renderDialog({ confirmLabel: 'Delete for good' });
		const confirm = screen.getByRole('button', { name: 'Delete for good' });

		expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
		// danger is the default: the button is styled with the danger token, not the primary one.
		expect(confirm.className).toContain('danger');
		expect(confirm.className).not.toContain('bg-primary');
	});

	it('the primary variant is honoured', () => {
		renderDialog({ confirmVariant: 'primary' });

		const confirm = screen.getByRole('button', { name: 'Confirm' });
		expect(confirm.className).not.toContain('danger');
	});
});
