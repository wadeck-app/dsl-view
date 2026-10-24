import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DatePicker } from './DatePicker.js';

// Dates are built with the local-time constructor on purpose: the component works in local time, so these
// expectations hold in any timezone.
const JAN_15 = new Date(2024, 0, 15);

function openCalendar() {
	const input = screen.getByRole('textbox');
	fireEvent.focus(input);
	return input;
}

// The calendar buttons carry only the day number. The grid also shows trailing/leading days of the neighbouring
// months, so pick the one inside the displayed month by its position among buttons with that number.
function dayButton(day: number, occurrence = 0) {
	const matches = screen.getAllByRole('button', { name: String(day) });
	return matches[occurrence]!;
}

afterEach(() => {
	vi.useRealTimers();
});

describe('DatePicker calendar', () => {
	it('stays closed until the input is focused, and focusing a disabled input does not open it', () => {
		const { rerender } = render(<DatePicker value={JAN_15} onChange={vi.fn()} />);
		expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();

		openCalendar();
		expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'January 2024' })).toBeInTheDocument();

		rerender(<DatePicker value={JAN_15} onChange={vi.fn()} disabled />);
		fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
		expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
		fireEvent.focus(screen.getByRole('textbox'));
		expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
	});

	it('clicking a day reports that exact local date through onChange and onSelect, then closes the calendar', () => {
		const onChange = vi.fn();
		const onSelect = vi.fn();
		render(<DatePicker value={JAN_15} onChange={onChange} onSelect={onSelect} />);
		openCalendar();

		fireEvent.click(dayButton(20));

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith(new Date(2024, 0, 20));
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(new Date(2024, 0, 20));
		expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
	});

	it('disabled days (minDate, maxDate, isDateDisabled) are disabled buttons and report nothing', () => {
		const onChange = vi.fn();
		render(
			<DatePicker
				value={JAN_15}
				onChange={onChange}
				minDate={new Date(2024, 0, 10)}
				maxDate={new Date(2024, 0, 25)}
				isDateDisabled={date => date.getDate() === 18}
			/>
		);
		openCalendar();

		expect(dayButton(5)).toBeDisabled(); // before minDate
		expect(dayButton(28)).toBeDisabled(); // after maxDate
		expect(dayButton(18)).toBeDisabled(); // predicate
		expect(dayButton(10)).toBeEnabled(); // minDate itself is allowed
		expect(dayButton(25)).toBeEnabled(); // maxDate itself is allowed

		fireEvent.click(dayButton(5));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('previous and next month buttons move the displayed month, across a year boundary', () => {
		render(<DatePicker value={new Date(2024, 0, 15)} onChange={vi.fn()} />);
		openCalendar();

		fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
		expect(screen.getByRole('heading', { name: 'December 2023' })).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
		fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
		expect(screen.getByRole('heading', { name: 'February 2024' })).toBeInTheDocument();
	});

	it('the Today button selects today (local date), and is ignored when today is disabled', () => {
		vi.useFakeTimers({ toFake: ['Date'], now: new Date(2024, 5, 10, 15, 30) });
		const onChange = vi.fn();
		const { rerender } = render(<DatePicker value={null} onChange={onChange} />);
		openCalendar();

		fireEvent.click(screen.getByRole('button', { name: 'Today' }));
		expect(onChange).toHaveBeenCalledTimes(1);
		const picked = onChange.mock.calls[0]![0] as Date;
		expect([picked.getFullYear(), picked.getMonth(), picked.getDate()]).toStrictEqual([2024, 5, 10]);

		onChange.mockClear();
		rerender(<DatePicker value={null} onChange={onChange} minDate={new Date(2024, 5, 11)} />);
		openCalendar();
		fireEvent.click(screen.getByRole('button', { name: 'Today' }));
		expect(onChange).not.toHaveBeenCalled();
	});

	describe('keyboard inside the calendar', () => {
		function calendar() {
			// The popover content is the element that owns the key handler; it is the parent of the month heading.
			return screen.getByRole('heading', { name: /\d{4}$/ }).closest('[tabindex="-1"]') as HTMLElement;
		}

		it('arrow keys move the focused day and Enter selects it (right +1, down +7, left -1, up -7)', () => {
			const onChange = vi.fn();
			render(<DatePicker value={JAN_15} onChange={onChange} />);
			openCalendar();

			fireEvent.keyDown(calendar(), { key: 'ArrowRight' });
			fireEvent.keyDown(calendar(), { key: 'ArrowDown' });
			fireEvent.keyDown(calendar(), { key: 'ArrowLeft' });
			fireEvent.keyDown(calendar(), { key: 'ArrowUp' });
			fireEvent.keyDown(calendar(), { key: 'ArrowRight' });
			fireEvent.keyDown(calendar(), { key: 'Enter' });

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith(new Date(2024, 0, 16));
		});

		it('moving past the end of the month shows the next month', () => {
			render(<DatePicker value={new Date(2024, 0, 31)} onChange={vi.fn()} />);
			openCalendar();

			fireEvent.keyDown(calendar(), { key: 'ArrowRight' });

			expect(screen.getByRole('heading', { name: 'February 2024' })).toBeInTheDocument();
		});

		it('does not move onto a disabled day, and Enter on a disabled focused day selects nothing', () => {
			const onChange = vi.fn();
			render(<DatePicker value={JAN_15} onChange={onChange} isDateDisabled={date => date.getDate() === 16} />);
			openCalendar();

			fireEvent.keyDown(calendar(), { key: 'ArrowRight' }); // 16 is disabled: focus stays on 15
			fireEvent.keyDown(calendar(), { key: 'Enter' });

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith(new Date(2024, 0, 15));
		});

		it('Escape closes the calendar and prevents the default action', () => {
			render(<DatePicker value={JAN_15} onChange={vi.fn()} />);
			openCalendar();

			const notPrevented = fireEvent.keyDown(calendar(), { key: 'Escape' });

			expect(notPrevented).toBe(false);
			expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
		});

		it('ignores keys when no day has focus yet (empty value)', () => {
			const onChange = vi.fn();
			render(<DatePicker value={null} onChange={onChange} />);
			openCalendar();

			fireEvent.keyDown(calendar(), { key: 'Enter' });
			fireEvent.keyDown(calendar(), { key: 'ArrowRight' });

			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('keyboard on the input', () => {
		it('ArrowDown and Enter open the calendar (preventing the default) and Escape closes it', () => {
			render(<DatePicker value={JAN_15} onChange={vi.fn()} />);
			const input = screen.getByRole('textbox');

			expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(false);
			expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();

			fireEvent.keyDown(input, { key: 'Escape' });
			expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();

			expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false);
			expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
		});

		it('other keys neither open the calendar nor are prevented', () => {
			render(<DatePicker value={JAN_15} onChange={vi.fn()} />);

			expect(fireEvent.keyDown(screen.getByRole('textbox'), { key: 'a' })).toBe(true);
			expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
		});
	});

	describe('typing a date', () => {
		it('reports the parsed date when the text matches dateFormat, and the calendar follows its month', () => {
			const onChange = vi.fn();
			render(<DatePicker value={null} onChange={onChange} dateFormat="yyyy-MM-dd" />);
			const input = openCalendar();

			fireEvent.change(input, { target: { value: '2025-03-09' } });

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith(new Date(2025, 2, 9));
			expect(screen.getByRole('heading', { name: 'March 2025' })).toBeInTheDocument();
		});

		it('reports null for an empty text and nothing for text that does not parse', () => {
			const onChange = vi.fn();
			render(<DatePicker value={JAN_15} onChange={onChange} dateFormat="yyyy-MM-dd" />);
			const input = screen.getByRole('textbox');

			fireEvent.change(input, { target: { value: 'not a date' } });
			expect(onChange).not.toHaveBeenCalled();

			fireEvent.change(input, { target: { value: '   ' } });
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith(null);
		});

		it('does not report a typed date that is disabled, but keeps the typed text visible', () => {
			const onChange = vi.fn();
			render(<DatePicker value={null} onChange={onChange} dateFormat="yyyy-MM-dd" minDate={new Date(2024, 0, 10)} />);
			const input = screen.getByRole('textbox') as HTMLInputElement;

			fireEvent.change(input, { target: { value: '2024-01-05' } });

			expect(onChange).not.toHaveBeenCalled();
			expect(input.value).toBe('2024-01-05');
		});

		it('keeps the calendar open on a month change from the outside: value moves to another month', () => {
			const { rerender } = render(<DatePicker value={JAN_15} onChange={vi.fn()} />);
			openCalendar();
			expect(screen.getByRole('heading', { name: 'January 2024' })).toBeInTheDocument();

			rerender(<DatePicker value={new Date(2024, 6, 4)} onChange={vi.fn()} />);

			expect(screen.getByRole('heading', { name: 'July 2024' })).toBeInTheDocument();
			expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Jul 4, 2024');
		});
	});

	it('marks the selected day with the primary background and does not for the others', () => {
		render(<DatePicker value={JAN_15} onChange={vi.fn()} />);
		openCalendar();

		const grid = screen.getByRole('button', { name: 'Today' }).parentElement as HTMLElement;
		const selected = within(grid).getAllByRole('button', { name: '15' })[0]!;
		const other = within(grid).getAllByRole('button', { name: '16' })[0]!;
		// Layout contract: the selection highlight is the primary token (documented in theming.md).
		expect(selected.className).toContain('bg-primary');
		expect(other.className).not.toContain('bg-primary');
	});
});
