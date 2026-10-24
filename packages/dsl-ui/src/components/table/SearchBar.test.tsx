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

	it('debounces rapid typing into one onChange carrying the last value', () => {
		const onChange = vi.fn();
		render(<SearchBar value="" onChange={onChange} debounceMs={300} />);
		const input = screen.getByRole('searchbox');
		fireEvent.change(input, { target: { value: 'a' } });
		vi.advanceTimersByTime(200);
		fireEvent.change(input, { target: { value: 'ab' } });
		vi.advanceTimersByTime(200);
		// 400ms after the first key but only 200ms after the last: nothing yet.
		expect(onChange).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(onChange).toHaveBeenCalledExactlyOnceWith('ab');
	});

	it('debounceMs 0 calls onChange synchronously on every keystroke', () => {
		const onChange = vi.fn();
		render(<SearchBar value="" onChange={onChange} debounceMs={0} />);
		const input = screen.getByRole('searchbox');
		fireEvent.change(input, { target: { value: 'a' } });
		expect(onChange).toHaveBeenLastCalledWith('a');
		fireEvent.change(input, { target: { value: 'ab' } });
		expect(onChange.mock.calls).toEqual([['a'], ['ab']]);
	});

	it('clearing cancels a pending debounced change instead of letting it overwrite the cleared value', () => {
		const onChange = vi.fn();
		render(<SearchBar value="" onChange={onChange} debounceMs={300} />);
		fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'abc' } });
		fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
		vi.advanceTimersByTime(1000);
		expect(onChange.mock.calls).toEqual([['']]);
		expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
	});

	it('does not fire a pending debounced change after it unmounted (it would write a stale value into the next page)', () => {
		const onChange = vi.fn();
		const view = render(<SearchBar value="" onChange={onChange} debounceMs={300} />);
		fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'abc' } });
		view.unmount();
		vi.advanceTimersByTime(1000);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('follows an external value change (e.g. cleared by the parent)', () => {
		const view = render(<SearchBar value="query" onChange={() => {}} />);
		expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('query');
		view.rerender(<SearchBar value="" onChange={() => {}} />);
		expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
	});

	it('names the search box after the placeholder, or "Search" when there is none or it is empty', () => {
		const view = render(<SearchBar value="" onChange={() => {}} placeholder="Find events" />);
		expect(screen.getByRole('searchbox', { name: 'Find events' })).toBeDefined();
		view.rerender(<SearchBar value="" onChange={() => {}} />);
		expect(screen.getByRole('searchbox', { name: 'Search' })).toBeDefined();
		view.rerender(<SearchBar value="" onChange={() => {}} placeholder="" />);
		expect(screen.getByRole('searchbox', { name: 'Search' })).toBeDefined();
	});

	it('is a fixed w-52 field by default and only grows on focus with focusExpand', () => {
		const view = render(<SearchBar value="" onChange={() => {}} />);
		expect(screen.getByRole('search')).toHaveClass('w-52');
		expect(screen.getByRole('searchbox').className).not.toMatch(/focus:w-64/);
		view.rerender(<SearchBar value="" onChange={() => {}} focusExpand />);
		expect(screen.getByRole('search')).not.toHaveClass('w-52');
		expect(screen.getByRole('searchbox')).toHaveClass('w-48', 'focus:w-64');
	});

	describe('misconfiguration', () => {
		it.each([
			['neither urlParam, value nor onChange', {}],
			['a value without onChange', { value: 'x' }],
			['an onChange without value', { onChange: () => {} }],
		])('throws an actionable error with %s', (_label, props) => {
			const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
			expect(() => render(<SearchBar {...props} />)).toThrow('[SearchBar] needs either "urlParam" or both "value" and "onChange"');
			spy.mockRestore();
		});

		it('does not throw with a urlParam alone (the url is the state)', () => {
			const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
			// No UrlParamContext here: the failure must be the context error, not the props error.
			expect(() => render(<SearchBar urlParam="q" />)).toThrow(/requires UrlParamContext/);
			spy.mockRestore();
		});
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
