import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetReportedMessages } from '../dev/reportOnce.js';
import { useFormContext } from '../form/Form.js';
import { DialogForm } from './DialogForm.js';

function NameField() {
	const ctx = useFormContext()!;
	return <input aria-label="name" value={String(ctx.formData['name'] ?? '')} onChange={e => ctx.onChange('name', e.target.value)} />;
}

const renderDialog = (props: Partial<React.ComponentProps<typeof DialogForm>> = {}) => {
	const onSubmit = vi.fn().mockResolvedValue(undefined);
	const onClose = vi.fn();
	render(<DialogForm title="New item" visible onClose={onClose} onSubmit={onSubmit} fields={<NameField />} {...props} />);
	return { onSubmit, onClose };
};

describe('DialogForm', () => {
	it('is not rendered while visible is falsy', () => {
		renderDialog({ visible: false });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('shows the title and the fields when visible', () => {
		renderDialog();
		expect(screen.getByRole('dialog', { name: 'New item' })).toBeInTheDocument();
		expect(screen.getByLabelText('name')).toBeInTheDocument();
	});

	it('Cancel closes the dialog without submitting anything', async () => {
		const { onSubmit, onClose } = renderDialog();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText('name'), 'draft');
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	// `visible` is controlled by the caller: a dialog that cannot say it wants to close stays open for ever. In YAML it is
	// `onClose: $closeX` with `closeX: { resultKey: <the visible key>, clear: true }`.
	describe('without onClose', () => {
		beforeEach(() => resetReportedMessages());

		it('says how to wire it when Cancel is pressed and nothing can close the dialog', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			render(<DialogForm title="New item" visible onSubmit={vi.fn().mockResolvedValue(undefined)} fields={<NameField />} />);
			await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
			const messages = warn.mock.calls.map(c => String(c[0]));
			expect(messages).toHaveLength(1);
			expect(messages[0]).toContain('[DialogForm] "New item"');
			expect(messages[0]).toContain('onClose');
			expect(messages[0]).toContain('clear: true');
			warn.mockRestore();
		});

		it('says it too after a successful Save', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			render(<DialogForm title="New item" visible onSubmit={vi.fn().mockResolvedValue(undefined)} fields={<NameField />} />);
			const user = userEvent.setup();
			await user.type(screen.getByLabelText('name'), 'Ada');
			await user.click(screen.getByRole('button', { name: 'Save' }));
			await waitFor(() => expect(warn).toHaveBeenCalled());
			warn.mockRestore();
		});

		it('stays silent when onClose is given', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const { onClose } = renderDialog();
			await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
			expect(onClose).toHaveBeenCalledTimes(1);
			expect(warn).not.toHaveBeenCalled();
			warn.mockRestore();
		});
	});

	it('Save submits the typed data, then closes', async () => {
		const { onSubmit, onClose } = renderDialog();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText('name'), 'Ada');
		await user.click(screen.getByRole('button', { name: 'Save' }));
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ name: 'Ada' });
	});

	it('a failed submit keeps the dialog open with the typed data', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { onClose } = renderDialog({ onSubmit: vi.fn().mockRejectedValue(new Error('503')) });
		const user = userEvent.setup();
		await user.type(screen.getByLabelText('name'), 'Ada');
		await user.click(screen.getByRole('button', { name: 'Save' }));
		await waitFor(() => expect(error).toHaveBeenCalled());
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByLabelText('name')).toHaveValue('Ada');
		error.mockRestore();
	});

	describe('edit mode (initialData has an id)', () => {
		it('prefills the form, and submits through onSubmit with the id as a string', async () => {
			const { onSubmit } = renderDialog({ initialData: { id: 7, name: 'Old' } });
			expect(screen.getByLabelText('name')).toHaveValue('Old');
			const user = userEvent.setup();
			await user.type(screen.getByLabelText('name'), '!');
			await user.click(screen.getByRole('button', { name: 'Save' }));
			await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ id: '7', name: 'Old!' }));
		});

		it('uses onSubmitEdit instead of onSubmit when it is given', async () => {
			const onSubmitEdit = vi.fn().mockResolvedValue(undefined);
			const { onSubmit } = renderDialog({ initialData: { id: 'a1', name: 'Old' }, onSubmitEdit });
			const user = userEvent.setup();
			await user.type(screen.getByLabelText('name'), '!');
			await user.click(screen.getByRole('button', { name: 'Save' }));
			await waitFor(() => expect(onSubmitEdit).toHaveBeenCalledExactlyOnceWith({ id: 'a1', name: 'Old!' }));
			expect(onSubmit).not.toHaveBeenCalled();
		});
	});

	describe('create mode with initialData (no id)', () => {
		it('pre-populates the form, and submits the prefilled values through onSubmit without adding an id', async () => {
			const onSubmitEdit = vi.fn();
			const { onSubmit } = renderDialog({ initialData: { name: 'Template' }, onSubmitEdit });
			expect(screen.getByLabelText('name')).toHaveValue('Template');
			const user = userEvent.setup();
			await user.type(screen.getByLabelText('name'), ' 2');
			await user.click(screen.getByRole('button', { name: 'Save' }));
			await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ name: 'Template 2' }));
			expect(onSubmitEdit).not.toHaveBeenCalled();
		});

		it('ignores the { _ts } marker a no-url $actions entry (openCreate) stores, so it never reaches the submitted data', async () => {
			// resultKey without url: GenericPageRunner stores `{ _ts: Date.now() }` as the "dialog is open" trigger.
			const { onSubmit } = renderDialog({ initialData: { _ts: 1730000000000 } });
			expect(screen.getByLabelText('name')).toHaveValue('');
			const user = userEvent.setup();
			await user.type(screen.getByLabelText('name'), 'Ada');
			await user.click(screen.getByRole('button', { name: 'Save' }));
			await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
			expect(onSubmit.mock.calls[0]![0]).toStrictEqual({ name: 'Ada' });
		});

		it.each([[null], [undefined]])('an id of %s is create mode, not an edit of "null"/"undefined"', async idValue => {
			const onSubmitEdit = vi.fn();
			const { onSubmit } = renderDialog({ initialData: { id: idValue, name: 'Draft' } as never, onSubmitEdit });
			const user = userEvent.setup();
			await user.type(screen.getByLabelText('name'), '!');
			await user.click(screen.getByRole('button', { name: 'Save' }));
			await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
			expect(onSubmitEdit).not.toHaveBeenCalled();
			expect(onSubmit.mock.calls[0]![0]).toMatchObject({ name: 'Draft!' });
			expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty('id', 'null');
			expect(onSubmit.mock.calls[0]![0]).not.toHaveProperty('id', 'undefined');
		});
	});

	it('create mode: data without an id does not add one and uses onSubmit', async () => {
		const onSubmitEdit = vi.fn();
		const { onSubmit } = renderDialog({ initialData: null, onSubmitEdit });
		const user = userEvent.setup();
		await user.type(screen.getByLabelText('name'), 'Ada');
		await user.click(screen.getByRole('button', { name: 'Save' }));
		await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ name: 'Ada' }));
		expect(onSubmitEdit).not.toHaveBeenCalled();
	});
});
