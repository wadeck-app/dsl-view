import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldTextarea } from './FieldTextarea.js';

describe('FieldTextarea', () => {
	it('renders label', () => {
		render(<FieldTextarea label="Notes" value="" onChange={vi.fn()} />);
		expect(screen.getByText('Notes')).toBeInTheDocument();
	});

	it('displays value in textarea', () => {
		render(<FieldTextarea label="Notes" value="some text" onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('some text');
	});

	it('calls onChange on input', () => {
		const onChange = vi.fn();
		render(<FieldTextarea label="Notes" value="" onChange={onChange} />);
		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new text' } });
		expect(onChange).toHaveBeenCalledWith('new text');
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
});
