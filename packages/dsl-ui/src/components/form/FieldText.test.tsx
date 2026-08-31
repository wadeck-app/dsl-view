import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldText } from './FieldText.js';

describe('FieldText', () => {
	it('renders label', () => {
		render(<FieldText label="Name" value="" onChange={vi.fn()} />);
		expect(screen.getByText('Name')).toBeInTheDocument();
	});

	it('renders description when provided', () => {
		render(<FieldText label="Name" description="Enter your full name" value="" onChange={vi.fn()} />);
		expect(screen.getByText('Enter your full name')).toBeInTheDocument();
	});

	it('displays value in input', () => {
		render(<FieldText label="Name" value="hello" onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('hello');
	});

	it('calls onChange with new value on input change', () => {
		const onChange = vi.fn();
		render(<FieldText label="Name" value="hello" onChange={onChange} />);
		fireEvent.change(screen.getByRole('textbox'), { target: { value: 'world' } });
		expect(onChange).toHaveBeenCalledWith('world');
	});
});
