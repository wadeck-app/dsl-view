import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Form, useFormContext } from './Form.js';
import { UnsavedBadge } from './UnsavedBadge.js';

function EditButton() {
	const ctx = useFormContext()!;
	return <button type="button" onClick={() => ctx.onChange('x', 2)}>edit</button>;
}

const form = (fields: React.ReactNode) => (
	<Form fields={fields} actions={<div />} onSubmit={vi.fn().mockResolvedValue(undefined)} initialData={{ x: 1 }} />
);

describe('UnsavedBadge', () => {
	it('returns null when hasChanges=false', () => {
		const { container } = render(<UnsavedBadge hasChanges={false} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders "Unsaved changes" when hasChanges=true', () => {
		render(<UnsavedBadge hasChanges={true} />);
		expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
	});

	it('outside a form and without a prop it shows nothing', () => {
		const { container } = render(<UnsavedBadge />);
		expect(container).toBeEmptyDOMElement();
	});

	it('reads hasChanges from FormContext - hidden when no changes', () => {
		render(form(<UnsavedBadge />));
		expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
	});

	it('appears as soon as the form is edited', () => {
		render(form(<><UnsavedBadge /><EditButton /></>));
		fireEvent.click(screen.getByRole('button', { name: 'edit' }));
		expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
	});

	it('an explicit prop wins over the form state, in both directions', () => {
		const { unmount } = render(form(<UnsavedBadge hasChanges />));
		expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
		unmount();
		render(form(<><UnsavedBadge hasChanges={false} /><EditButton /></>));
		fireEvent.click(screen.getByRole('button', { name: 'edit' }));
		expect(screen.queryByText('Unsaved changes')).toBeNull();
	});
});
