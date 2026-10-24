import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldAutocomplete } from './FieldAutocomplete.js';

const options = [
	{ value: 'fr', label: 'France' },
	{ value: 'de', label: 'Germany' },
	{ value: 'es', label: 'Spain' },
	{ value: 'it', label: 'Italy' },
];

const combobox = () => screen.getByRole('combobox');

describe('FieldAutocomplete', () => {
	it('renders label', () => {
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
		expect(screen.getByText('Country')).toBeInTheDocument();
	});

	it('the label names the input (clicking the label focuses it)', () => {
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
		expect(screen.getByRole('combobox', { name: 'Country' })).toBe(combobox());
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
		const input = combobox();
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'Ger' } });
		expect(screen.getByRole('option', { name: 'Germany' })).toBeInTheDocument();
	});

	it('filters options case-insensitively', () => {
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
		const input = combobox();
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'rance' } });
		expect(screen.getByRole('option', { name: 'France' })).toBeInTheDocument();
	});

	it('selecting an option calls onChange with the value', () => {
		const onChange = vi.fn();
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />);
		const input = combobox();
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'Spa' } });
		fireEvent.click(screen.getByRole('option', { name: 'Spain' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('es');
	});

	it('shows no options when nothing matches', () => {
		render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
		const input = combobox();
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'zzz' } });
		expect(screen.queryAllByRole('option')).toEqual([]);
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
		expect(combobox()).toBeDisabled();
	});

	it('shows the label of the selected value', () => {
		render(
			<FieldAutocomplete label="Country" options={options} value="de" onChange={vi.fn()} />,
		);
		expect(combobox()).toHaveValue('Germany');
	});

	describe('behaviour of the suggestion list', () => {
		const listbox = () => screen.queryByRole('listbox');

		it('lists only the matching options, in their original order', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = combobox();
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'a' } });
			expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['France', 'Germany', 'Spain', 'Italy']);
			fireEvent.change(input, { target: { value: 'an' } });
			expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['France', 'Germany']);
		});

		it('closes the list as soon as the NEW text matches nothing (not one keystroke later)', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = combobox();
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'G' } });
			expect(listbox()).not.toBeNull();
			fireEvent.change(input, { target: { value: 'Gzz' } });
			expect(listbox()).toBeNull();
		});

		it('clearing the text closes the list', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = combobox();
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'G' } });
			fireEvent.change(input, { target: { value: '' } });
			expect(listbox()).toBeNull();
		});

		it('typing alone never reports a value: only choosing an option does', () => {
			const onChange = vi.fn();
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />);
			const input = combobox();
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'Ger' } });
			expect(onChange).not.toHaveBeenCalled();
			fireEvent.click(screen.getByRole('option', { name: 'Germany' }));
			expect(onChange).toHaveBeenCalledExactlyOnceWith('de');
		});

		it('choosing an option fills the input with its label and closes the list', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = combobox();
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'Spa' } });
			fireEvent.click(screen.getByRole('option', { name: 'Spain' }));
			expect(input).toHaveValue('Spain');
			expect(listbox()).toBeNull();
		});

		it('Escape closes the list without choosing anything', () => {
			const onChange = vi.fn();
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />);
			const input = combobox();
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: 'Ger' } });
			expect(listbox()).not.toBeNull();
			fireEvent.keyDown(input, { key: 'Escape' });
			expect(listbox()).toBeNull();
			expect(onChange).not.toHaveBeenCalled();
		});

		it('focusing an empty field with options available opens the list; with no options it stays closed', () => {
			const { unmount } = render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			fireEvent.focus(combobox());
			expect(listbox()).not.toBeNull();
			unmount();
			render(<FieldAutocomplete label="Country" options={[]} value="" onChange={vi.fn()} />);
			fireEvent.focus(combobox());
			expect(listbox()).toBeNull();
		});
	});

	describe('combobox semantics and keyboard', () => {
		const typeAndOpen = (text: string) => {
			const input = combobox();
			fireEvent.focus(input);
			fireEvent.change(input, { target: { value: text } });
			return input;
		};

		it('exposes the list state: aria-expanded and aria-controls follow the listbox', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = combobox();
			expect(input).toHaveAttribute('aria-expanded', 'false');
			expect(input).not.toHaveAttribute('aria-controls');
			typeAndOpen('Ger');
			expect(input).toHaveAttribute('aria-expanded', 'true');
			expect(input).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
			expect(input).toHaveAttribute('aria-autocomplete', 'list');
		});

		it('the listbox is named by the field label and marks the selected option', () => {
			render(<FieldAutocomplete label="Country" options={options} value="de" onChange={vi.fn()} />);
			fireEvent.focus(combobox());
			expect(screen.getByRole('listbox', { name: 'Country' })).toBeInTheDocument();
			expect(screen.getAllByRole('option').map(o => [o.textContent, o.getAttribute('aria-selected')])).toEqual([
				['Germany', 'true'],
			]);
		});

		it('ArrowDown on a closed list opens it and highlights the first option', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = combobox();
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			const first = screen.getAllByRole('option')[0]!;
			expect(input).toHaveAttribute('aria-expanded', 'true');
			expect(input).toHaveAttribute('aria-activedescendant', first.id);
		});

		it('ArrowUp on a closed list opens it and highlights the last option', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = combobox();
			fireEvent.keyDown(input, { key: 'ArrowUp' });
			const last = screen.getAllByRole('option').at(-1)!;
			expect(input).toHaveAttribute('aria-activedescendant', last.id);
		});

		it('the arrows move the highlight one option at a time and wrap around', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = typeAndOpen('a');
			const active = () => screen.getAllByRole('option').findIndex(o => o.id === input.getAttribute('aria-activedescendant'));
			expect(active()).toBe(-1);
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			expect(active()).toBe(0);
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			expect(active()).toBe(1);
			fireEvent.keyDown(input, { key: 'ArrowUp' });
			expect(active()).toBe(0);
			fireEvent.keyDown(input, { key: 'ArrowUp' });
			expect(active()).toBe(3);
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			expect(active()).toBe(0);
		});

		it('the arrows prevent the default caret movement', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = typeAndOpen('a');
			expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(false);
		});

		it('the highlighted option is the only one styled as active', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = typeAndOpen('a');
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			const active = screen.getAllByRole('option').filter(o => o.className.split(' ').includes('bg-muted-bg'));
			expect(active.map(o => o.textContent)).toEqual(['Germany']);
		});

		it('Enter chooses the highlighted option, reports its value and does not submit the form', () => {
			const onChange = vi.fn();
			const onSubmit = vi.fn(e => e.preventDefault());
			render(
				<form onSubmit={onSubmit}>
					<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />
				</form>,
			);
			const input = typeAndOpen('a');
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false);
			expect(onChange).toHaveBeenCalledExactlyOnceWith('de');
			expect(input).toHaveValue('Germany');
			expect(screen.queryByRole('listbox')).toBeNull();
			expect(onSubmit).not.toHaveBeenCalled();
		});

		it('Enter with nothing highlighted keeps the typed text and lets the form handle the key', () => {
			const onChange = vi.fn();
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />);
			const input = typeAndOpen('Ger');
			expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true);
			expect(onChange).not.toHaveBeenCalled();
			expect(input).toHaveValue('Ger');
		});

		it('typing again clears the highlight so Enter cannot choose a stale option', () => {
			const onChange = vi.fn();
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />);
			const input = typeAndOpen('a');
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			fireEvent.change(input, { target: { value: 'an' } });
			expect(input).not.toHaveAttribute('aria-activedescendant');
			fireEvent.keyDown(input, { key: 'Enter' });
			expect(onChange).not.toHaveBeenCalled();
		});

		it('Escape clears the highlight as well as closing the list', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = typeAndOpen('a');
			fireEvent.keyDown(input, { key: 'ArrowDown' });
			fireEvent.keyDown(input, { key: 'Escape' });
			expect(input).toHaveAttribute('aria-expanded', 'false');
			expect(input).not.toHaveAttribute('aria-activedescendant');
		});

		it('the arrows do nothing when no option matches', () => {
			render(<FieldAutocomplete label="Country" options={options} value="" onChange={vi.fn()} />);
			const input = typeAndOpen('zzz');
			expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(true);
			expect(input).toHaveAttribute('aria-expanded', 'false');
		});

		it('a highlight left over by shrinking options is dropped instead of pointing past the list', () => {
			const onChange = vi.fn();
			const { rerender } = render(<FieldAutocomplete label="Country" options={options} value="" onChange={onChange} />);
			const input = typeAndOpen('a');
			fireEvent.keyDown(input, { key: 'ArrowUp' });
			rerender(<FieldAutocomplete label="Country" options={options.slice(0, 1)} value="" onChange={onChange} />);
			expect(input).not.toHaveAttribute('aria-activedescendant');
			fireEvent.keyDown(input, { key: 'Enter' });
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('value / label synchronisation', () => {
		it('a value that matches no option is shown as is', () => {
			render(<FieldAutocomplete label="Country" options={options} value="xx" onChange={vi.fn()} />);
			expect(combobox()).toHaveValue('xx');
		});

		it('an external change of value replaces the typed text with the new label', () => {
			const { rerender } = render(
				<FieldAutocomplete label="Country" options={options} value="fr" onChange={vi.fn()} />,
			);
			fireEvent.change(combobox(), { target: { value: 'Ger' } });
			rerender(<FieldAutocomplete label="Country" options={options} value="es" onChange={vi.fn()} />);
			expect(combobox()).toHaveValue('Spain');
		});

		it('the options arriving later resolve the label of an already selected value', () => {
			const { rerender } = render(
				<FieldAutocomplete label="Country" options={[]} value="de" onChange={vi.fn()} />,
			);
			expect(combobox()).toHaveValue('de');
			rerender(<FieldAutocomplete label="Country" options={options} value="de" onChange={vi.fn()} />);
			expect(combobox()).toHaveValue('Germany');
		});
	});
});
