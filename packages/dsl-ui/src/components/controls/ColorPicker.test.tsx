import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ColorPicker } from './ColorPicker.js';

const options = [
	{ value: 'blue', label: 'Blue' },
	{ value: 'green', label: 'Green' },
	{ value: 'rose', label: 'Rose' },
];

describe('ColorPicker', () => {
	it('renders all color options as buttons', () => {
		render(<ColorPicker label="Color" options={options} value="blue" onChange={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Blue' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Green' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Rose' })).toBeInTheDocument();
	});

	it('active option has aria-pressed="true"', () => {
		render(<ColorPicker label="Color" options={options} value="blue" onChange={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'false');
	});

	it('clicking a color calls onChange with its value', () => {
		const onChange = vi.fn();
		render(<ColorPicker label="Color" options={options} value="blue" onChange={onChange} />);
		fireEvent.click(screen.getByRole('button', { name: 'Green' }));
		expect(onChange).toHaveBeenCalledWith('green');
	});
});
