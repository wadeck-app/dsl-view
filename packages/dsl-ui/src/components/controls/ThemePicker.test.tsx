import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThemePicker } from './ThemePicker.js';

const options = [
	{ value: 'light', label: 'Light', icon: 'Sun' },
	{ value: 'dark', label: 'Dark', icon: 'Moon' },
];

describe('ThemePicker', () => {
	it('renders all options', () => {
		render(<ThemePicker label="Theme" options={options} value="light" onChange={vi.fn()} />);
		expect(screen.getByText('Light')).toBeInTheDocument();
		expect(screen.getByText('Dark')).toBeInTheDocument();
	});

	it('active option has aria-pressed="true"', () => {
		render(<ThemePicker label="Theme" options={options} value="light" onChange={vi.fn()} />);
		expect(screen.getByTitle('Light')).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTitle('Dark')).toHaveAttribute('aria-pressed', 'false');
	});

	it('clicking inactive option calls onChange with its value', () => {
		const onChange = vi.fn();
		render(<ThemePicker label="Theme" options={options} value="light" onChange={onChange} />);
		fireEvent.click(screen.getByTitle('Dark'));
		expect(onChange).toHaveBeenCalledWith('dark');
	});

	it('clicking active option still calls onChange', () => {
		const onChange = vi.fn();
		render(<ThemePicker label="Theme" options={options} value="light" onChange={onChange} />);
		fireEvent.click(screen.getByTitle('Light'));
		expect(onChange).toHaveBeenCalledWith('light');
	});
});
