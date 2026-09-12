// Mock Radix UI Popover to remove internal positioning timers.
// Without this mock, Radix fires repeated setTimeouts for positioning that
// cause act() to stall for 15-30 s in React 18 concurrent-mode tests.
// The mock preserves the open/close contract without any timer side-effects.
vi.mock('@radix-ui/react-popover', async () => {
	const React = (await import('react')).default;
	// Mini context: pass `open` from Root down to Content
	const OpenCtx = React.createContext(false);
	return {
		Root: ({ children, open }: any) =>
			React.createElement(OpenCtx.Provider, { value: open }, children),
		Portal: ({ children }: any) =>
			React.createElement(React.Fragment, null, children),
		Content: ({ children, className }: any) => {
			const isOpen = React.useContext(OpenCtx);
			return isOpen ? React.createElement('div', { className }, children) : null;
		},
		Anchor: ({ children }: any) =>
			React.createElement(React.Fragment, null, children),
	};
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FieldAsyncSelect, type FieldAsyncSelectOption } from './FieldAsyncSelect.js';

const mockOptions: FieldAsyncSelectOption[] = [
	{ value: 'us', label: 'United States' },
	{ value: 'ca', label: 'Canada' },
	{ value: 'uk', label: 'United Kingdom' },
];

function makeLoad(opts: FieldAsyncSelectOption[] = mockOptions) {
	return vi.fn().mockResolvedValue(opts);
}

/**
 * Advance fake timers by `ms` and flush all async continuations.
 *
 * `vi.advanceTimersByTime(ms)` fires the debounce callback. The callback is
 * async — it calls `setIsLoading(true)` then awaits `loadOptions()`. React's
 * scheduler uses its own internal `setTimeout(fn, 0)` to schedule re-renders.
 * With fake timers, that scheduler tick never fires unless we advance it too.
 * `vi.runAllTimersAsync()` runs all pending timers (debounce + React scheduler)
 * and awaits any Promises spawned by them, so the DOM fully reflects the loaded
 * state after this call.
 *
 * With Radix mocked (no positioning timers), `runAllTimersAsync()` terminates
 * quickly — no infinite scheduling loop.
 */
async function advanceAndFlush(ms: number) {
	await act(async () => {
		vi.advanceTimersByTime(ms);
		await vi.runAllTimersAsync();
	});
}

// All tests use fake timers so timer advancement is explicit and deterministic.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// ── Rendering (synchronous) ────────────────────────────────────────────────────

describe('FieldAsyncSelect — rendering', () => {
	it('renders with label', () => {
		render(
			<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={makeLoad()} />,
		);
		expect(screen.getByText('Country')).toBeInTheDocument();
	});

	it('renders description when provided', () => {
		render(
			<FieldAsyncSelect
				label="Country"
				description="Select your country"
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
			/>,
		);
		expect(screen.getByText('Select your country')).toBeInTheDocument();
	});

	it('shows placeholder when no value', () => {
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
				placeholder="Search countries..."
			/>,
		);
		expect(screen.getByPlaceholderText('Search countries...')).toBeInTheDocument();
	});

	it('shows required indicator when required is true', () => {
		render(
			<FieldAsyncSelect
				label="Country"
				required
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
			/>,
		);
		expect(screen.getByText('*')).toBeInTheDocument();
	});

	it('shows error message when error prop is provided', () => {
		render(
			<FieldAsyncSelect
				label="Country"
				error="This field is required"
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
			/>,
		);
		expect(screen.getByText('This field is required')).toBeInTheDocument();
	});

	it('disables input when disabled prop is true', () => {
		render(
			<FieldAsyncSelect
				label="Country"
				disabled
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
			/>,
		);
		expect(screen.getByRole('combobox')).toBeDisabled();
	});

	it('input has role combobox', () => {
		render(
			<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={makeLoad()} />,
		);
		expect(screen.getByRole('combobox')).toBeInTheDocument();
	});

	it('input has aria-expanded false when closed', () => {
		render(
			<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={makeLoad()} />,
		);
		expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
	});

	it('input has aria-expanded true immediately after user types', () => {
		// isOpen is set synchronously in handleInputChange
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
				debounceMs={500}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'x' } });
		expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
	});
});

// ── Debounce ───────────────────────────────────────────────────────────────────

describe('FieldAsyncSelect — debounce', () => {
	it('does NOT call loadOptions before the debounce delay', () => {
		const load = makeLoad();
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={load}
				debounceMs={200}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'can' } });
		vi.advanceTimersByTime(199);
		expect(load).not.toHaveBeenCalled();
	});

	it('calls loadOptions after the debounce delay with the typed query', () => {
		const load = makeLoad();
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={load}
				debounceMs={200}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'can' } });
		act(() => { vi.advanceTimersByTime(200); });
		// loadOptions is called synchronously inside the timer callback
		expect(load).toHaveBeenCalledWith('can');
	});

	it('cancels the previous debounce when user types again quickly', () => {
		const load = makeLoad();
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={load}
				debounceMs={200}
			/>,
		);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'c' } });
		vi.advanceTimersByTime(100);
		fireEvent.change(input, { target: { value: 'ca' } });
		act(() => { vi.advanceTimersByTime(200); });
		expect(load).toHaveBeenCalledTimes(1);
		expect(load).toHaveBeenCalledWith('ca');
	});
});

