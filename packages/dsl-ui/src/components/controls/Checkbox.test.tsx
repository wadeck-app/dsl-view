import { fireEvent, render, screen } from '@testing-library/react';
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

	it('forwards the ref to the input', () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<Checkbox label="x" ref={ref} />);
		expect(ref.current).toBe(screen.getByRole('checkbox'));
	});
});
