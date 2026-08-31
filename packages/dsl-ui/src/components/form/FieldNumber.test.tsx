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
