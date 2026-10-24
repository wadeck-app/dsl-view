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

// ── Robustness: races, failures, focus ─────────────────────────────────────────

function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>(res => {
		resolve = res;
	});
	return { promise, resolve };
}

describe('FieldAsyncSelect — late and failing answers', () => {
	it('ignores the answer of a superseded request, and keeps the spinner until the latest one answers', async () => {
		const first = deferred<FieldAsyncSelectOption[]>();
		const second = deferred<FieldAsyncSelectOption[]>();
		const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		render(
			<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={load} debounceMs={0} />,
		);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'u' } });
		act(() => { vi.advanceTimersByTime(0); });
		fireEvent.change(input, { target: { value: 'ca' } });
		act(() => { vi.advanceTimersByTime(0); });
		expect(load).toHaveBeenCalledTimes(2);

		// The newer request answers first, then the older one arrives late: it must not overwrite.
		await act(async () => { second.resolve([{ value: 'ca', label: 'Canada' }]); });
		await act(async () => { first.resolve([{ value: 'us', label: 'United States' }]); });
		expect(screen.getByText('Canada')).toBeInTheDocument();
		expect(screen.queryByText('United States')).not.toBeInTheDocument();
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
	});

	it('a stale answer arriving first does not show and does not stop the spinner of the pending latest request', async () => {
		const first = deferred<FieldAsyncSelectOption[]>();
		const second = deferred<FieldAsyncSelectOption[]>();
		const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		render(
			<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={load} debounceMs={0} />,
		);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'u' } });
		act(() => { vi.advanceTimersByTime(0); });
		fireEvent.change(input, { target: { value: 'ca' } });
		act(() => { vi.advanceTimersByTime(0); });
		await act(async () => { first.resolve([{ value: 'us', label: 'United States' }]); });
		expect(screen.queryByText('United States')).not.toBeInTheDocument();
		expect(screen.getByRole('status')).toBeInTheDocument();
		await act(async () => { second.resolve([{ value: 'ca', label: 'Canada' }]); });
		expect(screen.getByText('Canada')).toBeInTheDocument();
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
	});

	it('a failing load is shown as an error, not as "no options", and is logged with its cause', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const load = vi.fn().mockRejectedValue(new Error('503 daemon down'));
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
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'x' } });
		await advanceAndFlush(0);
		expect(screen.getByText('Could not load options')).toBeInTheDocument();
		expect(screen.queryByText('Nothing found')).not.toBeInTheDocument();
		expect(consoleError).toHaveBeenCalledTimes(1);
		expect(String(consoleError.mock.calls[0]?.[0])).toContain('loadOptions("x")');
		expect(consoleError.mock.calls[0]?.[1]).toEqual(new Error('503 daemon down'));
		consoleError.mockRestore();
	});

	it('the next successful search replaces the error with the results', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const load = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(mockOptions);
		render(
			<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={load} debounceMs={0} />,
		);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'x' } });
		await advanceAndFlush(0);
		expect(screen.getByText('Could not load options')).toBeInTheDocument();
		fireEvent.change(input, { target: { value: 'u' } });
		await advanceAndFlush(0);
		expect(screen.queryByText('Could not load options')).not.toBeInTheDocument();
		expect(screen.getByText('Canada')).toBeInTheDocument();
		consoleError.mockRestore();
	});

	it('an empty answer still says "no options" (not the error)', async () => {
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={vi.fn()}
				loadOptions={vi.fn().mockResolvedValue([])}
				debounceMs={0}
			/>,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'x' } });
		await advanceAndFlush(0);
		expect(screen.getByText('No options')).toBeInTheDocument();
		expect(screen.queryByText('Could not load options')).not.toBeInTheDocument();
	});

	it('unmounting before the debounce fires never calls loadOptions', () => {
		const load = makeLoad();
		const { unmount } = render(
			<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={load} debounceMs={200} />,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'can' } });
		unmount();
		vi.advanceTimersByTime(1000);
		expect(load).not.toHaveBeenCalled();
	});

	it('the default debounce is 300 ms', () => {
		const load = makeLoad();
		render(<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={load} />);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'can' } });
		act(() => { vi.advanceTimersByTime(299); });
		expect(load).not.toHaveBeenCalled();
		act(() => { vi.advanceTimersByTime(1); });
		expect(load).toHaveBeenCalledExactlyOnceWith('can');
	});
});

