import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchBar } from './SearchBar.js';

describe('SearchBar', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// The wrapper must be a flex container, or an absolutely-positioned icon can still
	// contribute a "ghost" line-box to the wrapper's block-flow height (measured: 24px wrapper
	// vs 22px input) - jsdom has no real layout, so this asserts the fix's mechanism, not pixels.
	it('wraps in a flex container so the icon cannot inflate the wrapper height', () => {
		render(<SearchBar value="" onChange={() => {}} />);
		expect(screen.getByRole('search').className).toMatch(/\bflex\b.*\bitems-center\b/);
	});

	it('renders placeholder text', () => {
		render(<SearchBar value="" onChange={() => {}} placeholder="Search files..." />);
		expect(screen.getByPlaceholderText('Search files...')).toBeDefined();
	});

	it('calls onChange after debounce delay', () => {
		const onChange = vi.fn();
		render(<SearchBar value="" onChange={onChange} debounceMs={300} />);

		const input = screen.getByRole('searchbox');
		fireEvent.change(input, { target: { value: 'hello' } });

		// Not called yet
		expect(onChange).not.toHaveBeenCalled();

		vi.advanceTimersByTime(300);

		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith('hello');
	});

	it('does not call onChange before debounce expires', () => {
		const onChange = vi.fn();
		render(<SearchBar value="" onChange={onChange} debounceMs={300} />);

		const input = screen.getByRole('searchbox');
		fireEvent.change(input, { target: { value: 'abc' } });

		vi.advanceTimersByTime(200);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('shows clear button when value is non-empty', () => {
		render(<SearchBar value="query" onChange={() => {}} />);
		expect(screen.getByRole('button', { name: 'Clear search' })).toBeDefined();
	});

	it('does not show clear button when value is empty', () => {
		render(<SearchBar value="" onChange={() => {}} />);
		expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
	});

	it('clicking clear calls onChange with empty string', () => {
		const onChange = vi.fn();
		render(<SearchBar value="query" onChange={onChange} />);

		const clearBtn = screen.getByRole('button', { name: 'Clear search' });
		fireEvent.click(clearBtn);

		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith('');
	});

	// 'md' matches DateRangePicker's trigger height (py-1.5).
	it('defaults to the DateRangePicker-matching geometry (14px icon, py-1.5 text-sm input)', () => {
		render(<SearchBar value="" onChange={() => {}} />);
		const icon = screen.getByRole('search').querySelector('svg');
		expect(icon).toHaveClass('h-3.5', 'w-3.5');
		const input = screen.getByRole('searchbox');
		expect(input).toHaveClass('py-1.5', 'text-sm');
	});

	// The prop FilterBar relies on to match ChipButton's scale.
	it('size="sm" matches ChipButton geometry (12px icon, py-0.5 text-xs input)', () => {
		render(<SearchBar value="" onChange={() => {}} size="sm" />);
		const icon = screen.getByRole('search').querySelector('svg');
		expect(icon).toHaveClass('h-3', 'w-3');
		expect(icon).not.toHaveClass('h-3.5');
		const input = screen.getByRole('searchbox');
		expect(input).toHaveClass('py-0.5', 'text-xs');
	});
});
