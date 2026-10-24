import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TimePicker } from './TimePicker.js';

// The panel is rendered through the controlled `open` prop so each case goes straight to the spinbuttons.
function renderOpen(value: string | null, props: Partial<React.ComponentProps<typeof TimePicker>> = {}) {
	const onChange = vi.fn();
	render(<TimePicker value={value} onChange={onChange} open {...props} />);
	return onChange;
}

afterEach(() => {
	vi.useRealTimers();
});

describe('TimePicker 12-hour arithmetic (the AM/PM half is preserved, 12 wraps to 1)', () => {
	it.each([
		['00:30', '01:30'], // 12:30 AM -> 1:30 AM
		['09:15', '10:15'],
		['11:30', '00:30'], // 11:30 AM -> 12:30 AM (midnight hour)
		['12:30', '13:30'], // 12:30 PM -> 1:30 PM
		['23:30', '12:30'], // 11:30 PM -> 12:30 PM (noon hour)
	])('incrementing the hours of %s gives %s', (start, expected) => {
		const onChange = renderOpen(start, { is12Hour: true });

		fireEvent.click(screen.getByRole('button', { name: 'Increment hours' }));

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith(expected);
	});

	it.each([
		['01:30', '00:30'], // 1:30 AM -> 12:30 AM
		['11:30', '10:30'],
		['00:30', '11:30'], // 12:30 AM -> 11:30 AM
		['13:30', '12:30'], // 1:30 PM -> 12:30 PM
		['12:30', '23:30'], // 12:30 PM -> 11:30 PM
	])('decrementing the hours of %s gives %s', (start, expected) => {
		const onChange = renderOpen(start, { is12Hour: true });

		fireEvent.click(screen.getByRole('button', { name: 'Decrement hours' }));

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith(expected);
	});

	it('the hours spinbutton exposes the 1-12 range and the 12-hour reading', () => {
		renderOpen('15:05', { is12Hour: true });

		const hours = screen.getByRole('spinbutton', { name: 'Hours' });
		expect(hours).toHaveAttribute('aria-valuemin', '1');
		expect(hours).toHaveAttribute('aria-valuemax', '12');
		expect(hours).toHaveAttribute('aria-valuenow', '3');
		expect(hours).toHaveAttribute('aria-valuetext', '03');
	});

	it('the 24-hour spinbutton exposes the 0-23 range', () => {
		renderOpen('15:05');

		const hours = screen.getByRole('spinbutton', { name: 'Hours' });
		expect(hours).toHaveAttribute('aria-valuemin', '0');
		expect(hours).toHaveAttribute('aria-valuemax', '23');
		expect(hours).toHaveAttribute('aria-valuenow', '15');
	});

	it('keyboard arrows in 12-hour mode follow the same arithmetic as the buttons', () => {
		const onChange = renderOpen('12:30', { is12Hour: true });
		const hours = screen.getByRole('spinbutton', { name: 'Hours' });

		expect(fireEvent.keyDown(hours, { key: 'ArrowUp' })).toBe(false);
		expect(fireEvent.keyDown(hours, { key: 'ArrowDown' })).toBe(false);

		expect(onChange).toHaveBeenNthCalledWith(1, '13:30');
		expect(onChange).toHaveBeenNthCalledWith(2, '23:30');
	});
});

describe('TimePicker minute arithmetic', () => {
	it.each([
		['10:00', 1, '09:59'],
		['00:00', 1, '23:59'], // wraps through midnight
		['10:00', 15, '09:45'],
		['10:15', 15, '10:00'], // a step that fits in the minutes does not borrow an hour
		['10:10', 15, '10:00'], // off the grid: snaps down to its own line instead of borrowing the hour (was 09:45)
	])('decrementing the minutes of %s by step %i gives %s', (start, step, expected) => {
		const onChange = renderOpen(start, { minuteStep: step });

		fireEvent.click(screen.getByRole('button', { name: 'Decrement minutes' }));

		expect(onChange).toHaveBeenCalledWith(expected);
	});

	it.each([
		['10:10', 15, '10:15'], // off the grid: the next line (was 10:25)
		['10:50', 15, '11:00'],
		['10:00', 1, '10:01'],
	])('incrementing the minutes of %s by step %i gives %s', (start, step, expected) => {
		const onChange = renderOpen(start, { minuteStep: step });

		fireEvent.click(screen.getByRole('button', { name: 'Increment minutes' }));

		expect(onChange).toHaveBeenCalledWith(expected);
	});

	it('the keyboard arrows on the minutes follow the same grid as the buttons', () => {
		const onChange = renderOpen('10:10', { minuteStep: 15 });
		const minutes = screen.getByRole('spinbutton', { name: 'Minutes' });

		fireEvent.keyDown(minutes, { key: 'ArrowUp' });
		fireEvent.keyDown(minutes, { key: 'ArrowDown' });

		expect(onChange).toHaveBeenNthCalledWith(1, '10:15');
		expect(onChange).toHaveBeenNthCalledWith(2, '10:00');
	});

	it('an unusable minuteStep is reported and the buttons step by 1 instead of doing nothing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const onChange = renderOpen('10:10', { minuteStep: 0 });

		fireEvent.click(screen.getByRole('button', { name: 'Increment minutes' }));

		expect(onChange).toHaveBeenCalledWith('10:11');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('minuteStep must be a whole number of minutes (1 or more), got 0'));
		warn.mockRestore();
	});

	it('incrementing past the end of the hour carries into the hour, and 23:45 + 15 wraps to 00:00', () => {
		const onChange = renderOpen('23:45', { minuteStep: 15 });

		fireEvent.click(screen.getByRole('button', { name: 'Increment minutes' }));

		expect(onChange).toHaveBeenCalledWith('00:00');
	});
});