describe('FieldAsyncSelect — focus, blur and keyboard details', () => {
	async function openWithOptions() {
		const onChange = vi.fn();
		render(
			<FieldAsyncSelect label="Country" value={null} onChange={onChange} loadOptions={makeLoad()} debounceMs={0} />,
		);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'u' } });
		await advanceAndFlush(0);
		return { input, onChange };
	}

	it('blur closes the list only after the grace delay', async () => {
		const { input } = await openWithOptions();
		fireEvent.blur(input);
		act(() => { vi.advanceTimersByTime(149); });
		expect(screen.getByText('Canada')).toBeInTheDocument();
		act(() => { vi.advanceTimersByTime(1); });
		expect(screen.queryByText('Canada')).not.toBeInTheDocument();
	});

	it('coming back within the grace delay keeps the list open', async () => {
		const { input } = await openWithOptions();
		fireEvent.blur(input);
		act(() => { vi.advanceTimersByTime(100); });
		fireEvent.focus(input);
		await advanceAndFlush(200);
		expect(input).toHaveAttribute('aria-expanded', 'true');
	});

	it('ArrowDown / ArrowUp move the active option, announce it, and stop at the ends', async () => {
		const { input } = await openWithOptions();
		const active = () => input.getAttribute('aria-activedescendant');
		expect(active()).toBeNull();
		fireEvent.keyDown(input, { key: 'ArrowDown' });
		const first = active();
		expect(first).toMatch(/-option-0$/);
		fireEvent.keyDown(input, { key: 'ArrowDown' });
		expect(active()).toMatch(/-option-1$/);
		fireEvent.keyDown(input, { key: 'ArrowDown' });
		fireEvent.keyDown(input, { key: 'ArrowDown' });
		expect(active()).toMatch(/-option-2$/);
		fireEvent.keyDown(input, { key: 'ArrowUp' });
		expect(active()).toMatch(/-option-1$/);
		fireEvent.keyDown(input, { key: 'ArrowUp' });
		fireEvent.keyDown(input, { key: 'ArrowUp' });
		fireEvent.keyDown(input, { key: 'ArrowUp' });
		expect(active()).toBeNull();
		expect(document.getElementById(first as string)).toHaveTextContent('United States');
	});

	it('Enter selects the first option when none is highlighted', async () => {
		const { input, onChange } = await openWithOptions();
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('us');
	});

	it('Enter picks the option highlighted with the arrows, not the first', async () => {
		const { input, onChange } = await openWithOptions();
		fireEvent.keyDown(input, { key: 'ArrowDown' });
		fireEvent.keyDown(input, { key: 'ArrowDown' });
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).toHaveBeenCalledExactlyOnceWith('ca');
	});

	it('Enter, Escape and ArrowUp on a closed list are left to the browser', () => {
		render(<FieldAsyncSelect label="Country" value={null} onChange={vi.fn()} loadOptions={makeLoad()} />);
		const input = screen.getByRole('combobox');
		expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true);
		expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(true);
		expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(true);
	});

	it('Enter with no option loaded selects nothing', async () => {
		const onChange = vi.fn();
		render(
			<FieldAsyncSelect
				label="Country"
				value={null}
				onChange={onChange}
				loadOptions={vi.fn().mockResolvedValue([])}
				debounceMs={0}
			/>,
		);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'zzz' } });
		await advanceAndFlush(0);
		fireEvent.keyDown(input, { key: 'Enter' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('focusing a disabled field neither opens the list nor loads anything', () => {
		const load = makeLoad();
		render(<FieldAsyncSelect label="Country" disabled value={null} onChange={vi.fn()} loadOptions={load} />);
		fireEvent.focus(screen.getByRole('combobox'));
		act(() => { vi.advanceTimersByTime(1000); });
		expect(load).not.toHaveBeenCalled();
		expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
	});

	it('closing the list puts the selected label back instead of the half-typed query', async () => {
		const { input } = await openWithOptions();
		expect(input).toHaveValue('u');
		fireEvent.keyDown(input, { key: 'Escape' });
		expect(input).toHaveValue('');
	});

	it('the clear button gives the focus back to the input', () => {
		render(<FieldAsyncSelect label="Country" value="us" onChange={vi.fn()} loadOptions={makeLoad()} />);
		fireEvent.click(screen.getByRole('button', { name: /clear/i }));
		expect(document.activeElement).toBe(screen.getByRole('combobox'));
	});

	it('the selected option is marked in the list', async () => {
		render(<FieldAsyncSelect label="Country" value="ca" onChange={vi.fn()} loadOptions={makeLoad()} debounceMs={0} />);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'u' } });
		await advanceAndFlush(0);
		const options = screen.getAllByRole('option');
		expect(options.map(o => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
	});

	it('the error text is announced and tied to the input', () => {
		render(
			<FieldAsyncSelect label="Country" error="Required" value={null} onChange={vi.fn()} loadOptions={makeLoad()} />,
		);
		const alert = screen.getByRole('alert');
		expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByRole('combobox').getAttribute('aria-describedby')).toBe(alert.id);
	});

	it('carries the value in a hidden input only when it has a name', () => {
		const { container, rerender } = render(
			<FieldAsyncSelect label="Country" name="country" value="ca" onChange={vi.fn()} loadOptions={makeLoad()} />,
		);
		expect(container.querySelector('input[type="hidden"]')).toHaveAttribute('value', 'ca');
		rerender(<FieldAsyncSelect label="Country" name="country" value={null} onChange={vi.fn()} loadOptions={makeLoad()} />);
		expect(container.querySelector('input[type="hidden"]')).toHaveAttribute('value', '');
		rerender(<FieldAsyncSelect label="Country" value="ca" onChange={vi.fn()} loadOptions={makeLoad()} />);
		expect(container.querySelector('input[type="hidden"]')).toBeNull();
	});
});

