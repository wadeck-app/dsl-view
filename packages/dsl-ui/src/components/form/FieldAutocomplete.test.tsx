import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldAutocomplete } from './FieldAutocomplete.js';

const options = [
	{ value: 'fr', label: 'France' },
	{ value: 'de', label: 'Germany' },
	{ value: 'es', label: 'Spain' },
	{ value: 'it', label: 'Italy' },
];

describe('FieldAutocomplete', () => {
	it('renders label', () => {
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
		expect(screen.getByText('Country')).toBeInTheDocument();
	});

	it('renders input with placeholder', () => {
		render(
			<FieldAutocomplete
				label="Country"
				options={options}
				value=""
				onChange={vi.fn()}
				placeholder="Search..."
			/>,
		);
		expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
	});

	it('shows matching options on input', () => {
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
		const input = screen.getByRole('textbox');
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'Ger' } });
		expect(screen.getByText('Germany')).toBeInTheDocument();
	});

	it('filters options case-insensitively', () => {
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
		const input = screen.getByRole('textbox');
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'rance' } });
		expect(screen.getByText('France')).toBeInTheDocument();
	});

	it('selecting an option calls onChange with the value', () => {
		const onChange = vi.fn();
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'Spa' } });
		fireEvent.click(screen.getByText('Spain'));
		expect(onChange).toHaveBeenCalledWith('es');
	});

	it('shows no options when nothing matches', () => {
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
		const input = screen.getByRole('textbox');
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'zzz' } });
		expect(screen.queryByText('France')).not.toBeInTheDocument();
		expect(screen.queryByText('Germany')).not.toBeInTheDocument();
	});

	it('displays description when provided', () => {
		render(
			<FieldAutocomplete
				label="Country"
				description="Select your country"
				options={options}
				value=""
				onChange={vi.fn()}
			/>,
		);
		expect(screen.getByText('Select your country')).toBeInTheDocument();
	});

	it('is disabled when disabled prop is true', () => {
		render(
			<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} disabled />,
		);
		expect(screen.getByRole('textbox')).toBeDisabled();
	});

	it('shows the label of the selected value', () => {
		render(
			<FieldAutocomplete label="Country" options={options} value="de" onChange={vi.fn()} />,
		);
		expect(screen.getByRole('textbox')).toHaveValue('Germany');
	});
});
