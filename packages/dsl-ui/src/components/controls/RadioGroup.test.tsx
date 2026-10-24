import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RadioGroup } from './RadioGroup.js';

const options = [
	{ value: 'a', label: 'Option A' },
	{ value: 'b', label: 'Option B' },
	{ value: 'c', label: 'Option C', disabled: true },
	{ value: 'd', label: 'Option D' },
];

describe('RadioGroup', () => {
	it('renders all options as radios named by their labels', () => {
		render(<RadioGroup options={options} value="" onChange={vi.fn()} />);
		expect(screen.getAllByRole('radio').map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false', 'false']);
		for (const name of ['Option A', 'Option B', 'Option C', 'Option D']) {
			expect(screen.getByRole('radio', { name })).toBeInTheDocument();
		}
	});

	it('names the group with its label (fieldset + legend)', () => {
		render(<RadioGroup options={options} value="" onChange={vi.fn()} label="Choose one" />);
		expect(screen.getByRole('group', { name: 'Choose one' })).toBeInTheDocument();
	});

	it('marks only the selected option as checked', () => {
		render(<RadioGroup options={options} value="b" onChange={vi.fn()} />);
		expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute('aria-checked', 'false');
		expect(screen.getByRole('radio', { name: 'Option B' })).toHaveAttribute('aria-checked', 'true');
		expect(screen.getByRole('radio', { name: 'Option D' })).toHaveAttribute('aria-checked', 'false');
	});

	it('calls onChange with the value of the clicked option', () => {
		const onChange = vi.fn();
		render(<RadioGroup options={options} value="" onChange={onChange} />);
		fireEvent.click(screen.getByRole('radio', { name: 'Option B' }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('b');
	});

	it('does not report again when the already selected option is clicked', () => {
		const onChange = vi.fn();
		render(<RadioGroup options={options} value="b" onChange={onChange} />);
		fireEvent.click(screen.getByRole('radio', { name: 'Option B' }));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('is controlled: it does not select by itself when the parent keeps the value', () => {
		render(<RadioGroup options={options} value="a" onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole('radio', { name: 'Option B' }));
		expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute('aria-checked', 'true');
		expect(screen.getByRole('radio', { name: 'Option B' })).toHaveAttribute('aria-checked', 'false');
	});

	it('a disabled option is disabled and cannot be selected', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<RadioGroup options={options} value="" onChange={onChange} />);
		expect(screen.getByRole('radio', { name: 'Option C' })).toBeDisabled();
		await user.click(screen.getByText('Option C'));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('clicking the visible label text selects the option', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<RadioGroup options={options} value="" onChange={onChange} />);
		await user.click(screen.getByText('Option D'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('d');
	});

	it('arrow keys move focus through the options skipping the disabled one', async () => {
		const user = userEvent.setup();
		render(<RadioGroup options={options} value="b" onChange={vi.fn()} />);
		screen.getByRole('radio', { name: 'Option B' }).focus();
		await user.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Option D' }));
	});

	it('exposes the orientation to assistive tech', () => {
		render(<RadioGroup options={options} value="" onChange={vi.fn()} orientation="horizontal" />);
		expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-orientation', 'horizontal');
	});
});
