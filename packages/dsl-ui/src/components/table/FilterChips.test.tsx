import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FilterChips } from './FilterChips.js';

const options = [
	{ value: 'a', label: 'Alpha', color: 'blue' },
	{ value: 'b', label: 'Beta', color: 'green' },
	{ value: 'c', label: 'Gamma', color: 'red' },
];

describe('FilterChips', () => {
	it('renders all options', () => {
		render(<FilterChips bind="tag" options={options} value={[]} onChange={vi.fn()} />);
		expect(screen.getByText('Alpha')).toBeInTheDocument();
		expect(screen.getByText('Beta')).toBeInTheDocument();
		expect(screen.getByText('Gamma')).toBeInTheDocument();
	});

	it('all chips are active when value=[] - each chip has its color class', () => {
		render(<FilterChips bind="tag" options={options} value={[]} onChange={vi.fn()} />);
		expect(screen.getByText('Alpha').className).toContain('bg-blue-100');
		expect(screen.getByText('Beta').className).toContain('bg-green-100');
		expect(screen.getByText('Gamma').className).toContain('bg-red-100');
	});

	it('only active chips are highlighted when value is a subset', () => {
		render(<FilterChips bind="tag" options={options} value={['a']} onChange={vi.fn()} />);
		expect(screen.getByText('Alpha').className).toContain('bg-blue-100');
		expect(screen.getByText('Beta').className).not.toContain('bg-green-100');
	});

	it('clicking an active chip removes it from selection', () => {
		const onChange = vi.fn();
		render(<FilterChips bind="tag" options={options} value={['a', 'b']} onChange={onChange} />);
		fireEvent.click(screen.getByText('Alpha'));
		expect(onChange).toHaveBeenCalledWith(['b']);
	});

	it('cannot deselect the last chip', () => {
		const onChange = vi.fn();
		render(<FilterChips bind="tag" options={options} value={['a']} onChange={onChange} />);
		fireEvent.click(screen.getByText('Alpha'));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('clicking an inactive chip adds it', () => {
		const onChange = vi.fn();
		render(<FilterChips bind="tag" options={options} value={['a']} onChange={onChange} />);
		fireEvent.click(screen.getByText('Beta'));
		expect(onChange).toHaveBeenCalledWith(['a', 'b']);
	});
});
