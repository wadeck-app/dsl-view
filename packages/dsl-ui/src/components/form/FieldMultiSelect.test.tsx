import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldMultiSelect } from './FieldMultiSelect.js';

const options = [
	{ value: 'apple', label: 'Apple' },
	{ value: 'banana', label: 'Banana' },
	{ value: 'cherry', label: 'Cherry' },
	{ value: 'date', label: 'Date' },
];

describe('FieldMultiSelect', () => {
	it('renders label', () => {
		render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} />);
		expect(screen.getByText('Fruits')).toBeInTheDocument();
	});

	it('renders description when provided', () => {
		render(
			<FieldMultiSelect
				label="Fruits"
				description="Pick your fruits"
				options={options}
				value={[]}
				onChange={vi.fn()}
			/>,
		);
		expect(screen.getByText('Pick your fruits')).toBeInTheDocument();
	});

	it('shows placeholder when no values selected', () => {
		render(
			<FieldMultiSelect
				label="Fruits"
				options={options}
				value={[]}
				onChange={vi.fn()}
				placeholder="Choose fruits..."
			/>,
		);
		expect(screen.getByText('Choose fruits...')).toBeInTheDocument();
	});

	it('shows selected values as pills', () => {
		render(
			<FieldMultiSelect
				label="Fruits"
				options={options}
				value={['apple', 'banana']}
				onChange={vi.fn()}
			/>,
		);
		expect(screen.getByText('Apple')).toBeInTheDocument();
		expect(screen.getByText('Banana')).toBeInTheDocument();
	});

	it('opens dropdown on trigger click', () => {
		render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} />);
		const trigger = screen.getByRole('combobox');
		fireEvent.click(trigger);
		expect(screen.getByRole('option', { name: /Apple/i })).toBeInTheDocument();
	});

	it('clicking option adds it to selection', () => {
		const onChange = vi.fn();
		render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={onChange} />);
		// Open the dropdown
		const trigger = screen.getByRole('combobox');
		fireEvent.click(trigger);
		const option = screen.getByRole('option', { name: /Apple/i });
		fireEvent.click(option);
		expect(onChange).toHaveBeenCalledWith(['apple']);
	});

	it('clicking selected option removes it from selection', () => {
		const onChange = vi.fn();
		render(
			<FieldMultiSelect
				label="Fruits"
				options={options}
				value={['apple']}
				onChange={onChange}
			/>,
		);
		const trigger = screen.getByRole('combobox');
		fireEvent.click(trigger);
		const option = screen.getByRole('option', { name: /Apple/i });
		fireEvent.click(option);
		expect(onChange).toHaveBeenCalledWith([]);
	});

	it('clicking remove pill removes that value', () => {
		const onChange = vi.fn();
		render(
			<FieldMultiSelect
				label="Fruits"
				options={options}
				value={['apple', 'banana']}
				onChange={onChange}
			/>,
		);
		const removeApple = screen.getByRole('button', { name: 'Remove Apple' });
		fireEvent.click(removeApple);
		expect(onChange).toHaveBeenCalledWith(['banana']);
	});

	it('clear all button removes all selections', () => {
		const onChange = vi.fn();
		render(
			<FieldMultiSelect
				label="Fruits"
				options={options}
				value={['apple', 'banana']}
				onChange={onChange}
			/>,
		);
		const clearBtn = screen.getByRole('button', { name: 'Clear all' });
		fireEvent.click(clearBtn);
		expect(onChange).toHaveBeenCalledWith([]);
	});

	it('maxSelected prevents adding more options when limit reached', () => {
		const onChange = vi.fn();
		render(
			<FieldMultiSelect
				label="Fruits"
				options={options}
				value={['apple', 'banana']}
				onChange={onChange}
				maxSelected={2}
			/>,
		);
		const trigger = screen.getByRole('combobox');
		fireEvent.click(trigger);
		const cherryOption = screen.getByRole('option', { name: /Cherry/i });
		// Should be disabled when limit is reached
		expect(cherryOption).toHaveAttribute('aria-disabled', 'true');
	});

	it('maxSelected does not prevent removing when limit reached', () => {
		const onChange = vi.fn();
		render(
			<FieldMultiSelect
				label="Fruits"
				options={options}
				value={['apple', 'banana']}
				onChange={onChange}
				maxSelected={2}
			/>,
		);
		const removeApple = screen.getByRole('button', { name: 'Remove Apple' });
		fireEvent.click(removeApple);
		// Removing should still work
		expect(onChange).toHaveBeenCalledWith(['banana']);
	});

	it('shows error message when error prop provided', () => {
		render(
			<FieldMultiSelect
				label="Fruits"
				options={options}
				value={[]}
				onChange={vi.fn()}
				error="Selection is required"
			/>,
		);
		expect(screen.getByText('Selection is required')).toBeInTheDocument();
	});

	it('is disabled when disabled prop is true', () => {
		render(
			<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} disabled />,
		);
		// The combobox container has tabIndex=-1 and opacity-50 styling when disabled
		const trigger = screen.getByRole('combobox');
		expect(trigger).toHaveAttribute('tabindex', '-1');
	});

	it('shows required indicator when required prop is true', () => {
		render(
			<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} required />,
		);
		expect(screen.getByText('*')).toBeInTheDocument();
	});

	it('keyboard ArrowDown opens dropdown', () => {
		render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} />);
		const trigger = screen.getByRole('combobox');
		fireEvent.keyDown(trigger, { key: 'ArrowDown' });
		expect(screen.getByRole('listbox')).toBeInTheDocument();
	});

	it('keyboard Escape closes dropdown', () => {
		render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} />);
		const trigger = screen.getByRole('combobox');
		// Open first
		fireEvent.keyDown(trigger, { key: 'ArrowDown' });
		expect(screen.getByRole('listbox')).toBeInTheDocument();
		// Close with Escape
		fireEvent.keyDown(trigger, { key: 'Escape' });
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
	});

	it('keyboard Enter toggles focused option', () => {
		const onChange = vi.fn();
		render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={onChange} />);
		const trigger = screen.getByRole('combobox');
		// Open and set active to first option (index 0)
		fireEvent.keyDown(trigger, { key: 'ArrowDown' });
		// Press Enter to select first option
		fireEvent.keyDown(trigger, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledWith(['apple']);
	});

	it('renders hidden inputs for form submission when name provided', () => {
		const { container } = render(
			<FieldMultiSelect
				label="Fruits"
				options={options}
				value={['apple', 'banana']}
				onChange={vi.fn()}
				name="fruits"
			/>,
		);
		const hiddenInputs = container.querySelectorAll('input[type="hidden"]');
		expect(hiddenInputs).toHaveLength(2);
		expect(hiddenInputs[0]).toHaveAttribute('value', 'apple');
		expect(hiddenInputs[1]).toHaveAttribute('value', 'banana');
	});
});
