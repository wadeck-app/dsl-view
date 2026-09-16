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
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
		expect(screen.getByText('Alpha').className).toContain('bg-blue-100');
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
		expect(screen.getByText('Beta').className).toContain('bg-green-100');
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
		expect(screen.getByText('Gamma').className).toContain('bg-red-100');
	});

	it('only active chips are highlighted when value is a subset', () => {
		render(<FilterChips bind="tag" options={options} value={['a']} onChange={vi.fn()} />);
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
		expect(screen.getByText('Alpha').className).toContain('bg-blue-100');
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
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

// Single-select is a distinct filter shape, not a degenerate multi-select: exactly one
// chip is active, an explicit "all" option is one of the choices rather than an empty
// array, and re-clicking the active chip is a no-op instead of being refused as
// "cannot deselect the last". A consumer that needed this had reimplemented the whole
// chip row rather than reuse this component.
describe('FilterChips mode=single', () => {
	const options = [
		{ value: 'all', label: 'All' },
		{ value: 'cron', label: 'Cron' },
		{ value: 'failed', label: 'Failed' },
	];

	it('marks only the selected chip active', () => {
		render(<FilterChips bind="type" mode="single" options={options} value={['cron']} onChange={() => {}} />);

		expect(screen.getByText('Cron')).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByText('All')).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByText('Failed')).toHaveAttribute('aria-pressed', 'false');
	});

	it('replaces the selection rather than adding to it', () => {
		const onChange = vi.fn();
		render(<FilterChips bind="type" mode="single" options={options} value={['cron']} onChange={onChange} />);

		fireEvent.click(screen.getByText('Failed'));

		expect(onChange).toHaveBeenCalledWith(['failed']);
	});

	// The multi-select rule "empty value means every option is active" must not leak
	// here: an empty single-select means nothing is selected, not everything.
	it('treats an empty value as nothing selected, not everything', () => {
		render(<FilterChips bind="type" mode="single" options={options} value={[]} onChange={() => {}} />);

		for (const label of ['All', 'Cron', 'Failed']) {
			expect(screen.getByText(label)).toHaveAttribute('aria-pressed', 'false');
		}
	});

	it('re-clicking the active chip keeps it selected', () => {
		const onChange = vi.fn();
		render(<FilterChips bind="type" mode="single" options={options} value={['cron']} onChange={onChange} />);

		fireEvent.click(screen.getByText('Cron'));

		expect(onChange).toHaveBeenCalledWith(['cron']);
	});

	it('still defaults to multi-select when no mode is given', () => {
		const onChange = vi.fn();
		render(<FilterChips bind="type" options={options} value={['cron']} onChange={onChange} />);

		fireEvent.click(screen.getByText('Failed'));

		expect(onChange).toHaveBeenCalledWith(['cron', 'failed']);
	});
});
