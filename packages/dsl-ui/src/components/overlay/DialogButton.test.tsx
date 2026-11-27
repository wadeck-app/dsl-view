// A button made for the actions of a Dialog: it closes the dialog it sits in (a Cancel needs nothing else), or runs a page action
// and closes after it succeeded. It is off while its action runs, and reports itself when it is not inside a dialog.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetReportedMessages } from '../dev/reportOnce.js';
import { Dialog } from './Dialog.js';
import { DialogButton } from './DialogButton.js';

beforeEach(() => resetReportedMessages());

function renderDialog(button: React.ReactNode, onOpenChange = vi.fn()) {
	render(
		<Dialog title="Delete item" open onOpenChange={onOpenChange} actions={button}>
			<p>Body</p>
		</Dialog>
	);
	return onOpenChange;
}

describe('DialogButton without an action', () => {
	it('closes the dialog it sits in', () => {
		const onOpenChange = renderDialog(<DialogButton label="Cancel" variant="ghost" />);
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});

describe('DialogButton with an action', () => {
	it('runs the action, then closes by default', async () => {
		const onAction = vi.fn(async () => undefined);
		const onOpenChange = renderDialog(<DialogButton label="Delete" action="deleteItem" params={{ id: '7' }} onAction={onAction} variant="danger" />);
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(onAction).toHaveBeenCalledWith('deleteItem', { id: '7' }, undefined);
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	it('stays open when closesDialog is false', async () => {
		const onAction = vi.fn(async () => undefined);
		const onOpenChange = renderDialog(<DialogButton label="Apply" action="apply" closesDialog={false} onAction={onAction} />);
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
		await waitFor(() => expect(onAction).toHaveBeenCalled());
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('does not close when the action fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const onAction = vi.fn(async () => {
			throw new Error('nope');
		});
		const onOpenChange = renderDialog(<DialogButton label="Delete" action="deleteItem" onAction={onAction} />);
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		await waitFor(() => expect(onAction).toHaveBeenCalled());
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('is off while the action runs', async () => {
		let release: () => void = () => undefined;
		const onAction = vi.fn(() => new Promise<void>(resolve => (release = resolve)));
		renderDialog(<DialogButton label="Delete" action="deleteItem" onAction={onAction} />);
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled());
		release();
	});

	it('disabled and disabledReason are honoured', () => {
		renderDialog(<DialogButton label="Delete" action="deleteItem" onAction={vi.fn()} disabled disabledReason="Type the name first" />);
		expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
		expect(screen.getByRole('tooltip')).toHaveTextContent('Type the name first');
	});
});

describe('DialogButton outside a dialog', () => {
	it('is off and tells the author', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(<DialogButton label="Cancel" />);
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
		expect(warn.mock.calls.some(call => String(call[0]).includes('DialogButton'))).toBe(true);
		warn.mockRestore();
	});
});
