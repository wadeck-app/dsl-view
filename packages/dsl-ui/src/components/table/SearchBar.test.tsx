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
});
