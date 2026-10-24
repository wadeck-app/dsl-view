import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThemeContext } from '@dsl-ui/context/ThemeContext.js';
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

	it('the options form a group named by the label', () => {
		render(<ThemePicker label="Theme" options={options} value="light" onChange={vi.fn()} />);
		expect(screen.getByRole('group', { name: 'Theme' })).toContainElement(screen.getByTitle('Light'));
	});

	it('active option has aria-pressed="true"', () => {
		render(<ThemePicker label="Theme" options={options} value="light" onChange={vi.fn()} />);
		expect(screen.getByTitle('Light')).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTitle('Dark')).toHaveAttribute('aria-pressed', 'false');
	});

	it('a value that matches no option leaves every option unpressed', () => {
		render(<ThemePicker label="Theme" options={options} value="sepia" onChange={vi.fn()} />);
		expect(screen.getAllByRole('button').map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'false']);
	});

	it('clicking inactive option calls onChange with its value', () => {
		const onChange = vi.fn();
		render(<ThemePicker label="Theme" options={options} value="light" onChange={onChange} />);
		fireEvent.click(screen.getByTitle('Dark'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('dark');
	});

	it('clicking active option still calls onChange', () => {
		const onChange = vi.fn();
		render(<ThemePicker label="Theme" options={options} value="light" onChange={onChange} />);
		fireEvent.click(screen.getByTitle('Light'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('light');
	});

	it('draws a known icon name as an svg and an unknown one as its text', () => {
		render(
			<ThemePicker
				label="Theme"
				options={[{ value: 'light', label: 'Light', icon: 'Sun' }, { value: 'x', label: 'Mystery', icon: 'Zzz' }]}
				value="light"
				onChange={vi.fn()}
			/>,
		);
		expect(screen.getByTitle('Light').querySelector('svg')).not.toBeNull();
		expect(screen.getByTitle('Mystery').querySelector('svg')).toBeNull();
		expect(screen.getByTitle('Mystery')).toHaveTextContent('Zzz');
	});

	describe('with the global theme context', () => {
		it('the global theme wins over the bound value for the pressed state', () => {
			render(
				<ThemeContext.Provider value={{ theme: 'dark', setTheme: vi.fn() }}>
					<ThemePicker label="Theme" options={options} value="light" onChange={vi.fn()} />
				</ThemeContext.Provider>,
			);
			expect(screen.getByTitle('Dark')).toHaveAttribute('aria-pressed', 'true');
			expect(screen.getByTitle('Light')).toHaveAttribute('aria-pressed', 'false');
		});

		it('a click updates both the bound value and the global theme, once each', () => {
			const onChange = vi.fn();
			const setTheme = vi.fn();
			render(
				<ThemeContext.Provider value={{ theme: 'light', setTheme }}>
					<ThemePicker label="Theme" options={options} value="light" onChange={onChange} />
				</ThemeContext.Provider>,
			);
			fireEvent.click(screen.getByTitle('Dark'));
			expect(onChange).toHaveBeenCalledExactlyOnceWith('dark');
			expect(setTheme).toHaveBeenCalledExactlyOnceWith('dark');
		});

		it('without a theme context nothing else is called and the bound value drives the state', () => {
			const onChange = vi.fn();
			render(<ThemePicker label="Theme" options={options} value="dark" onChange={onChange} />);
			expect(screen.getByTitle('Dark')).toHaveAttribute('aria-pressed', 'true');
			fireEvent.click(screen.getByTitle('Light'));
			expect(onChange).toHaveBeenCalledExactlyOnceWith('light');
		});
	});
});
