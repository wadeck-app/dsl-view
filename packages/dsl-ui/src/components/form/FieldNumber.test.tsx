import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldNumber } from './FieldNumber.js';

describe('FieldNumber', () => {
	it('renders label', () => {
		render(<FieldNumber label="Count" value={5} onChange={vi.fn()} />);
		expect(screen.getByText('Count')).toBeInTheDocument();
	});

	it('displays value in input', () => {
		render(<FieldNumber label="Count" value={42} onChange={vi.fn()} />);
		expect(screen.getByRole('spinbutton')).toHaveValue(42);
	});

	it('calls onChange on input change', () => {
		const onChange = vi.fn();
		render(<FieldNumber label="Count" value={5} onChange={onChange} />);
		fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } });
		expect(onChange).toHaveBeenCalledWith('10');
	});

	it('shows suffix when provided', () => {
		render(<FieldNumber label="Rate" value={5} onChange={vi.fn()} suffix="req/s" />);
		expect(screen.getByText('req/s')).toBeInTheDocument();
	});

	it('shows Unlimited checkbox when unlimited prop provided', () => {
		render(<FieldNumber label="Count" value={5} onChange={vi.fn()} unlimited="Unlimited" />);
		expect(screen.getByText('Unlimited')).toBeInTheDocument();
		expect(screen.getByRole('checkbox')).toBeInTheDocument();
	});

	it('checking Unlimited disables the number input', () => {
		render(
			<FieldNumber
				label="Count"
				value={5}
				onChange={vi.fn()}
				unlimited="Unlimited"
				unlimitedValue={true}
				onUnlimitedChange={vi.fn()}
			/>
		);
		expect(screen.getByRole('spinbutton')).toBeDisabled();
	});

	it('checking Unlimited calls onUnlimitedChange(true) and clears value via onChange', () => {
		const onChange = vi.fn();
		const onUnlimitedChange = vi.fn();
		render(
			<FieldNumber
				label="Count"
				value={5}
				onChange={onChange}
				unlimited="Unlimited"
				unlimitedValue={false}
				onUnlimitedChange={onUnlimitedChange}
			/>
		);
		fireEvent.click(screen.getByRole('checkbox'));
		expect(onUnlimitedChange).toHaveBeenCalledWith(true);
		expect(onChange).toHaveBeenCalledWith('');
	});

	it('unchecking Unlimited calls onUnlimitedChange(false)', () => {
		const onUnlimitedChange = vi.fn();
		render(
			<FieldNumber
				label="Count"
				value={5}
				onChange={vi.fn()}
				unlimited="Unlimited"
				unlimitedValue={true}
				onUnlimitedChange={onUnlimitedChange}
			/>
		);
		fireEvent.click(screen.getByRole('checkbox'));
		expect(onUnlimitedChange).toHaveBeenCalledWith(false);
	});
});

// FieldWrapper links its label to the FIRST child. This component's first child is a flex
// row, not the input, so the id landed on the div: the label pointed at something
// unlabelable and the input had no accessible name at all. FieldWrapper now takes a
// function so a composite field can put the id and ARIA state on the real control.
describe('FieldNumber label and validation wiring', () => {
	it('links the label to the input, not to the layout wrapper', () => {
		render(<FieldNumber label="Timeout" value={30} onChange={vi.fn()} />);

		expect(screen.getByLabelText(/Timeout/)).toBe(screen.getByRole('spinbutton'));
	});

	it('shows a validation message and marks the input invalid', () => {
		render(<FieldNumber label="Timeout" value={0} onChange={vi.fn()} error="Must be positive" />);

		expect(screen.getByRole('alert')).toHaveTextContent('Must be positive');
		expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true');
	});

	it('marks nothing invalid without an error', () => {
		render(<FieldNumber label="Timeout" value={30} onChange={vi.fn()} />);

		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByRole('spinbutton')).not.toHaveAttribute('aria-invalid');
	});

	it('marks the field required on the control, not just the label', () => {
		render(<FieldNumber label="Timeout" value={30} onChange={vi.fn()} required />);

		expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-required', 'true');
	});

	describe('value and bounds', () => {
		it('reports exactly what the input holds, as a string: a cleared input is "" and not 0', () => {
			const onChange = vi.fn();
			render(<FieldNumber label="Count" value={5} onChange={onChange} />);
			fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });
			expect(onChange).toHaveBeenCalledExactlyOnceWith('');
		});

		it('passes min and max to the input', () => {
			render(<FieldNumber label="Count" value={5} onChange={vi.fn()} min={1} max={9} />);
			expect(screen.getByRole('spinbutton')).toHaveAttribute('min', '1');
			expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '9');
		});

		it('a value of 0 is shown as 0, not as an empty field', () => {
			render(<FieldNumber label="Count" value={0} onChange={vi.fn()} />);
			expect(screen.getByRole('spinbutton')).toHaveValue(0);
		});

		it('an empty string value shows an empty input', () => {
			render(<FieldNumber label="Count" value="" onChange={vi.fn()} />);
			expect(screen.getByRole('spinbutton')).toHaveValue(null);
		});

		it('stays controlled: without a new value from the parent the input keeps the old one', () => {
			render(<FieldNumber label="Count" value={5} onChange={vi.fn()} />);
			fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } });
			expect(screen.getByRole('spinbutton')).toHaveValue(5);
		});
	});

	describe('disabled and unlimited', () => {
		it('disabled blocks the number input', () => {
			render(<FieldNumber label="Count" value={5} onChange={vi.fn()} disabled />);
			expect(screen.getByRole('spinbutton')).toBeDisabled();
		});

		it('the Unlimited checkbox disables the number input while it is checked', () => {
			const { rerender } = render(<FieldNumber label="Count" value="" onChange={vi.fn()} unlimited="Unlimited" unlimitedValue={false} />);
			expect(screen.getByRole('spinbutton')).toBeEnabled();
			rerender(<FieldNumber label="Count" value="" onChange={vi.fn()} unlimited="Unlimited" unlimitedValue />);
			expect(screen.getByRole('spinbutton')).toBeDisabled();
			expect(screen.getByRole('checkbox', { name: 'Unlimited' })).toBeChecked();
		});

		it('there is no Unlimited checkbox without the unlimited prop', () => {
			render(<FieldNumber label="Count" value={5} onChange={vi.fn()} />);
			expect(screen.queryByRole('checkbox')).toBeNull();
		});

		it('checking Unlimited without a handler still clears the number and does not throw', () => {
			const onChange = vi.fn();
			render(<FieldNumber label="Count" value={5} onChange={onChange} unlimited="Unlimited" />);
			fireEvent.click(screen.getByRole('checkbox'));
			expect(onChange).toHaveBeenCalledExactlyOnceWith('');
		});

		it('unchecking Unlimited does not touch the number', () => {
			const onChange = vi.fn();
			render(<FieldNumber label="Count" value="" onChange={onChange} unlimited="Unlimited" unlimitedValue onUnlimitedChange={vi.fn()} />);
			fireEvent.click(screen.getByRole('checkbox'));
			expect(onChange).not.toHaveBeenCalled();
		});
	});
});
