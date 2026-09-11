import { fireEvent, render, screen } from '@testing-library/react';
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';

import { DateRangePicker, type DateRange } from './DateRangePicker.js';

// Fixed reference date for stable tests
const TODAY = new Date(2024, 0, 15); // Jan 15, 2024 (Monday)

const NULL_RANGE: DateRange = { from: null, to: null };

function renderPicker(
	value: DateRange = NULL_RANGE,
	onChange = vi.fn(),
	extraProps: Partial<React.ComponentProps<typeof DateRangePicker>> = {},
) {
	return render(
		<DateRangePicker value={value} onChange={onChange} {...extraProps} />,
	);
}

describe('DateRangePicker', () => {
	describe('Rendering', () => {
		it('renders trigger button with placeholder when no value', () => {
			renderPicker(NULL_RANGE, vi.fn(), { placeholder: 'Choose a range' });
			expect(screen.getByText('Choose a range')).toBeInTheDocument();
		});

		it('uses default placeholder when not specified', () => {
			renderPicker();
			expect(screen.getByText('Select a date range...')).toBeInTheDocument();
		});

		it('renders formatted range when both dates are set', () => {
			const from = new Date(2024, 0, 10);
			const to = new Date(2024, 0, 20);
			renderPicker({ from, to });
			expect(screen.getByText(/Jan 10, 2024.*Jan 20, 2024/)).toBeInTheDocument();
		});

		it('renders only from date when to is null', () => {
			renderPicker({ from: new Date(2024, 0, 10), to: null });
			expect(screen.getByText('Jan 10, 2024')).toBeInTheDocument();
		});

		it('renders a single date when from equals to', () => {
			const date = new Date(2024, 0, 15);
			renderPicker({ from: date, to: date });
			// Should show single formatted date (not "X – X")
			const btn = screen.getByRole('button', { name: /Jan 15, 2024/ });
			expect(btn).toBeInTheDocument();
		});

		it('disables trigger button when disabled prop is true', () => {
			renderPicker(NULL_RANGE, vi.fn(), { disabled: true });
			const btn = screen.getByRole('button', { name: /Select a date range/ });
			expect(btn).toBeDisabled();
		});

		it('shows clear button when range has a from value', () => {
			renderPicker({ from: new Date(2024, 0, 10), to: new Date(2024, 0, 20) });
			expect(screen.getByRole('button', { name: 'Clear date range' })).toBeInTheDocument();
		});

		it('hides clear button when range is null/null', () => {
			renderPicker(NULL_RANGE);
			expect(screen.queryByRole('button', { name: 'Clear date range' })).not.toBeInTheDocument();
		});

		it('hides clear button when disabled', () => {
			renderPicker(
				{ from: new Date(2024, 0, 10), to: new Date(2024, 0, 20) },
				vi.fn(),
				{ disabled: true },
			);
			expect(screen.queryByRole('button', { name: 'Clear date range' })).not.toBeInTheDocument();
		});
	});

	describe('Clear button', () => {
		it('calls onChange with null/null when clear is clicked', () => {
			const onChange = vi.fn();
			renderPicker({ from: new Date(2024, 0, 10), to: new Date(2024, 0, 20) }, onChange);

			const clearBtn = screen.getByRole('button', { name: 'Clear date range' });
			fireEvent.click(clearBtn);

			expect(onChange).toHaveBeenCalledWith({ from: null, to: null });
		});

		it('does not open the calendar when clear is clicked', () => {
			const onChange = vi.fn();
			renderPicker({ from: new Date(2024, 0, 10), to: new Date(2024, 0, 20) }, onChange);

			const clearBtn = screen.getByRole('button', { name: 'Clear date range' });
			fireEvent.click(clearBtn);

			// Calendar should not open (no month header visible)
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	describe('Popover open/close', () => {
		it('opens calendar when trigger is clicked', () => {
			renderPicker();
			const trigger = screen.getByRole('button', { name: /Select a date range/ });
			fireEvent.click(trigger);
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		it('shows preset buttons when calendar is open', () => {
			renderPicker();
			fireEvent.click(screen.getByRole('button', { name: /Select a date range/ }));

			expect(screen.getByText('Today')).toBeInTheDocument();
			expect(screen.getByText('This Week')).toBeInTheDocument();
			expect(screen.getByText('This Month')).toBeInTheDocument();
			expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
			expect(screen.getByText('Custom')).toBeInTheDocument();
		});

		it('shows two calendar panels when open', () => {
			renderPicker();
			fireEvent.click(screen.getByRole('button', { name: /Select a date range/ }));
			// Two month headers should be visible
			const monthHeaders = screen.getAllByRole('heading', { level: 2 });
			expect(monthHeaders).toHaveLength(2);
		});
	});

	describe('Preset buttons', () => {
		it('"Today" preset calls onChange with today as from and to', () => {
			const onChange = vi.fn();
			renderPicker(NULL_RANGE, onChange);
			fireEvent.click(screen.getByRole('button', { name: /Select a date range/ }));
			fireEvent.click(screen.getByText('Today'));

			expect(onChange).toHaveBeenCalled();
			const [call] = onChange.mock.calls;
			const range = call[0] as DateRange;
			expect(range.from).toBeTruthy();
			expect(range.to).toBeTruthy();
			// Both should be "today" by date
			const today = new Date();
			expect(format(range.from!, 'yyyy-MM-dd')).toBe(format(today, 'yyyy-MM-dd'));
			expect(format(range.to!, 'yyyy-MM-dd')).toBe(format(today, 'yyyy-MM-dd'));
		});

		it('"This Week" preset sets from=startOfWeek, to=endOfWeek', () => {
			const onChange = vi.fn();
			renderPicker(NULL_RANGE, onChange);
			fireEvent.click(screen.getByRole('button', { name: /Select a date range/ }));
			fireEvent.click(screen.getByText('This Week'));

			const [call] = onChange.mock.calls;
			const range = call[0] as DateRange;
			const today = new Date();
			expect(format(range.from!, 'yyyy-MM-dd')).toBe(format(startOfWeek(today), 'yyyy-MM-dd'));
			expect(format(range.to!, 'yyyy-MM-dd')).toBe(format(endOfWeek(today), 'yyyy-MM-dd'));
		});

		it('"This Month" preset sets from=startOfMonth, to=endOfMonth', () => {
			const onChange = vi.fn();
			renderPicker(NULL_RANGE, onChange);
			fireEvent.click(screen.getByRole('button', { name: /Select a date range/ }));
			fireEvent.click(screen.getByText('This Month'));

			const [call] = onChange.mock.calls;
			const range = call[0] as DateRange;
			const today = new Date();
			expect(format(range.from!, 'yyyy-MM-dd')).toBe(format(startOfMonth(today), 'yyyy-MM-dd'));
			expect(format(range.to!, 'yyyy-MM-dd')).toBe(format(endOfMonth(today), 'yyyy-MM-dd'));
		});

		it('"Last 30 Days" preset sets from=29 days ago, to=today', () => {
			const onChange = vi.fn();
			renderPicker(NULL_RANGE, onChange);
			fireEvent.click(screen.getByRole('button', { name: /Select a date range/ }));
			fireEvent.click(screen.getByText('Last 30 Days'));

			const [call] = onChange.mock.calls;
			const range = call[0] as DateRange;
			const today = new Date();
			expect(format(range.from!, 'yyyy-MM-dd')).toBe(format(subDays(today, 29), 'yyyy-MM-dd'));
			expect(format(range.to!, 'yyyy-MM-dd')).toBe(format(today, 'yyyy-MM-dd'));
		});

		it('"Custom" preset does not call onChange', () => {
			const onChange = vi.fn();
			renderPicker(NULL_RANGE, onChange);
			fireEvent.click(screen.getByRole('button', { name: /Select a date range/ }));
			fireEvent.click(screen.getByText('Custom'));

			expect(onChange).not.toHaveBeenCalled();
		});

		it('preset closes the popover after selection (except Custom)', () => {
			const onChange = vi.fn();
			renderPicker(NULL_RANGE, onChange);
			fireEvent.click(screen.getByRole('button', { name: /Select a date range/ }));
			fireEvent.click(screen.getByText('Today'));

			// Popover should close after picking a preset
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	describe('Disabled state', () => {
		it('disabled trigger cannot be clicked to open', () => {
			renderPicker(NULL_RANGE, vi.fn(), { disabled: true });
			const trigger = screen.getByRole('button', { name: /Select a date range/ });
			expect(trigger).toBeDisabled();
			// Calendar should remain closed
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});

	describe('Controlled behavior', () => {
		it('updates displayed text when value prop changes via rerender', () => {
			const onChange = vi.fn();
			const { rerender } = renderPicker(NULL_RANGE, onChange);

			expect(screen.getByText('Select a date range...')).toBeInTheDocument();

			rerender(
				<DateRangePicker
					value={{ from: new Date(2024, 0, 10), to: new Date(2024, 0, 20) }}
					onChange={onChange}
				/>,
			);

			expect(screen.getByText(/Jan 10, 2024/)).toBeInTheDocument();
		});

		it('clears displayed text when value prop changes to null/null via rerender', () => {
			const onChange = vi.fn();
			const { rerender } = renderPicker(
				{ from: new Date(2024, 0, 10), to: new Date(2024, 0, 20) },
				onChange,
			);

			rerender(<DateRangePicker value={NULL_RANGE} onChange={onChange} />);

			expect(screen.getByText('Select a date range...')).toBeInTheDocument();
		});
	});

	describe('Custom dateFormat', () => {
		it('formats displayed range using custom dateFormat', () => {
			const from = new Date(2024, 0, 10);
			const to = new Date(2024, 0, 20);
			renderPicker({ from, to }, vi.fn(), { dateFormat: 'yyyy-MM-dd' });
			expect(screen.getByText(/2024-01-10.*2024-01-20/)).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('trigger button has aria-haspopup="dialog"', () => {
			renderPicker();
			const btn = screen.getByRole('button', { name: /Select a date range/ });
			expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
		});

		it('trigger button has aria-expanded=false when closed', () => {
			renderPicker();
			const btn = screen.getByRole('button', { name: /Select a date range/ });
			expect(btn).toHaveAttribute('aria-expanded', 'false');
		});

		it('trigger button has aria-expanded=true when open', () => {
			renderPicker();
			const btn = screen.getByRole('button', { name: /Select a date range/ });
			fireEvent.click(btn);
			expect(btn).toHaveAttribute('aria-expanded', 'true');
		});

		it('calendar panel has role=dialog when open', () => {
			renderPicker();
			fireEvent.click(screen.getByRole('button', { name: /Select a date range/ }));
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});
	});
});
