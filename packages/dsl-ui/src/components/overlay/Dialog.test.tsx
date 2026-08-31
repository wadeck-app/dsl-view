import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from './Dialog.js';

describe('Dialog', () => {
	it('renders the trigger element', () => {
		render(
			<Dialog title="Test Dialog" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
	});

	it('dialog is not visible initially in uncontrolled mode', () => {
		render(
			<Dialog title="Test Dialog" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('clicking the trigger opens the dialog and shows the title', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="Rename file" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Rename file')).toBeInTheDocument();
	});

	it('ESC key closes the dialog', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="Test Dialog" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('clicking the backdrop closes the dialog', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="Test Dialog" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		const backdrop = screen.getByTestId('dialog-backdrop');
		// Click on the backdrop element itself (not the dialog panel)
		fireEvent.click(backdrop);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('Tab key cycles focus within the dialog (focus trap)', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="Test Dialog" trigger={<button>Open</button>} actions={<button>Confirm</button>}>
				<button>Inside</button>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		const dialog = screen.getByRole('dialog');
		// All focusable elements inside dialog (Close button + Inside button + Confirm button)
		const focusable = within(dialog).getAllByRole('button');
		expect(focusable.length).toBeGreaterThanOrEqual(2);

		// Tab through all elements - focus must not leave the dialog
		for (let i = 0; i < focusable.length + 2; i++) {
			await user.tab();
			expect(dialog.contains(document.activeElement)).toBe(true);
		}
	});

	it('has role="dialog" and aria-modal="true" when open', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="Accessible Dialog" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
	});

	it('renders children inside the dialog body', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="Test Dialog" trigger={<button>Open</button>}>
				<p>Dialog body content</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByText('Dialog body content')).toBeInTheDocument();
	});

	it('renders actions in the footer', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="Test Dialog" trigger={<button>Open</button>} actions={<button>Save</button>}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
	});

	it('onOpenChange is called when dialog is closed via ESC', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(
			<Dialog title="Controlled" open={true} onOpenChange={onOpenChange}>
				<p>body</p>
			</Dialog>
		);
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('works in controlled mode: open prop shows the dialog without a trigger', () => {
		render(
			<Dialog title="Controlled Dialog" open={true} onOpenChange={vi.fn()}>
				<p>controlled body</p>
			</Dialog>
		);
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
	});
});
