// A form knows whether it can be submitted: its messages (info, warning, error) come from the page (`messages`), from a validator
// (`validate`) and from its fields (`FieldWrapper` `error`). An error blocks the submit; a warning does not; info never matters.
// ButtonSubmit and FormMessages read that state, so the page wires nothing by hand.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetReportedMessages } from '../dev/reportOnce.js';
import { ButtonSubmit } from './ButtonSubmit.js';
import { FieldWrapper } from './FieldWrapper.js';
import { Form, type FormMessage } from './Form.js';
import { FormMessages } from './FormMessages.js';

beforeEach(() => resetReportedMessages());

const submit = () => screen.getByRole('button', { name: /^(Save|Delete|Saving)/ });

function renderForm(props: { messages?: FormMessage[]; validate?: (data: Record<string, unknown>) => FormMessage[]; onSubmit?: () => Promise<void>; fields?: React.ReactNode; actions?: React.ReactNode } = {}) {
	const onSubmit = props.onSubmit ?? vi.fn(async () => undefined);
	render(
		<Form
			initialData={{ name: 'a' }}
			onSubmit={onSubmit}
			messages={props.messages}
			validate={props.validate}
			fields={props.fields ?? <FormMessages />}
			actions={props.actions ?? <ButtonSubmit label="Save" />}
		/>
	);
	return onSubmit;
}

describe('an error blocks the submit', () => {
	const error: FormMessage = { severity: 'error', field: 'Name', text: 'is required' };

	it('disables ButtonSubmit with the first error as the reason', () => {
		renderForm({ messages: [error, { severity: 'error', text: 'second' }] });
		expect(submit()).toBeDisabled();
		expect(screen.getByRole('tooltip')).toHaveTextContent('Name: is required');
	});

	it('does not call onSubmit when the form is submitted anyway (Enter in a field)', () => {
		const onSubmit = renderForm({ messages: [error] });
		fireEvent.submit(submit().closest('form')!);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('lists it in FormMessages as an alert', () => {
		renderForm({ messages: [error] });
		expect(screen.getByRole('alert')).toHaveTextContent('Name: is required');
	});

	it('is lifted when the error goes away', () => {
		const { rerender } = render(<Form initialData={{}} onSubmit={async () => undefined} messages={[error]} fields={null} actions={<ButtonSubmit />} />);
		expect(submit()).toBeDisabled();
		rerender(<Form initialData={{}} onSubmit={async () => undefined} messages={[]} fields={null} actions={<ButtonSubmit />} />);
		expect(submit()).toBeEnabled();
	});
});

describe('a warning does not block, an info does not matter', () => {
	it('keeps ButtonSubmit enabled and says how many warnings', () => {
		const onSubmit = renderForm({ messages: [{ severity: 'warning', text: 'Name is short' }, { severity: 'warning', text: 'No email' }] });
		expect(submit()).toBeEnabled();
		expect(submit()).toHaveTextContent('2 warnings');
		fireEvent.submit(submit().closest('form')!);
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('shows warnings as a status, not an alert', () => {
		renderForm({ messages: [{ severity: 'warning', text: 'Name is short' }] });
		expect(screen.getByRole('status')).toHaveTextContent('Name is short');
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('an info leaves the button alone', () => {
		renderForm({ messages: [{ severity: 'info', text: 'Saved drafts are kept for 7 days' }] });
		expect(submit()).toBeEnabled();
		expect(submit()).not.toHaveTextContent('warning');
		expect(screen.getByText('Saved drafts are kept for 7 days')).toBeInTheDocument();
	});
});

describe('messages come from three sources, in one list', () => {
	it('validate(formData) is run on every change', () => {
		renderForm({
			validate: data => (String(data['name'] ?? '').length < 2 ? [{ severity: 'error', field: 'Name', text: 'at least 2 characters' }] : []),
			fields: (
				<>
					<FormMessages />
					<input aria-label="name" onChange={() => undefined} />
				</>
			),
		});
		expect(submit()).toBeDisabled();
		expect(screen.getByRole('alert')).toHaveTextContent('at least 2 characters');
	});

	it('a FieldWrapper error is reported to the form and blocks the submit', () => {
		function Field({ error }: { error?: string }) {
			return (
				<FieldWrapper label="Email" error={error}>
					<input />
				</FieldWrapper>
			);
		}
		const { rerender } = render(<Form initialData={{}} onSubmit={async () => undefined} fields={<><Field error="not an email" /><FormMessages /></>} actions={<ButtonSubmit />} />);
		expect(submit()).toBeDisabled();
		expect(screen.getAllByText(/not an email/).length).toBeGreaterThan(0);
		rerender(<Form initialData={{}} onSubmit={async () => undefined} fields={<><Field /><FormMessages /></>} actions={<ButtonSubmit />} />);
		expect(submit()).toBeEnabled();
	});
});

describe('ButtonSubmit', () => {
	it('is enabled with nothing modified: a confirm-delete form has no field and nothing to change', () => {
		renderForm({ actions: <ButtonSubmit label="Delete" variant="danger" /> });
		expect(submit()).toBeEnabled();
		expect(submit()).toHaveAttribute('type', 'submit');
	});

	it('requireChanges makes it wait for a modification, with the reason', () => {
		renderForm({ actions: <ButtonSubmit requireChanges /> });
		expect(submit()).toBeDisabled();
		expect(screen.getByRole('tooltip')).toHaveTextContent('No changes to save');
	});

	it('shows pendingLabel and stays off while the save runs', async () => {
		let release: () => void = () => undefined;
		const onSubmit = vi.fn(() => new Promise<void>(resolve => (release = resolve)));
		renderForm({ onSubmit, actions: <ButtonSubmit pendingLabel="Saving..." /> });
		fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form')!);
		expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled();
		await act(async () => release());
		expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
	});

	it('outside a Form it is off and tells the author', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(<ButtonSubmit />);
		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
		expect(warn.mock.calls.some(call => String(call[0]).includes('ButtonSubmit'))).toBe(true);
		warn.mockRestore();
	});
});
