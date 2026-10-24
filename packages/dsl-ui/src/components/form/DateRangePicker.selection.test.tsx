import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DateRange } from './DateRangePicker.js';
import { DateRangePicker } from './DateRangePicker.js';

// Local-time constructors on purpose: the component works in local time, so these hold in any timezone.
const EMPTY: DateRange = { from: null, to: null };
const JAN_2024: DateRange = { from: new Date(2024, 0, 10), to: new Date(2024, 0, 20) };

function open(name: string | RegExp) {
	fireEvent.click(screen.getByRole('button', { name }));
}

// A day shown as a trailing/leading cell of the neighbouring panel appears twice; the first match is enough.
function day(label: string) {
	return screen.getAllByRole('button', { name: label })[0]!;
}

describe('DateRangePicker range selection', () => {
	it('two clicks make a range: the first reports only "from", the second reports both and closes the calendar', () => {
		const onChange = vi.fn();
		render(<DateRangePicker value={JAN_2024} onChange={onChange} />);
		open(/Jan 10, 2024/);

		fireEvent.click(day('January 12, 2024'));
		expect(onChange).toHaveBeenLastCalledWith({ from: new Date(2024, 0, 12), to: null });
		expect(screen.getByRole('dialog', { name: 'Date range picker' })).toBeInTheDocument();

		fireEvent.click(day('January 25, 2024'));
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange).toHaveBeenLastCalledWith({ from: new Date(2024, 0, 12), to: new Date(2024, 0, 25) });
		expect(screen.queryByRole('dialog', { name: 'Date range picker' })).toBeNull();
	});

	it('a second click before the first swaps them, so from is always the earlier day', () => {
		const onChange = vi.fn();
		render(<DateRangePicker value={JAN_2024} onChange={onChange} />);
		open(/Jan 10, 2024/);

		fireEvent.click(day('January 25, 2024'));
		fireEvent.click(day('January 12, 2024'));

		expect(onChange).toHaveBeenLastCalledWith({ from: new Date(2024, 0, 12), to: new Date(2024, 0, 25) });
	});

	it('clicking the same day twice gives a one-day range', () => {
		const onChange = vi.fn();
		render(<DateRangePicker value={JAN_2024} onChange={onChange} />);
		open(/Jan 10, 2024/);

		fireEvent.click(day('January 12, 2024'));
		fireEvent.click(day('January 12, 2024'));

		expect(onChange).toHaveBeenLastCalledWith({ from: new Date(2024, 0, 12), to: new Date(2024, 0, 12) });
	});

	it('closing the calendar between the two clicks cancels the pending "from": the next click starts a new range', () => {
		const onChange = vi.fn();
		render(<DateRangePicker value={JAN_2024} onChange={onChange} />);
		open(/Jan 10, 2024/);
		fireEvent.click(day('January 12, 2024'));

		fireEvent.keyDown(screen.getByRole('dialog', { name: 'Date range picker' }), { key: 'Escape' });
		expect(screen.queryByRole('dialog', { name: 'Date range picker' })).toBeNull();

		open(/Jan 10, 2024/);
		fireEvent.click(day('January 25, 2024'));

		// Had the pending "from" survived, this click would have finished the range with to = Jan 25.
		expect(onChange).toHaveBeenLastCalledWith({ from: new Date(2024, 0, 25), to: null });
	});

	it('days outside minDate/maxDate or rejected by isDisabled are disabled and report nothing; the bounds themselves are allowed', () => {
		const onChange = vi.fn();
		render(
			<DateRangePicker
				value={JAN_2024}
				onChange={onChange}
				minDate={new Date(2024, 0, 5)}
				maxDate={new Date(2024, 0, 28)}
				isDisabled={date => date.getDate() === 15 && date.getMonth() === 0}
			/>
		);
		open(/Jan 10, 2024/);

		expect(day('January 4, 2024')).toBeDisabled();
		expect(day('January 29, 2024')).toBeDisabled();
		expect(day('January 15, 2024')).toBeDisabled();
		expect(day('January 5, 2024')).toBeEnabled();
		expect(day('January 28, 2024')).toBeEnabled();

		fireEvent.click(day('January 15, 2024'));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('marks the first and last day of the value as pressed and the days between as not pressed', () => {
		render(<DateRangePicker value={JAN_2024} onChange={vi.fn()} />);
		open(/Jan 10, 2024/);

		expect(day('January 10, 2024')).toHaveAttribute('aria-pressed', 'true');
		expect(day('January 20, 2024')).toHaveAttribute('aria-pressed', 'true');
		expect(day('January 15, 2024')).toHaveAttribute('aria-pressed', 'false');
		expect(day('January 21, 2024')).toHaveAttribute('aria-pressed', 'false');
	});

	it('while picking the second day, hovering previews the range (earlier hover swaps the ends) and leaving clears it', () => {
		render(<DateRangePicker value={JAN_2024} onChange={vi.fn()} />);
		open(/Jan 10, 2024/);
		fireEvent.click(day('January 12, 2024'));

		fireEvent.mouseEnter(day('January 25, 2024'));
		expect(day('January 12, 2024')).toHaveAttribute('aria-pressed', 'true');
		expect(day('January 25, 2024')).toHaveAttribute('aria-pressed', 'true');

		fireEvent.mouseLeave(day('January 25, 2024'));
		expect(day('January 25, 2024')).toHaveAttribute('aria-pressed', 'false');

		fireEvent.mouseEnter(day('January 5, 2024'));
		expect(day('January 5, 2024')).toHaveAttribute('aria-pressed', 'true');
		expect(day('January 12, 2024')).toHaveAttribute('aria-pressed', 'true');
	});

	it('hovering a day does not preview anything before the first day is picked', () => {
		render(<DateRangePicker value={EMPTY} onChange={vi.fn()} />);
		open('Select a date range...');
		const target = screen.getAllByRole('button').find(button => /^\w+ \d+, \d{4}$/.test(button.getAttribute('aria-label') ?? ''))!;

		fireEvent.mouseEnter(target);

		expect(target).toHaveAttribute('aria-pressed', 'false');
	});
});

describe('DateRangePicker month navigation', () => {
	it('shows two consecutive months; Previous moves both back and Next moves both forward, across a year boundary', () => {
		render(<DateRangePicker value={JAN_2024} onChange={vi.fn()} />);
		open(/Jan 10, 2024/);
		const headings = () => screen.getAllByRole('heading').map(heading => heading.textContent);
		expect(headings()).toStrictEqual(['January 2024', 'February 2024']);

		fireEvent.click(screen.getAllByRole('button', { name: 'Previous month' })[0]!);
		expect(headings()).toStrictEqual(['December 2023', 'January 2024']);

		fireEvent.click(screen.getAllByRole('button', { name: 'Next month' })[1]!);
		fireEvent.click(screen.getAllByRole('button', { name: 'Next month' })[1]!);
		expect(headings()).toStrictEqual(['February 2024', 'March 2024']);
	});

	it('only the left panel offers Previous and only the right panel offers Next', () => {
		render(<DateRangePicker value={JAN_2024} onChange={vi.fn()} />);
		open(/Jan 10, 2024/);

		const previous = screen.getAllByRole('button', { name: 'Previous month' });
		const next = screen.getAllByRole('button', { name: 'Next month' });
		expect(previous.map(button => (button as HTMLButtonElement).disabled)).toStrictEqual([false, true]);
		expect(next.map(button => (button as HTMLButtonElement).disabled)).toStrictEqual([true, false]);
	});
});

describe('DateRangePicker trigger and clear control', () => {
	it('the clear control is a keyboard button: Enter and Space clear the range without opening the calendar, other keys do nothing', () => {
		const onChange = vi.fn();
		render(<DateRangePicker value={JAN_2024} onChange={onChange} />);
		const clear = screen.getByRole('button', { name: 'Clear date range' });

		expect(fireEvent.keyDown(clear, { key: 'Enter' })).toBe(false);
		expect(fireEvent.keyDown(clear, { key: ' ' })).toBe(false);
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange).toHaveBeenLastCalledWith({ from: null, to: null });

		expect(fireEvent.keyDown(clear, { key: 'Tab' })).toBe(true);
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(screen.queryByRole('dialog', { name: 'Date range picker' })).toBeNull();
	});

	it('shows only the end date when just "to" is set, and forwards control props (id) to the trigger', () => {
		render(<DateRangePicker value={{ from: null, to: new Date(2024, 0, 20) }} onChange={vi.fn()} id="range-field" />);

		const trigger = screen.getByRole('button', { name: 'Jan 20, 2024' });
		expect(trigger).toHaveAttribute('id', 'range-field');
	});

	it('uses an en dash between the two ends of a multi-day range', () => {
		render(<DateRangePicker value={JAN_2024} onChange={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Jan 10, 2024 – Jan 20, 2024' })).toBeInTheDocument();
	});
});

describe('DateRangePicker controlled open state', () => {
	it('follows the open prop and reports close requests through onOpenChange without closing by itself', () => {
		const onOpenChange = vi.fn();
		render(<DateRangePicker value={JAN_2024} onChange={vi.fn()} open onOpenChange={onOpenChange} />);
		const dialog = screen.getByRole('dialog', { name: 'Date range picker' });

		fireEvent.keyDown(dialog, { key: 'Escape' });

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.getByRole('dialog', { name: 'Date range picker' })).toBeInTheDocument();
	});

	it('a preset in controlled mode asks to close instead of closing', () => {
		const onOpenChange = vi.fn();
		const onChange = vi.fn();
		render(<DateRangePicker value={JAN_2024} onChange={onChange} open onOpenChange={onOpenChange} />);

		fireEvent.click(screen.getByRole('button', { name: 'Today' }));

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.getByRole('dialog', { name: 'Date range picker' })).toBeInTheDocument();
	});
});
