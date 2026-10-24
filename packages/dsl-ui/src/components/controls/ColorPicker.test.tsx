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

	it('the swatches form a group named by the label', () => {
		render(<ColorPicker label="Accent" options={options} value="blue" onChange={vi.fn()} />);
		expect(screen.getByRole('group', { name: 'Accent' })).toContainElement(screen.getByRole('button', { name: 'Blue' }));
	});

	it('active option has aria-pressed="true", the others false', () => {
		render(<ColorPicker label="Color" options={options} value="blue" onChange={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByRole('button', { name: 'Rose' })).toHaveAttribute('aria-pressed', 'false');
	});

	it('a value that matches no option leaves every swatch unpressed', () => {
		render(<ColorPicker label="Color" options={options} value="pink" onChange={vi.fn()} />);
		expect(screen.getAllByRole('button').map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);
	});

	it('only the active swatch shows the check mark', () => {
		render(<ColorPicker label="Color" options={options} value="green" onChange={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Green' }).querySelector('svg')).not.toBeNull();
		expect(screen.getByRole('button', { name: 'Blue' }).querySelector('svg')).toBeNull();
		expect(screen.getByRole('button', { name: 'Rose' }).querySelector('svg')).toBeNull();
	});

	it('clicking a color calls onChange with its value, and the active one reports again', () => {
		const onChange = vi.fn();
		render(<ColorPicker label="Color" options={options} value="blue" onChange={onChange} />);
		fireEvent.click(screen.getByRole('button', { name: 'Green' }));
		expect(onChange).toHaveBeenLastCalledWith('green');
		fireEvent.click(screen.getByRole('button', { name: 'Blue' }));
		expect(onChange).toHaveBeenLastCalledWith('blue');
		expect(onChange).toHaveBeenCalledTimes(2);
	});

	it('is controlled: clicking does not move the selection by itself', () => {
		render(<ColorPicker label="Color" options={options} value="blue" onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: 'Rose' }));
		expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
	});

	it('shows the colour of each swatch, and a neutral grey for a colour it does not know', () => {
		render(
			<ColorPicker
				label="Color"
				options={[{ value: 'blue', label: 'Blue' }, { value: 'chartreuse', label: 'Chartreuse' }]}
				value="blue"
				onChange={vi.fn()}
			/>,
		);
		// violations-suppress: tailwind/no-raw-color-class the swatch colour classes ARE the component's contract
		expect(screen.getByRole('button', { name: 'Blue' })).toHaveClass('bg-blue-500');
		// violations-suppress: tailwind/no-raw-color-class the fallback swatch colour is the contract under test
		expect(screen.getByRole('button', { name: 'Chartreuse' })).toHaveClass('bg-gray-500');
	});

	it('the title repeats the label so a pointer user sees the colour name', () => {
		render(<ColorPicker label="Color" options={options} value="blue" onChange={vi.fn()} />);
		expect(screen.getByRole('button', { name: 'Rose' })).toHaveAttribute('title', 'Rose');
	});
});
