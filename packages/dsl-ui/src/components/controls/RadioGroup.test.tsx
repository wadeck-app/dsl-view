import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RadioGroup } from './RadioGroup.js';

const options = [
	{ value: 'a', label: 'Option A' },
	{ value: 'b', label: 'Option B' },
	{ value: 'c', label: 'Option C', disabled: true },
];

describe('RadioGroup', () => {
	it('renders all options', () => {
		render(<RadioGroup options={options} value="" onChange={vi.fn()} />);
		expect(screen.getByText('Option A')).toBeInTheDocument();
		expect(screen.getByText('Option B')).toBeInTheDocument();
		expect(screen.getByText('Option C')).toBeInTheDocument();
	});

	it('renders group label', () => {
		render(<RadioGroup options={options} value="" onChange={vi.fn()} label="Choose one" />);
		expect(screen.getByText('Choose one')).toBeInTheDocument();
	});

	it('marks the selected option as checked', () => {
		render(<RadioGroup options={options} value="a" onChange={vi.fn()} />);
		const radio = screen.getByRole('radio', { name: 'Option A' });
		expect(radio).toHaveAttribute('aria-checked', 'true');
	});

	it('calls onChange when an option is clicked', () => {
		const onChange = vi.fn();
		render(<RadioGroup options={options} value="" onChange={onChange} />);
		fireEvent.click(screen.getByRole('radio', { name: 'Option B' }));
		expect(onChange).toHaveBeenCalledWith('b');
	});
});
