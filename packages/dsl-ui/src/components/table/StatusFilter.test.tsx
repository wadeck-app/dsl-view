import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StatusFilter } from './StatusFilter.js';

// State is asserted through aria-pressed (the contract), not through the active/inactive CSS classes.
const pressedLabels = () =>
	screen
		.getAllByRole('button')
		.filter(button => button.getAttribute('aria-pressed') === 'true')
		.map(button => button.textContent);

describe('StatusFilter', () => {
	it('renders the 5 default options in order, with "all" shown as "All"', () => {
		render(<StatusFilter value="all" onChange={vi.fn()} />);
		expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['All', '2xx', '3xx', '4xx', '5xx']);
	});

	it('presses exactly the option matching the value', () => {
		render(<StatusFilter value="2xx" onChange={vi.fn()} />);
		expect(pressedLabels()).toEqual(['2xx']);
	});

	it('reads an empty value as "all"', () => {
		render(<StatusFilter value="" onChange={vi.fn()} />);
		expect(pressedLabels()).toEqual(['All']);
	});

	it('presses nothing for a value that is not an option (no silent fallback to "all" styling)', () => {
		render(<StatusFilter value="9xx" onChange={vi.fn()} />);
		expect(pressedLabels()).toEqual([]);
	});

	it('clicking an option reports its value, "All" reports "all"', () => {
		const onChange = vi.fn();
		render(<StatusFilter value="4xx" onChange={onChange} />);
		fireEvent.click(screen.getByText('5xx'));
		fireEvent.click(screen.getByText('All'));
		expect(onChange.mock.calls).toEqual([['5xx'], ['all']]);
	});

	it('re-clicking the pressed option still reports it (radio style, never deselects)', () => {
		const onChange = vi.fn();
		render(<StatusFilter value="4xx" onChange={onChange} />);
		fireEvent.click(screen.getByText('4xx'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('4xx');
	});

	it('accepts custom options as plain strings and as { value, label } objects', () => {
		const onChange = vi.fn();
		render(
			<StatusFilter
				value="failed"
				onChange={onChange}
				options={['all', { value: 'failed', label: 'Failed runs' }, { value: 'ok', label: 'OK' }]}
			/>
		);
		expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['All', 'Failed runs', 'OK']);
		expect(pressedLabels()).toEqual(['Failed runs']);
		fireEvent.click(screen.getByText('OK'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith('ok');
	});

	it('only the string "all" is relabelled "All": an object option keeps its own label', () => {
		render(<StatusFilter value="all" onChange={vi.fn()} options={[{ value: 'all', label: 'Everything' }]} />);
		expect(screen.getByRole('button', { name: 'Everything' })).toHaveAttribute('aria-pressed', 'true');
	});

	it('renders no button for an empty option list', () => {
		render(<StatusFilter value="" onChange={vi.fn()} options={[]} />);
		expect(screen.queryAllByRole('button')).toEqual([]);
	});

	// The visual state is the second half of the contract: pressed and unpressed must look different.
	it('styles the pressed option differently from the others', () => {
		render(<StatusFilter value="2xx" onChange={vi.fn()} />);
		// Whole class tokens: the ghost button also carries "hover:bg-muted-bg", which a substring check would match.
		const pressed = screen.getByText('2xx').className.split(/\s+/);
		const unpressed = screen.getByText('All').className.split(/\s+/);
		expect(pressed).toContain('bg-muted-bg');
		expect(unpressed).toContain('bg-surface');
		expect(unpressed).not.toContain('bg-muted-bg');
	});
});