describe('TimePicker keyboard focus', () => {
	it('Tab on the hours spinbutton moves focus to the minutes and is prevented; Shift+Tab does not jump to the minutes', () => {
		renderOpen('10:20');
		const hours = screen.getByRole('spinbutton', { name: 'Hours' });
		const minutes = screen.getByRole('spinbutton', { name: 'Minutes' });
		hours.focus();

		expect(fireEvent.keyDown(hours, { key: 'Tab' })).toBe(false);
		expect(minutes).toHaveFocus();

		// Shift+Tab is not handled by the picker. (Radix loops focus inside the popover, so it may still
		// be prevented and wrapped to the last control; what matters here is that it never goes to the minutes.)
		hours.focus();
		fireEvent.keyDown(hours, { key: 'Tab', shiftKey: true });
		expect(minutes).not.toHaveFocus();
	});

	it('other keys on the spinbuttons are not prevented and change nothing', () => {
		const onChange = renderOpen('10:20');

		expect(fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Hours' }), { key: 'a' })).toBe(true);
		expect(fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Minutes' }), { key: 'a' })).toBe(true);

		expect(onChange).not.toHaveBeenCalled();
	});
});

describe('TimePicker "Now" button', () => {
	function clickNowAt(time: [number, number], minuteStep?: number) {
		// Several clicks in one test: start from a clean document each time.
		cleanup();
		vi.useFakeTimers({ toFake: ['Date'], now: new Date(2024, 5, 10, time[0], time[1], 30) });
		const onChange = renderOpen(null, { minuteStep });
		fireEvent.click(screen.getByRole('button', { name: 'Now' }));
		return onChange;
	}

	it('uses the local time as is with the default step', () => {
		expect(clickNowAt([14, 7])).toHaveBeenCalledWith('14:07');
	});

	it('rounds to the nearest step', () => {
		expect(clickNowAt([14, 7], 15)).toHaveBeenCalledWith('14:00');
		expect(clickNowAt([14, 8], 5)).toHaveBeenCalledWith('14:10');
	});

	it('rounding up to the next hour carries the hour, and 23:53 rolls over to 00:00', () => {
		expect(clickNowAt([14, 53], 15)).toHaveBeenCalledWith('15:00');
		expect(clickNowAt([23, 53], 15)).toHaveBeenCalledWith('00:00');
	});
});

describe('TimePicker value parsing', () => {
	it.each(['25:00', '12:60', '9:5', 'abc', '', '12:3a', '-1:00'])('shows the placeholder for the invalid value %j', value => {
		render(<TimePicker value={value} onChange={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Select a time...' })).toBeInTheDocument();
	});

	it('accepts a one-digit hour and displays it padded; the bounds 00:00 and 23:59 are valid', () => {
		const { rerender } = render(<TimePicker value="9:05" onChange={vi.fn()} />);
		expect(screen.getByRole('button', { name: '09:05' })).toBeInTheDocument();

		rerender(<TimePicker value="00:00" onChange={vi.fn()} />);
		expect(screen.getByRole('button', { name: '00:00' })).toBeInTheDocument();
		rerender(<TimePicker value="23:59" onChange={vi.fn()} />);
		expect(screen.getByRole('button', { name: '23:59' })).toBeInTheDocument();
	});

	it('an invalid value is treated as 00:00 by the spinbuttons', () => {
		const onChange = renderOpen('nonsense');

		fireEvent.click(screen.getByRole('button', { name: 'Increment minutes' }));

		expect(onChange).toHaveBeenCalledWith('00:01');
	});
});

describe('TimePicker controlled open state', () => {
	it('clicking the trigger asks onOpenChange for the opposite state and does not move on its own', () => {
		const onOpenChange = vi.fn();
		render(<TimePicker value="10:00" onChange={vi.fn()} open={false} onOpenChange={onOpenChange} />);

		fireEvent.click(screen.getByRole('button', { name: '10:00' }));

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(screen.queryByRole('dialog', { name: 'Time picker' })).toBeNull();
	});

	it('a disabled picker never asks to open', () => {
		const onOpenChange = vi.fn();
		render(<TimePicker value="10:00" onChange={vi.fn()} disabled onOpenChange={onOpenChange} />);

		fireEvent.click(screen.getByRole('button', { name: '10:00' }));

		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('forwards control props (id) to the trigger', () => {
		render(<TimePicker value="10:00" onChange={vi.fn()} id="time-field" />);

		expect(screen.getByRole('button', { name: '10:00' })).toHaveAttribute('id', 'time-field');
	});
});
