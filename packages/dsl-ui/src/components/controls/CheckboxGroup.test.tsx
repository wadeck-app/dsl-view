import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CheckboxGroup } from './CheckboxGroup.js';

const options = [
	{ value: 'a', label: 'Option A' },
	{ value: 'b', label: 'Option B' },
	{ value: 'c', label: 'Option C', disabled: true },
];

describe('CheckboxGroup', () => {
	it('renders all options', () => {
		render(<CheckboxGroup options={options} value={[]} onChange={vi.fn()} />);
		expect(screen.getByLabelText('Option A')).toBeInTheDocument();
		expect(screen.getByLabelText('Option B')).toBeInTheDocument();
		expect(screen.getByLabelText('Option C')).toBeInTheDocument();
	});

	it('renders group label', () => {
		render(<CheckboxGroup options={options} value={[]} onChange={vi.fn()} label="My Group" />);
		expect(screen.getByText('My Group')).toBeInTheDocument();
	});

	it('adds value when unchecked option is clicked', () => {
		const onChange = vi.fn();
		render(<CheckboxGroup options={options} value={[]} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('Option A'));
		expect(onChange).toHaveBeenCalledWith(['a']);
	});

	it('removes value when checked option is clicked', () => {
		const onChange = vi.fn();
		render(<CheckboxGroup options={options} value={['a', 'b']} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('Option A'));
		expect(onChange).toHaveBeenCalledWith(['b']);
	});

	it('does not call onChange when disabled option is clicked', () => {
		const onChange = vi.fn();
		render(<CheckboxGroup options={options} value={[]} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('Option C'));
		expect(onChange).not.toHaveBeenCalled();
	});
});
