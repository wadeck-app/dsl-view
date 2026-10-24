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

	describe('behaviour of the suggestion list', () => {
		const listbox = () => document.querySelector('[data-radix-popper-content-wrapper]');

		it('lists only the matching options, in their original order', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = screen.getByRole('textbox');
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'a' } });
			expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(['France', 'Germany', 'Spain', 'Italy']);
			fireEvent.change(input, { target: { value: 'an' } });
			expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(['France', 'Germany']);
		});

		it('closes the list as soon as the NEW text matches nothing (not one keystroke later)', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = screen.getByRole('textbox');
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'G' } });
			expect(listbox()).not.toBeNull();
			fireEvent.change(input, { target: { value: 'Gzz' } });
			expect(listbox()).toBeNull();
		});

		it('clearing the text closes the list', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = screen.getByRole('textbox');
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'G' } });
			fireEvent.change(input, { target: { value: '' } });
			expect(listbox()).toBeNull();
		});

		it('typing alone never reports a value: only choosing an option does', () => {
			const onChange = vi.fn();
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />);
			const input = screen.getByRole('textbox');
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'Ger' } });
			expect(onChange).not.toHaveBeenCalled();
			fireEvent.click(screen.getByRole('button', { name: 'Germany' }));
			expect(onChange).toHaveBeenCalledExactlyOnceWith('de');
		});

		it('choosing an option fills the input with its label and closes the list', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = screen.getByRole('textbox');
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'Spa' } });
			fireEvent.click(screen.getByRole('button', { name: 'Spain' }));
			expect(input).toHaveValue('Spain');
			expect(listbox()).toBeNull();
		});

		it('Escape closes the list without choosing anything', () => {
			const onChange = vi.fn();
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />);
			const input = screen.getByRole('textbox');
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'Ger' } });
			expect(listbox()).not.toBeNull();
			fireEvent.keyDown(input, { key: 'Escape' });
			expect(listbox()).toBeNull();
			expect(onChange).not.toHaveBeenCalled();
		});

		it('focusing an empty field with options available opens the list; with no options it stays closed', () => {
			const { unmount } = render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			fireEvent.focus(screen.getByRole('textbox'));
			expect(listbox()).not.toBeNull();
			unmount();
			render(<FieldAutocomplete label="Country" options={[]} value="" onChange={vi.fn()} />);
			fireEvent.focus(screen.getByRole('textbox'));
			expect(listbox()).toBeNull();
		});
	});

	describe('value / label synchronisation', () => {
		it('a value that matches no option is shown as is', () => {
			render(<FieldAutocomplete label="Country" options={options} value="xx" onChange={vi.fn()} />);
			expect(screen.getByRole('textbox')).toHaveValue('xx');
		});

		it('an external change of value replaces the typed text with the new label', () => {
			const { rerender } = render(
				<FieldAutocomplete label="Country" options={options} value="fr" onChange={vi.fn()} />,
			);
			fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ger' } });
			rerender(<FieldAutocomplete label="Country" options={options} value="es" onChange={vi.fn()} />);
			expect(screen.getByRole('textbox')).toHaveValue('Spain');
		});

		it('the options arriving later resolve the label of an already selected value', () => {
			const { rerender } = render(
				<FieldAutocomplete label="Country" options={[]} value="de" onChange={vi.fn()} />,
			);
			expect(screen.getByRole('textbox')).toHaveValue('de');
			rerender(<FieldAutocomplete label="Country" options={options} value="de" onChange={vi.fn()} />);
			expect(screen.getByRole('textbox')).toHaveValue('Germany');
		});
	});
});
