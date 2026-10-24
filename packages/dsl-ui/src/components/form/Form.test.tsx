import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ButtonCancel } from './ButtonCancel.js';
import { ButtonSave } from './ButtonSave.js';
import { Form, useFormContext } from './Form.js';
import { UnsavedBadge } from './UnsavedBadge.js';

function FormDataDisplay() {
	const ctx = useFormContext();
	return <div data-testid="form-data">{JSON.stringify(ctx?.formData)}</div>;
}

/** A field bound to the form context, like the generated bind-pattern wrappers. */
function NameField() {
	const ctx = useFormContext()!;
	return <input aria-label="name" value={String(ctx.formData['name'] ?? '')} onChange={e => ctx.onChange('name', e.target.value)} />;
}

const formEl = (container: HTMLElement) => container.querySelector('form')!;

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
		fireEvent.submit(formEl(container));
		await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ name: 'Alice' }));
	});

	it('prevents default browser submit', () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const { container } = render(
			<Form fields={<div />} actions={<button type="submit">Go</button>} onSubmit={onSubmit} />
		);
		const event = new Event('submit', { bubbles: true, cancelable: true });
		formEl(container).dispatchEvent(event);
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

	it('renders no actions row when there are no actions', () => {
		const { container } = render(<Form fields={<div />} actions={null} onSubmit={vi.fn().mockResolvedValue(undefined)} />);
		expect(formEl(container).children).toHaveLength(1);
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

	it('renders when the initialData carries a DOM element (what a click handler passes along), without crashing the page', () => {
		// The library "Create book" dialog crashed the whole page here: the clicked button reached the form as data and
		// JSON.stringify choked on its circular React fiber.
		const button = document.createElement('button');
		(button as unknown as Record<string, unknown>)['__reactFiber$x'] = { stateNode: button };

		render(
			<Form
				fields={<NameField />}
				actions={<UnsavedBadge />}
				onSubmit={vi.fn().mockResolvedValue(undefined)}
				initialData={{ name: 'Dune', currentTarget: button }}
			/>
		);

		expect(screen.getByLabelText('name')).toHaveValue('Dune');
		expect(screen.queryByText('Unsaved changes')).toBeNull();
	});

	it('never hands a DOM element from the initialData to onSubmit (it would reach the request body)', async () => {
		const button = document.createElement('button');
		const onSubmit = vi.fn().mockResolvedValue(undefined);

		render(<Form fields={<NameField />} actions={<ButtonSave />} onSubmit={onSubmit} initialData={{ name: 'Dune', currentTarget: button }} />);
		fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Dune II' } });
		fireEvent.click(screen.getByRole('button', { name: /save/i }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		expect(onSubmit).toHaveBeenCalledWith({ name: 'Dune II' });
	});

	it('starts with empty formData when there is no initialData', () => {
		render(<Form fields={<FormDataDisplay />} actions={<div />} onSubmit={vi.fn().mockResolvedValue(undefined)} />);
		expect(screen.getByTestId('form-data')).toHaveTextContent('{}');
	});

	describe('editing and unsaved changes', () => {
		const renderEditable = (onSubmit = vi.fn().mockResolvedValue(undefined), initialData: Record<string, unknown> = { name: 'Alice' }) =>
			render(<Form fields={<><NameField /><UnsavedBadge /></>} actions={<ButtonSave />} onSubmit={onSubmit} initialData={initialData} />);

		it('an edit updates only its own key and marks the form as having unsaved changes', () => {
			renderEditable(undefined, { name: 'Alice', age: 3 });
			expect(screen.queryByText('Unsaved changes')).toBeNull();
			fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Bob' } });
			expect(screen.getByLabelText('name')).toHaveValue('Bob');
			expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
		});

		it('submitting sends the edited data and clears the unsaved state once it succeeds', async () => {
			const onSubmit = vi.fn().mockResolvedValue(undefined);
			const { container } = renderEditable(onSubmit, { name: 'Alice', age: 3 });
			fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Bob' } });
			fireEvent.submit(formEl(container));
			await waitFor(() => expect(screen.queryByText('Unsaved changes')).toBeNull());
			expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ name: 'Bob', age: 3 });
			expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
		});

		it('a failed submit keeps the edits, stays unsaved, logs the cause and re-enables the form', async () => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			const cause = new Error('503');
			const onSubmit = vi.fn().mockRejectedValue(cause);
			const { container } = renderEditable(onSubmit);
			fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Bob' } });
			fireEvent.submit(formEl(container));
			await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
			expect(screen.getByLabelText('name')).toHaveValue('Bob');
			expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
			expect(error).toHaveBeenCalledExactlyOnceWith('[Form] onSubmit failed; the form keeps its values and stays unsaved:', cause);
			error.mockRestore();
		});

		it('a second submit while the first is running is ignored', async () => {
			let resolve!: () => void;
			const onSubmit = vi.fn(() => new Promise<void>(r => { resolve = r; }));
			const { container } = renderEditable(onSubmit);
			fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Bob' } });
			fireEvent.submit(formEl(container));
			fireEvent.submit(formEl(container));
			expect(onSubmit).toHaveBeenCalledTimes(1);
			await act(async () => { resolve(); });
			fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Carl' } });
			fireEvent.submit(formEl(container));
			expect(onSubmit).toHaveBeenCalledTimes(2);
		});
	});

	describe('server data refresh', () => {
		const ui = (initialData: Record<string, unknown>) => (
			<Form fields={<NameField />} actions={null} onSubmit={vi.fn().mockResolvedValue(undefined)} initialData={initialData} />
		);

		it('new server data replaces the form content', () => {
			const { rerender } = render(ui({ name: 'Alice' }));
			rerender(ui({ name: 'Zed' }));
			expect(screen.getByLabelText('name')).toHaveValue('Zed');
		});

		it('a refresh with the same content in a new object (a poll) keeps the edits in progress', () => {
			const { rerender } = render(ui({ name: 'Alice' }));
			fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Bob' } });
			rerender(ui({ name: 'Alice' }));
			expect(screen.getByLabelText('name')).toHaveValue('Bob');
		});

		it('the first render does not reset anything', () => {
			render(ui({ name: 'Alice' }));
			expect(screen.getByLabelText('name')).toHaveValue('Alice');
		});

		it('a refresh to no data leaves the form as it is', () => {
			const { rerender } = render(ui({ name: 'Alice' }));
			rerender(<Form fields={<NameField />} actions={null} onSubmit={vi.fn().mockResolvedValue(undefined)} />);
			expect(screen.getByLabelText('name')).toHaveValue('Alice');
		});

		// An "add" form is fed with constant defaults: the page reloads its sources after a successful save and the
		// reload hands the same content in a new object. That reload is what clears the typed text.
		describe('after a submit', () => {
			const submitUi = (onSubmit: () => Promise<void>, initialData: Record<string, unknown>) => (
				<Form fields={<NameField />} actions={null} onSubmit={onSubmit} initialData={initialData} />
			);

			it('a successful save followed by a reload with the same content resets the form to the server data', async () => {
				const onSubmit = vi.fn().mockResolvedValue(undefined);
				const { container, rerender } = render(submitUi(onSubmit, { name: '' }));
				fireEvent.change(screen.getByLabelText('name'), { target: { value: 'label-1' } });
				fireEvent.submit(formEl(container));
				await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
				rerender(submitUi(onSubmit, { name: '' }));
				expect(screen.getByLabelText('name')).toHaveValue('');
			});

			it('a reload that lands while the save is still running resets the form once the save succeeds', async () => {
				let resolve!: () => void;
				const onSubmit = vi.fn(() => new Promise<void>(r => { resolve = r; }));
				const { container, rerender } = render(submitUi(onSubmit, { name: '' }));
				fireEvent.change(screen.getByLabelText('name'), { target: { value: 'label-1' } });
				fireEvent.submit(formEl(container));
				rerender(submitUi(onSubmit, { name: '' }));
				expect(screen.getByLabelText('name')).toHaveValue('label-1');
				await act(async () => { resolve(); });
				expect(screen.getByLabelText('name')).toHaveValue('');
			});

			it('a refused save keeps what was typed, also when the reload re-sends the same content', async () => {
				const error = vi.spyOn(console, 'error').mockImplementation(() => {});
				const onSubmit = vi.fn().mockRejectedValue(new Error('refused'));
				const { container, rerender } = render(submitUi(onSubmit, { name: '' }));
				fireEvent.change(screen.getByLabelText('name'), { target: { value: 'label-1' } });
				fireEvent.submit(formEl(container));
				await waitFor(() => expect(error).toHaveBeenCalledTimes(1));
				rerender(submitUi(onSubmit, { name: '' }));
				expect(screen.getByLabelText('name')).toHaveValue('label-1');
				error.mockRestore();
			});

			it('a refused save after an earlier successful one still keeps what was typed', async () => {
				const error = vi.spyOn(console, 'error').mockImplementation(() => {});
				const onSubmit = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('refused'));
				const { container, rerender } = render(submitUi(onSubmit, { name: '' }));
				fireEvent.change(screen.getByLabelText('name'), { target: { value: 'label-1' } });
				fireEvent.submit(formEl(container));
				await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
				await act(async () => {});
				fireEvent.change(screen.getByLabelText('name'), { target: { value: 'label-2' } });
				fireEvent.submit(formEl(container));
				await waitFor(() => expect(error).toHaveBeenCalledTimes(1));
				rerender(submitUi(onSubmit, { name: '' }));
				expect(screen.getByLabelText('name')).toHaveValue('label-2');
				error.mockRestore();
			});

			it('a successful save with no reload keeps the saved values on screen', async () => {
				const onSubmit = vi.fn().mockResolvedValue(undefined);
				const { container } = render(submitUi(onSubmit, { name: 'Alice' }));
				fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Bob' } });
				fireEvent.submit(formEl(container));
				await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
				await act(async () => {});
				expect(screen.getByLabelText('name')).toHaveValue('Bob');
			});

			it('only the first reload after a save resets: edits typed afterwards survive a later poll', async () => {
				const onSubmit = vi.fn().mockResolvedValue(undefined);
				const { container, rerender } = render(submitUi(onSubmit, { name: '' }));
				fireEvent.change(screen.getByLabelText('name'), { target: { value: 'label-1' } });
				fireEvent.submit(formEl(container));
				await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
				rerender(submitUi(onSubmit, { name: '' }));
				fireEvent.change(screen.getByLabelText('name'), { target: { value: 'label-2' } });
				rerender(submitUi(onSubmit, { name: '' }));
				expect(screen.getByLabelText('name')).toHaveValue('label-2');
			});
		});
	});

	describe('action buttons inside the form', () => {
		it('Cancel never submits the form, Save does', async () => {
			const onSubmit = vi.fn().mockResolvedValue(undefined);
			const onCancel = vi.fn();
			render(
				<Form
					fields={<NameField />}
					actions={<><ButtonSave /><ButtonCancel onCancel={onCancel} /></>}
					onSubmit={onSubmit}
					initialData={{ name: 'Alice' }}
				/>
			);
			const user = userEvent.setup();
			await user.type(screen.getByLabelText('name'), '!');
			await user.click(screen.getByRole('button', { name: 'Cancel' }));
			expect(onCancel).toHaveBeenCalledTimes(1);
			expect(onSubmit).not.toHaveBeenCalled();
			await user.click(screen.getByRole('button', { name: 'Save' }));
			await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ name: 'Alice!' }));
		});
	});
});