// Label of a value the user did not pick here (saved form, external change of `value`).

describe('FieldAsyncSelect - label of a pre-selected value', () => {
	const flush = () => act(async () => { await Promise.resolve(); });

	function renderWith(value: string | null, loadSelected?: (v: string) => Promise<FieldAsyncSelectOption | null>) {
		const ui = (v: string | null, ls = loadSelected) => (
			<FieldAsyncSelect label="Country" value={v} onChange={vi.fn()} loadOptions={makeLoad()} loadSelected={ls} debounceMs={0} />
		);
		const view = render(ui(value));
		return { ...view, again: (v: string | null, ls = loadSelected) => view.rerender(ui(v, ls)) };
	}

	it('shows the raw value, never an empty-looking input, when nothing can resolve its label', () => {
		renderWith('us');
		expect(screen.getByRole('combobox')).toHaveValue('us');
	});

	it('asks loadSelected once for the value and shows the label it returns', async () => {
		const loadSelected = vi.fn().mockResolvedValue({ value: 'us', label: 'United States' });
		renderWith('us', loadSelected);
		expect(screen.getByRole('combobox')).toHaveValue('us');
		await flush();
		expect(loadSelected).toHaveBeenCalledExactlyOnceWith('us');
		expect(screen.getByRole('combobox')).toHaveValue('United States');
	});

	it('an external change to another value replaces the previous label', async () => {
		const loadSelected = vi.fn(async (v: string) => ({ value: v, label: v === 'us' ? 'United States' : 'Canada' }));
		const { again } = renderWith('us', loadSelected);
		await flush();
		again('ca');
		expect(screen.getByRole('combobox')).toHaveValue('ca');
		await flush();
		expect(screen.getByRole('combobox')).toHaveValue('Canada');
		expect(loadSelected.mock.calls.map(c => c[0])).toEqual(['us', 'ca']);
	});

	it('a value listed in the options already loaded needs no extra request', async () => {
		const loadSelected = vi.fn().mockResolvedValue(null);
		const { again } = renderWith(null, loadSelected);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'u' } });
		await advanceAndFlush(0);
		again('uk');
		expect(loadSelected).not.toHaveBeenCalled();
		fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
		expect(screen.getByRole('combobox')).toHaveValue('United Kingdom');
	});

	it('options arriving after a provisional value supply its label', async () => {
		renderWith('ca');
		expect(screen.getByRole('combobox')).toHaveValue('ca');
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c' } });
		await advanceAndFlush(0);
		fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
		expect(screen.getByRole('combobox')).toHaveValue('Canada');
	});

	it('an option chosen in the list is never overwritten by a late loadSelected answer', async () => {
		let resolveSelected!: (o: FieldAsyncSelectOption | null) => void;
		const loadSelected = vi.fn(() => new Promise<FieldAsyncSelectOption | null>(r => { resolveSelected = r; }));
		const onChange = vi.fn();
		const { rerender } = render(
			<FieldAsyncSelect label="Country" value="us" onChange={onChange} loadOptions={makeLoad()} loadSelected={loadSelected} debounceMs={0} />,
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c' } });
		await advanceAndFlush(0);
		fireEvent.click(screen.getByRole('button', { name: 'Canada' }));
		rerender(
			<FieldAsyncSelect label="Country" value="ca" onChange={onChange} loadOptions={makeLoad()} loadSelected={loadSelected} debounceMs={0} />,
		);
		await act(async () => { resolveSelected({ value: 'us', label: 'United States' }); });
		expect(screen.getByRole('combobox')).toHaveValue('Canada');
	});

	it('an answer for a value that is no longer selected is ignored', async () => {
		let resolveSelected!: (o: FieldAsyncSelectOption | null) => void;
		const loadSelected = vi.fn(() => new Promise<FieldAsyncSelectOption | null>(r => { resolveSelected = r; }));
		const { again } = renderWith('us', loadSelected);
		again(null);
		await act(async () => { resolveSelected({ value: 'us', label: 'United States' }); });
		expect(screen.getByRole('combobox')).toHaveValue('');
	});

	it('an answer describing another value is ignored', async () => {
		const loadSelected = vi.fn().mockResolvedValue({ value: 'ca', label: 'Canada' });
		renderWith('us', loadSelected);
		await flush();
		expect(screen.getByRole('combobox')).toHaveValue('us');
	});

	it('a missing option keeps the raw value without any error', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		renderWith('us', vi.fn().mockResolvedValue(null));
		await flush();
		expect(screen.getByRole('combobox')).toHaveValue('us');
		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it('a failing loadSelected is logged with the value and the cause, and the raw value stays', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const cause = new Error('boom');
		renderWith('us', vi.fn().mockRejectedValue(cause));
		await flush();
		expect(error).toHaveBeenCalledExactlyOnceWith('[FieldAsyncSelect] loadSelected("us") failed; showing the raw value:', cause);
		expect(screen.getByRole('combobox')).toHaveValue('us');
		error.mockRestore();
	});

	it('the label arriving while the user types does not replace their text; closing restores it', async () => {
		let resolveSelected!: (o: FieldAsyncSelectOption | null) => void;
		const loadSelected = vi.fn(() => new Promise<FieldAsyncSelectOption | null>(r => { resolveSelected = r; }));
		renderWith('us', loadSelected);
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'xyz' } });
		await act(async () => { resolveSelected({ value: 'us', label: 'United States' }); });
		expect(input).toHaveValue('xyz');
		fireEvent.keyDown(input, { key: 'Escape' });
		expect(input).toHaveValue('United States');
	});

	it('clearing the value empties the input even before the label arrived', async () => {
		const { again } = renderWith('us', vi.fn(() => new Promise<FieldAsyncSelectOption | null>(() => {})));
		again(null);
		expect(screen.getByRole('combobox')).toHaveValue('');
	});
});
