import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldTextarea } from './FieldTextarea.js';

describe('FieldTextarea', () => {
	it('renders label', () => {
		render(<FieldTextarea label="Notes" value="" onChange={vi.fn()} />);
		expect(screen.getByText('Notes')).toBeInTheDocument();
	});

	it('the label names the textarea', () => {
		render(<FieldTextarea label="Notes" value="" onChange={vi.fn()} />);
		expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument();
	});

	it('displays value in textarea', () => {
		render(<FieldTextarea label="Notes" value="some text" onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('some text');
	});

	it('reports the new text once per edit, keeping line breaks', () => {
		const onChange = vi.fn();
		render(<FieldTextarea label="Notes" value="" onChange={onChange} />);
		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'line 1\nline 2' } });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('line 1\nline 2');
	});

	it('sets rows attribute (default 4)', () => {
		render(<FieldTextarea label="Notes" value="" onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveAttribute('rows', '4');
	});

	it('sets custom rows attribute', () => {
		render(<FieldTextarea label="Notes" value="" onChange={vi.fn()} rows={8} />);
		expect(screen.getByRole('textbox')).toHaveAttribute('rows', '8');
	});

	it('renders description when provided', () => {
		render(<FieldTextarea label="Notes" description="Enter your notes here" value="" onChange={vi.fn()} />);
		expect(screen.getByText('Enter your notes here')).toBeInTheDocument();
	});

	it('shows the placeholder while empty', () => {
		render(<FieldTextarea label="Notes" value="" onChange={vi.fn()} placeholder="Write something" />);
		expect(screen.getByPlaceholderText('Write something')).toBeInTheDocument();
	});

	it('disabled blocks the textarea', () => {
		render(<FieldTextarea label="Notes" value="x" onChange={vi.fn()} disabled />);
		expect(screen.getByRole('textbox')).toBeDisabled();
	});

	it('readOnly is marked, stays focusable and never reports an edit', () => {
		const onChange = vi.fn();
		render(<FieldTextarea label="Notes" value="fixed" onChange={onChange} readOnly />);
		const area = screen.getByRole('textbox');
		expect(area).toHaveAttribute('readonly');
		area.focus();
		expect(area).toHaveFocus();
		fireEvent.change(area, { target: { value: 'edited' } });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('an error is announced and tied to the textarea, which is flagged invalid', () => {
		render(<FieldTextarea label="Notes" value="" onChange={vi.fn()} error="Too short" />);
		const area = screen.getByRole('textbox');
		expect(screen.getByRole('alert')).toHaveTextContent('Too short');
		expect(area).toHaveAttribute('aria-invalid', 'true');
		expect(area.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
	});

	it('without an error the textarea carries no invalid or describedby attribute', () => {
		render(<FieldTextarea label="Notes" value="" onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
		expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
	});

	it('required is exposed to assistive technology', () => {
		render(<FieldTextarea label="Notes" value="" onChange={vi.fn()} required />);
		expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
	});
});