// ── Loading state ──────────────────────────────────────────────────────────────

describe('FieldAsyncSelect — loading state', () => {
	it('shows loading spinner while fetching', async () => {
		let resolveLoad!: (v: FieldAsyncSelectOption[]) => void;
		const load = vi.fn().mockReturnValue(
			new Promise<FieldAsyncSelectOption[]>(r => {
				resolveLoad = r;
			}),
		);
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={load}
				debounceMs={0}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ca' } });
		// Fire the debounce (0ms). The async callback starts: setIsLoading(true) runs
		// synchronously before the `await`, then suspends on the pending promise.
		act(() => { vi.advanceTimersByTime(0); });
		// setIsLoading(true) has been committed — spinner should be visible
		expect(screen.getByRole('status')).toBeInTheDocument();
		// Resolve the promise and drain the resulting state updates
		await act(async () => { resolveLoad([]); });
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
	});

	it('hides spinner after options are loaded', async () => {
		const load = makeLoad();
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={load}
				debounceMs={0}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ca' } });
		await advanceAndFlush(0);
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
	});
});

// ── Options display ────────────────────────────────────────────────────────────

describe('FieldAsyncSelect — options display', () => {
	it('shows options when loaded', async () => {
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
				debounceMs={0}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'u' } });
		await advanceAndFlush(0);
		expect(screen.getByText('United States')).toBeInTheDocument();
		expect(screen.getByText('Canada')).toBeInTheDocument();
		expect(screen.getByText('United Kingdom')).toBeInTheDocument();
	});

	it('shows noOptionsMessage when loadOptions returns empty array', async () => {
		const load = vi.fn().mockResolvedValue([]);
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={load}
				debounceMs={0}
				noOptionsMessage="Nothing found"
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'xyz' } });
		await advanceAndFlush(0);
		expect(screen.getByText('Nothing found')).toBeInTheDocument();
	});
});

// ── Selection ──────────────────────────────────────────────────────────────────

describe('FieldAsyncSelect — selection', () => {
	it('calls onChange with the option value on click', async () => {
		const onChange = vi.fn();
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={onChange}
				loadOptions={makeLoad()}
				debounceMs={0}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'u' } });
		await advanceAndFlush(0);
		fireEvent.click(screen.getByText('Canada'));
		expect(onChange).toHaveBeenCalledWith('ca');
	});

	it('shows selected option label in input after selection', async () => {
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
				debounceMs={0}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'u' } });
		await advanceAndFlush(0);
		fireEvent.click(screen.getByText('United States'));
		expect(screen.getByRole('combobox')).toHaveValue('United States');
	});

	it('closes dropdown after option is selected', async () => {
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
				debounceMs={0}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'u' } });
		await advanceAndFlush(0);
		fireEvent.click(screen.getByText('Canada'));
		expect(screen.queryByText('United States')).not.toBeInTheDocument();
	});
});

// ── Clear button ───────────────────────────────────────────────────────────────

describe('FieldAsyncSelect — clear button', () => {
	it('X button is not shown when value is null', () => {
		render(
			<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={makeLoad()} />,
		);
		expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
	});

	it('X button is shown when value is set', () => {
		render(
			<FieldAsyncSelect label="Country" value="us" onChange={vi.fn()} loadOptions={makeLoad()} />,
		);
		expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
	});

	it('calls onChange(null) when X button is clicked', () => {
		const onChange = vi.fn();
		render(
			<FieldAsyncSelect label="Country" value="us" onChange={onChange} loadOptions={makeLoad()} />,
		);
		fireEvent.click(screen.getByRole('button', { name: /clear/i }));
		expect(onChange).toHaveBeenCalledWith(null);
	});

	it('clears input text when X button is clicked', () => {
		render(
			<FieldAsyncSelect label="Country" value="us" onChange={vi.fn()} loadOptions={makeLoad()} />,
		);
		fireEvent.click(screen.getByRole('button', { name: /clear/i }));
		expect(screen.getByRole('combobox')).toHaveValue('');
	});
});

// ── Keyboard navigation ────────────────────────────────────────────────────────

describe('FieldAsyncSelect — keyboard navigation', () => {
	it('ArrowDown opens dropdown when closed', () => {
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
				debounceMs={500}
			/>,
		);
		fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
		expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
	});

	it('ArrowDown then Enter selects the first option once loaded', async () => {
		const onChange = vi.fn();
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={onChange}
				loadOptions={makeLoad()}
				debounceMs={0}
			/>,
		);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'u' } });
		await advanceAndFlush(0);
		fireEvent.keyDown(input, { key: 'ArrowDown' });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledWith('us');
	});

	it('Escape closes the dropdown', async () => {
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={makeLoad()}
				debounceMs={0}
			/>,
		);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'u' } });
		await advanceAndFlush(0);
		expect(screen.getByText('United States')).toBeInTheDocument();
		fireEvent.keyDown(input, { key: 'Escape' });
		expect(screen.queryByText('United States')).not.toBeInTheDocument();
	});
});
