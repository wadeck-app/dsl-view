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

	it('reads value=[] as every option active (state, not just styling)', () => {
		render(<FilterChips bind="tag" options={options} value={[]} onChange={vi.fn()} />);
		for (const label of ['Alpha', 'Beta', 'Gamma']) {
			expect(screen.getByText(label)).toHaveAttribute('aria-pressed', 'true');
		}
	});

	it('clicking a chip while value=[] (all active) deselects just that one and keeps the others in option order', () => {
		const onChange = vi.fn();
		render(<FilterChips bind="tag" options={options} value={[]} onChange={onChange} />);
		fireEvent.click(screen.getByText('Beta'));
		expect(onChange).toHaveBeenCalledExactlyOnceWith(['a', 'c']);
	});

	it('a subset marks exactly its chips pressed and ignores a value that is not an option', () => {
		render(<FilterChips bind="tag" options={options} value={['b', 'ghost']} onChange={vi.fn()} />);
		expect(screen.getByText('Alpha')).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByText('Beta')).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByText('Gamma')).toHaveAttribute('aria-pressed', 'false');
	});

	it('cannot deselect the only option either when value=[] reads as all active', () => {
		const onChange = vi.fn();
		render(<FilterChips bind="tag" options={[{ value: 'a', label: 'Alpha' }]} value={[]} onChange={onChange} />);
		fireEvent.click(screen.getByText('Alpha'));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('each chip has its color class when active', () => {
		render(<FilterChips bind="tag" options={options} value={[]} onChange={vi.fn()} />);
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
		// The hue token, not bg-blue-100: the raw pair carried a dark: variant, which cannot be nested.
		expect(screen.getByText('Alpha').className).toContain('bg-hue-blue-bg');
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
		expect(screen.getByText('Beta').className).toContain('bg-hue-green-bg');
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
		expect(screen.getByText('Gamma').className).toContain('bg-hue-red-bg');
	});

	it('only active chips are highlighted when value is a subset', () => {
		render(<FilterChips bind="tag" options={options} value={['a']} onChange={vi.fn()} />);
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
		// The hue token, not bg-blue-100: the raw pair carried a dark: variant, which cannot be nested.
		expect(screen.getByText('Alpha').className).toContain('bg-hue-blue-bg');
		// violations-suppress: tailwind/no-raw-color-class asserting chipColors.ts palette output - raw classes are the expected value
		expect(screen.getByText('Beta').className).not.toContain('bg-hue-green-bg');
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
