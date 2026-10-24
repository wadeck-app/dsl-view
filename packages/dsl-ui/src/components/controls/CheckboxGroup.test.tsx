import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

	it('names the group with its label (fieldset + legend)', () => {
		render(<CheckboxGroup options={options} value={[]} onChange={vi.fn()} label="My Group" />);
		expect(screen.getByRole('group', { name: 'My Group' })).toBeInTheDocument();
	});

	it('has no legend when no label is given', () => {
		const { container } = render(<CheckboxGroup options={options} value={[]} onChange={vi.fn()} />);
		expect(container.querySelector('legend')).toBeNull();
	});

	it('shows exactly the selected options as checked', () => {
		render(<CheckboxGroup options={options} value={['b']} onChange={vi.fn()} />);
		expect(screen.getByLabelText('Option A')).not.toBeChecked();
		expect(screen.getByLabelText('Option B')).toBeChecked();
		expect(screen.getByLabelText('Option C')).not.toBeChecked();
	});

	it('adds value when unchecked option is clicked', () => {
		const onChange = vi.fn();
		render(<CheckboxGroup options={options} value={[]} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('Option A'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith(['a']);
	});

	it('appends to the existing selection, keeping its order and unknown values', () => {
		const onChange = vi.fn();
		render(<CheckboxGroup options={options} value={['zzz', 'b']} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('Option A'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith(['zzz', 'b', 'a']);
	});

	it('removes value when checked option is clicked', () => {
		const onChange = vi.fn();
		render(<CheckboxGroup options={options} value={['a', 'b']} onChange={onChange} />);
		fireEvent.click(screen.getByLabelText('Option A'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith(['b']);
	});

	it('is controlled: it does not check by itself when the parent keeps the value', () => {
		render(<CheckboxGroup options={options} value={[]} onChange={vi.fn()} />);
		fireEvent.click(screen.getByLabelText('Option A'));
		expect(screen.getByLabelText('Option A')).not.toBeChecked();
	});

	it('does not call onChange when disabled option is clicked, and marks it disabled', () => {
		const onChange = vi.fn();
		render(<CheckboxGroup options={options} value={[]} onChange={onChange} />);
		expect(screen.getByLabelText('Option C')).toBeDisabled();
		expect(screen.getByLabelText('Option A')).toBeEnabled();
		fireEvent.click(screen.getByLabelText('Option C'));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('clicking the visible label text toggles the option', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<CheckboxGroup options={options} value={[]} onChange={onChange} />);
		await user.click(screen.getByText('Option B'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith(['b']);
	});

	it('toggles from the keyboard with Space', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<CheckboxGroup options={options} value={[]} onChange={onChange} />);
		screen.getByLabelText('Option A').focus();
		await user.keyboard(' ');
		expect(onChange).toHaveBeenCalledExactlyOnceWith(['a']);
	});

	it('renders no checkbox for an empty option list', () => {
		render(<CheckboxGroup options={[]} value={[]} onChange={vi.fn()} />);
		expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
	});

	// Orientation is a layout contract: the class decides row vs column.
	it.each([
		['vertical', 'flex-col'],
		['horizontal', 'flex-row'],
	] as const)('%s orientation lays the options out with %s', (orientation, cls) => {
		render(<CheckboxGroup options={options} value={[]} onChange={vi.fn()} orientation={orientation} />);
		expect(screen.getByLabelText('Option A').closest('label')?.parentElement).toHaveClass(cls);
	});
});
