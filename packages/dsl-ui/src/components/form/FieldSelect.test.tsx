import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FieldSelect } from './FieldSelect.js';

const options = [
	{ value: 'a', label: 'Alpha' },
	{ value: 'b', label: 'Beta' },
];

describe('FieldSelect', () => {
	it('renders its options and the current value', () => {
		render(<FieldSelect label="Kind" value="b" onChange={vi.fn()} options={options} />);

		expect(screen.getByLabelText('Kind')).toHaveValue('b');
		expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
	});

	it('reports the chosen value', () => {
		const onChange = vi.fn();
		render(<FieldSelect label="Kind" value="a" onChange={onChange} options={options} />);

		fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'b' } });

		expect(onChange).toHaveBeenCalledWith('b');
	});

	it('shows a placeholder option when given', () => {
		render(<FieldSelect label="Kind" value="" onChange={vi.fn()} options={options} placeholder="Pick one" />);

		expect(screen.getByRole('option', { name: 'Pick one' })).toBeInTheDocument();
	});

	// Reported as "the arrow is stuck against the right edge". A native select draws its own
	// arrow inside the box, so symmetric px-3 leaves the glyph flush against the border.
	// Suppressing the native arrow and drawing our own is what lets it be inset properly.
	it('draws its own chevron instead of the native one', () => {
		const { container } = render(<FieldSelect label="Kind" value="a" onChange={vi.fn()} options={options} />);

		const select = screen.getByLabelText('Kind');
		expect(select.className).toContain('appearance-none');
		expect(container.querySelector('svg')).not.toBeNull();
	});

	it('reserves room on the right so the chevron never touches the border', () => {
		render(<FieldSelect label="Kind" value="a" onChange={vi.fn()} options={options} />);

		const cls = screen.getByLabelText('Kind').className;
		// Right padding must exceed the symmetric px-3, or the text runs under the chevron.
		expect(cls).toMatch(/\bpr-9\b/);
	});

	// The chevron is decoration; announcing it would add noise to the select's name.
	it('hides the chevron from assistive technology', () => {
		const { container } = render(<FieldSelect label="Kind" value="a" onChange={vi.fn()} options={options} />);

		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
	});

	it('carries the label and validation wiring of every field', () => {
		render(<FieldSelect label="Kind" value="" onChange={vi.fn()} options={options} required error="Pick a kind" />);

		expect(screen.getByRole('alert')).toHaveTextContent('Pick a kind');
		const select = screen.getByLabelText(/Kind/);
		expect(select).toHaveAttribute('aria-invalid', 'true');
		expect(select).toHaveAttribute('aria-required', 'true');
	});
});
