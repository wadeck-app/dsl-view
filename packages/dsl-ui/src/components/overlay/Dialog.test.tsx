import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
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

	// Was h-4 w-4 (16px); other size="sm" buttons (Breadcrumb, Pagination) use 14px icons.
	it('close icon matches the 14px scale shared with other size="sm" buttons', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="Rename file" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		const icon = screen.getByRole('button', { name: 'Close dialog' }).querySelector('svg');
		expect(icon).toHaveClass('h-3.5', 'w-3.5');
		expect(icon).not.toHaveClass('h-4', 'w-4');
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

	it('Escape calls the LATEST onOpenChange, not the one from the first render', () => {
		const first = vi.fn();
		const latest = vi.fn();
		const { rerender } = render(
			<Dialog title="T" open={true} onOpenChange={first}>
				<p>body</p>
			</Dialog>
		);
		rerender(
			<Dialog title="T" open={true} onOpenChange={latest}>
				<p>body</p>
			</Dialog>
		);
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(latest).toHaveBeenCalledExactlyOnceWith(false);
		expect(first).not.toHaveBeenCalled();
	});

	it('Escape on a closed controlled dialog does nothing and is not swallowed', () => {
		const onOpenChange = vi.fn();
		render(
			<Dialog title="T" open={false} onOpenChange={onOpenChange}>
				<p>body</p>
			</Dialog>
		);
		expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(true);
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('a controlled dialog stays open until the parent says otherwise', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(
			<Dialog title="T" open={true} onOpenChange={onOpenChange}>
				<p>body</p>
			</Dialog>
		);
		await user.keyboard('{Escape}');
		await user.click(screen.getByRole('button', { name: 'Close dialog' }));
		expect(onOpenChange).toHaveBeenCalledTimes(2);
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('the trigger reports open=true through onOpenChange', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(
			<Dialog title="T" trigger={<button>Open</button>} onOpenChange={onOpenChange}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
	});

	it('the close button closes the dialog', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="T" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		await user.click(screen.getByRole('button', { name: 'Close dialog' }));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('clicking inside the panel does not close it', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="T" trigger={<button>Open</button>}>
				<p>body text</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		await user.click(screen.getByText('body text'));
		await user.click(screen.getByText('T'));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('is named by its title (aria-labelledby points at the heading)', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="Rename file" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		expect(screen.getByRole('dialog', { name: 'Rename file' })).toBeInTheDocument();
	});

	it('moves focus into the dialog on open and gives it back to the trigger on close', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="T" trigger={<button>Open</button>}>
				<p>body</p>
			</Dialog>
		);
		const trigger = screen.getByRole('button', { name: 'Open' });
		await user.click(trigger);
		await waitFor(() => {
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close dialog' }));
		});
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(document.activeElement).toBe(trigger);
	});

	it('Shift+Tab on the first focusable wraps to the last, Tab on the last wraps to the first', async () => {
		const user = userEvent.setup();
		render(
			<Dialog title="T" trigger={<button>Open</button>} actions={<button>Confirm</button>}>
				<p>body</p>
			</Dialog>
		);
		await user.click(screen.getByRole('button', { name: 'Open' }));
		const close = screen.getByRole('button', { name: 'Close dialog' });
		const confirm = screen.getByRole('button', { name: 'Confirm' });
		await waitFor(() => expect(document.activeElement).toBe(close));
		await user.tab({ shift: true });
		expect(document.activeElement).toBe(confirm);
		await user.tab();
		expect(document.activeElement).toBe(close);
	});

	describe('focus trap edge cases', () => {
		function renderOpen(actions?: React.ReactNode, children: React.ReactNode = <button>Inside</button>) {
			return render(
				<>
					<button>Outside before</button>
					<Dialog title="T" open={true} onOpenChange={vi.fn()} actions={actions}>
						{children}
					</Dialog>
					<button>Outside after</button>
				</>
			);
		}

		it('Tab from a control outside the dialog pulls focus onto the first control inside', () => {
			renderOpen();
			act(() => screen.getByText('Outside after').focus());
			expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false);
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close dialog' }));
		});

		it('Shift+Tab from a control outside the dialog pulls focus onto the LAST control inside', () => {
			renderOpen(<button>Confirm</button>);
			act(() => screen.getByText('Outside before').focus());
			expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(false);
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirm' }));
		});

		it('a disabled last button is not a focus stop: Tab on the last enabled one wraps to the first', () => {
			renderOpen(
				<>
					<button>Confirm</button>
					<button disabled>Disabled last</button>
				</>
			);
			act(() => screen.getByRole('button', { name: 'Confirm' }).focus());
			expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false);
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close dialog' }));
		});

		it('a hidden input is not a focus stop either', () => {
			renderOpen(undefined, (
				<>
					<button>Only</button>
					<input type="hidden" name="token" defaultValue="x" />
				</>
			));
			act(() => screen.getByRole('button', { name: 'Close dialog' }).focus());
			act(() => screen.getByText('Only').focus());
			// Close dialog, Only: Only is the last real stop.
			expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false);
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close dialog' }));
		});

		it('Tab with focus lost on <body> enters the dialog', () => {
			renderOpen();
			act(() => (document.activeElement as HTMLElement | null)?.blur());
			expect(document.activeElement).toBe(document.body);
			expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false);
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close dialog' }));
		});

		it('leaves Tab alone while focus sits in another overlay layer (a portaled listbox of a field inside the dialog)', () => {
			renderOpen();
			const layer = document.createElement('div');
			layer.setAttribute('role', 'listbox');
			const option = document.createElement('button');
			option.textContent = 'Portaled option';
			layer.appendChild(option);
			document.body.appendChild(layer);
			try {
				act(() => option.focus());
				expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(true);
				expect(document.activeElement).toBe(option);
			} finally {
				layer.remove();
			}
		});
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
