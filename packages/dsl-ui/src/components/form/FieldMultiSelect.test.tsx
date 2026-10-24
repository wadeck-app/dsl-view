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

	describe('selection and display', () => {
		it('a selected value that matches no option is shown as its raw value', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={['kiwi']} onChange={vi.fn()} />);
			expect(screen.getByText('kiwi')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Remove kiwi' })).toBeInTheDocument();
		});

		it('pills keep the order of the value, not the order of the options', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={['date', 'apple']} onChange={vi.fn()} />);
			expect(screen.getAllByRole('button', { name: /^Remove / }).map(b => b.getAttribute('aria-label'))).toEqual([
				'Remove Date',
				'Remove Apple',
			]);
		});

		it('selecting appends to the value and removing keeps the others in order', () => {
			const onChange = vi.fn();
			render(<FieldMultiSelect label="Fruits" options={options} value={['date', 'apple']} onChange={onChange} />);
			fireEvent.click(screen.getByRole('combobox'));
			fireEvent.click(screen.getByRole('option', { name: /Banana/ }));
			expect(onChange).toHaveBeenLastCalledWith(['date', 'apple', 'banana']);
			fireEvent.click(screen.getByRole('option', { name: /Date/ }));
			expect(onChange).toHaveBeenLastCalledWith(['apple']);
		});

		it('options report their selected state to assistive tech', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={['banana']} onChange={vi.fn()} />);
			fireEvent.click(screen.getByRole('combobox'));
			expect(screen.getAllByRole('option').map(o => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false']);
			expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
			expect(screen.getByRole('listbox', { name: 'Fruits' })).toBeInTheDocument();
		});

		it('is controlled: clicking an option does not select it by itself', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} />);
			fireEvent.click(screen.getByRole('combobox'));
			fireEvent.click(screen.getByRole('option', { name: /Apple/ }));
			expect(screen.getByText('Select...')).toBeInTheDocument();
		});

		it('with the limit reached, a blocked option cannot be selected and the others stay as they are', () => {
			const onChange = vi.fn();
			render(<FieldMultiSelect label="Fruits" options={options} value={['apple', 'banana']} onChange={onChange} maxSelected={2} />);
			fireEvent.click(screen.getByRole('combobox'));
			fireEvent.click(screen.getByRole('option', { name: /Cherry/ }));
			expect(onChange).not.toHaveBeenCalled();
			expect(screen.getByRole('option', { name: /Cherry/ })).toBeDisabled();
			expect(screen.getByRole('option', { name: /Apple/ })).toBeEnabled();
		});

		it('below the limit nothing is blocked', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={['apple']} onChange={vi.fn()} maxSelected={2} />);
			fireEvent.click(screen.getByRole('combobox'));
			expect(screen.getAllByRole('option').filter(o => (o as HTMLButtonElement).disabled)).toHaveLength(0);
		});

		it('clicking the pill remove or clear-all button does not open the list', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={['apple']} onChange={vi.fn()} />);
			fireEvent.click(screen.getByRole('button', { name: 'Remove Apple' }));
			fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		});
	});

	describe('keyboard', () => {
		const combo = () => screen.getByRole('combobox');

		it('Enter and Space on the closed field open it without selecting anything', () => {
			const onChange = vi.fn();
			render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={onChange} />);
			fireEvent.keyDown(combo(), { key: 'Enter' });
			expect(screen.getByRole('listbox')).toBeInTheDocument();
			expect(onChange).not.toHaveBeenCalled();
			fireEvent.keyDown(combo(), { key: 'Escape' });
			fireEvent.keyDown(combo(), { key: ' ' });
			expect(screen.getByRole('listbox')).toBeInTheDocument();
			expect(onChange).not.toHaveBeenCalled();
		});

		it('ArrowDown / ArrowUp move the active option and stop at the ends', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} />);
			fireEvent.keyDown(combo(), { key: 'ArrowDown' });
			const active = () => screen.getAllByRole('option').findIndex(o => o.getAttribute('data-active') === 'true');
			expect(active()).toBe(0);
			fireEvent.keyDown(combo(), { key: 'ArrowUp' });
			expect(active()).toBe(0);
			for (let i = 0; i < 6; i++) {
				fireEvent.keyDown(combo(), { key: 'ArrowDown' });
			}
			expect(active()).toBe(3);
		});

		it('Enter and Space toggle the active option, and a second Enter removes it again', () => {
			const onChange = vi.fn();
			const { rerender } = render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={onChange} />);
			fireEvent.keyDown(combo(), { key: 'ArrowDown' });
			fireEvent.keyDown(combo(), { key: 'ArrowDown' });
			fireEvent.keyDown(combo(), { key: ' ' });
			expect(onChange).toHaveBeenLastCalledWith(['banana']);
			rerender(<FieldMultiSelect label="Fruits" options={options} value={['banana']} onChange={onChange} />);
			fireEvent.keyDown(combo(), { key: 'Enter' });
			expect(onChange).toHaveBeenLastCalledWith([]);
		});

		it('hovering an option makes it the active one for the next Enter', () => {
			const onChange = vi.fn();
			render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={onChange} />);
			fireEvent.click(combo());
			fireEvent.mouseEnter(screen.getByRole('option', { name: /Cherry/ }));
			fireEvent.keyDown(combo(), { key: 'Enter' });
			expect(onChange).toHaveBeenCalledExactlyOnceWith(['cherry']);
		});

		it('Escape closes the list, keeps the focus on the field and does not change the value', () => {
			const onChange = vi.fn();
			render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={onChange} />);
			// A keyboard user is on the field when pressing the keys.
			combo().focus();
			fireEvent.keyDown(combo(), { key: 'ArrowDown' });
			fireEvent.keyDown(combo(), { key: 'Escape' });
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
			expect(document.activeElement).toBe(combo());
			expect(onChange).not.toHaveBeenCalled();
		});

		it('exposes the open state through aria-expanded', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} />);
			expect(combo()).toHaveAttribute('aria-expanded', 'false');
			fireEvent.click(combo());
			expect(combo()).toHaveAttribute('aria-expanded', 'true');
			fireEvent.click(combo());
			expect(combo()).toHaveAttribute('aria-expanded', 'false');
		});

		it('Enter with no options does nothing', () => {
			const onChange = vi.fn();
			render(<FieldMultiSelect label="Fruits" options={[]} value={[]} onChange={onChange} />);
			fireEvent.keyDown(combo(), { key: 'ArrowDown' });
			fireEvent.keyDown(combo(), { key: 'Enter' });
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('disabled', () => {
		it('cannot be opened with the mouse or the keyboard, even when it holds the focus', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={[]} onChange={vi.fn()} disabled />);
			const trigger = screen.getByRole('combobox');
			fireEvent.click(trigger);
			trigger.focus();
			fireEvent.keyDown(trigger, { key: 'ArrowDown' });
			fireEvent.keyDown(trigger, { key: 'Enter' });
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		});

		it('offers no way to edit the selection through the pills', () => {
			render(<FieldMultiSelect label="Fruits" options={options} value={['apple']} onChange={vi.fn()} disabled />);
			expect(screen.getByText('Apple')).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Remove Apple' })).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
		});
	});

	it('renders no hidden input without a name', () => {
		const { container } = render(
			<FieldMultiSelect label="Fruits" options={options} value={['apple']} onChange={vi.fn()} />,
		);
		expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
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
