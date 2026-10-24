import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './Checkbox.js';

describe('Checkbox', () => {
	it('renders a bare input when no label is given', () => {
		const { container } = render(<Checkbox />);
		expect(container.querySelector('label')).toBeNull();
		expect(screen.getByRole('checkbox')).toBeInTheDocument();
	});

	it('associates the label text with the input', () => {
		render(<Checkbox label="Remember me" />);
		expect(screen.getByLabelText('Remember me')).toBe(screen.getByRole('checkbox'));
	});

	it('toggles when the label text is clicked', () => {
		const onChange = vi.fn();
		render(<Checkbox label="Remember me" checked={false} onChange={onChange} />);
		fireEvent.click(screen.getByText('Remember me'));
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('reports the new checked state in the event, in both directions', () => {
		const seen: boolean[] = [];
		const { rerender } = render(<Checkbox label="Remember me" checked={false} onChange={e => seen.push(e.target.checked)} />);
		fireEvent.click(screen.getByRole('checkbox'));
		rerender(<Checkbox label="Remember me" checked onChange={e => seen.push(e.target.checked)} />);
		fireEvent.click(screen.getByRole('checkbox'));
		expect(seen).toEqual([true, false]);
	});

	it('reflects the controlled checked prop', () => {
		const { rerender } = render(<Checkbox label="Remember me" checked={false} onChange={vi.fn()} />);
		expect(screen.getByRole('checkbox')).not.toBeChecked();
		rerender(<Checkbox label="Remember me" checked onChange={vi.fn()} />);
		expect(screen.getByRole('checkbox')).toBeChecked();
	});

	// userEvent follows the browser (a disabled control gets no click, not even through its label);
	// fireEvent.click would still activate it in jsdom.
	it('disabled blocks a click on the box and on the label text', async () => {
		const onChange = vi.fn();
		render(<Checkbox label="Remember me" checked={false} disabled onChange={onChange} />);
		const user = userEvent.setup();
		await user.click(screen.getByRole('checkbox'));
		await user.click(screen.getByText('Remember me'));
		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByRole('checkbox')).toBeDisabled();
	});

	it('a consumer className is added to the base styling, not replacing it', () => {
		render(<Checkbox className="ml-2" />);
		const classes = screen.getByRole('checkbox').className.split(' ');
		expect(classes).toContain('ml-2');
		expect(classes).toContain('rounded');
	});

	it('passes native attributes through to the input (name, value, aria-label)', () => {
		render(<Checkbox name="terms" value="yes" aria-label="Accept terms" />);
		const box = screen.getByRole('checkbox', { name: 'Accept terms' });
		expect(box).toHaveAttribute('name', 'terms');
		expect(box).toHaveAttribute('value', 'yes');
	});

	it('forwards the ref to the input', () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<Checkbox label="x" ref={ref} />);
		expect(ref.current).toBe(screen.getByRole('checkbox'));
	});
});
