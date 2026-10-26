import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DateFormatProvider } from '@dsl-ui/dates/DateFormatContext.js';
import { DEFAULT_DATE_SETTINGS } from '@dsl-ui/dates/dateSettings.js';

import { buildCalendarGrid } from './calendarUtils.js';
import { formatDay, formatDayLong, formatDayNumber, formatMonthTitle, noonOfDay, parseDay } from './calendarFormat.js';
import { DatePicker } from './DatePicker.js';
import { DateRangePicker } from './DateRangePicker.js';
import { FieldDateTime } from './FieldDateTime.js';
import { TimePicker } from './TimePicker.js';

// Local-time constructors on purpose: the pickers work on local calendar days, so these hold in any machine time zone.
const JAN_15 = new Date(2024, 0, 15);
const settings = (change: Partial<typeof DEFAULT_DATE_SETTINGS>) => createDateFormatter({ ...DEFAULT_DATE_SETTINGS, ...change });
const withDates = (change: Partial<typeof DEFAULT_DATE_SETTINGS>, ui: React.ReactElement) => render(<DateFormatProvider formatter={settings(change)}>{ui}</DateFormatProvider>);

afterEach(() => {
	vi.useRealTimers();
});

// The seven weekday headers of the open calendar, in DOM order (the first column first).
function weekdayHeaders(): string[] {
	const grid = document.body.querySelector('.grid-cols-7');
	return Array.from(grid?.children ?? []).map(c => c.textContent ?? '');
}

describe('DatePicker follows the date settings', () => {
	it('shows the day in English day-first by default, and the first calendar column is Monday', () => {
		render(<DatePicker value={JAN_15} onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('15 Jan 2024');
		fireEvent.focus(screen.getByRole('textbox'));
		expect(screen.getByRole('heading', { name: 'January 2024' })).toBeInTheDocument();
		expect(weekdayHeaders()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
	});

	it('starts the calendar where the settings say, and names the days in their language', () => {
		withDates({ weekStart: 'sunday' }, <DatePicker value={JAN_15} onChange={vi.fn()} />);
		fireEvent.focus(screen.getByRole('textbox'));
		expect(weekdayHeaders()[0]).toBe('Sun');
		expect(weekdayHeaders()[6]).toBe('Sat');
	});

	it('writes the month and weekdays in the language of the settings', () => {
		withDates({ locale: 'fr-FR' }, <DatePicker value={JAN_15} onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('15 janv. 2024');
		fireEvent.focus(screen.getByRole('textbox'));
		expect(screen.getByRole('heading', { name: 'janvier 2024' })).toBeInTheDocument();
		expect(weekdayHeaders()[0]).toBe('lun.');
	});

	it('writes the day with the iso preset', () => {
		withDates({ preset: 'iso' }, <DatePicker value={JAN_15} onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('2024-01-15');
	});

	// A picked day is a calendar day: the time zone of the settings must never move it to its neighbour.
	it.each(['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'America/New_York', 'Asia/Tokyo', 'UTC'])('keeps the day whatever the time zone of the settings (%s)', timeZone => {
		withDates({ timeZone }, <DatePicker value={JAN_15} onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('15 Jan 2024');
		fireEvent.focus(screen.getByRole('textbox'));
		expect(screen.getByRole('heading', { name: 'January 2024' })).toBeInTheDocument();
	});

	it('an explicit dateFormat still decides the text and the parsing', () => {
		const onChange = vi.fn();
		withDates({ locale: 'fr-FR' }, <DatePicker value={JAN_15} onChange={onChange} dateFormat="yyyy/MM/dd" />);
		const input = screen.getByRole('textbox');
		expect(input).toHaveValue('2024/01/15');
		fireEvent.change(input, { target: { value: '2024/02/03' } });
		expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 1, 3));
	});

	it('accepts typed ISO text and exactly the text the field shows, and nothing it has to guess', () => {
		const onChange = vi.fn();
		render(<DatePicker value={null} onChange={onChange} />);
		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: '2024-01-20' } });
		expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 0, 20));
		fireEvent.change(input, { target: { value: '21 Jan 2024' } });
		expect(onChange).toHaveBeenLastCalledWith(new Date(2024, 0, 21));
		onChange.mockClear();
		// not what the field writes, a day that does not exist, and day-month swapped into an impossible month
		for (const text of ['21 January 2024', '2024-02-31', 'next week', '13/13/2024']) {
			fireEvent.change(input, { target: { value: text } });
		}
		expect(onChange).not.toHaveBeenCalled();
	});

	it('clears the value when the text is emptied', () => {
		const onChange = vi.fn();
		render(<DatePicker value={JAN_15} onChange={onChange} />);
		fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
		expect(onChange).toHaveBeenLastCalledWith(null);
	});

	it('rewrites the text when the settings change', () => {
		const view = withDates({}, <DatePicker value={JAN_15} onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('15 Jan 2024');
		view.rerender(
			<DateFormatProvider formatter={settings({ preset: 'iso' })}>
				<DatePicker value={JAN_15} onChange={vi.fn()} />
			</DateFormatProvider>,
		);
		expect(screen.getByRole('textbox')).toHaveValue('2024-01-15');
	});
});

describe('DateRangePicker follows the date settings', () => {
	const RANGE = { from: new Date(2024, 0, 10), to: new Date(2024, 0, 20) };

	it('writes the range in English day-first by default, with Monday first and spelled-out day names', () => {
		render(<DateRangePicker value={RANGE} onChange={vi.fn()} open />);
		expect(screen.getByRole('button', { name: /10 Jan 2024 – 20 Jan 2024/ })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: '12 January 2024' }).length).toBeGreaterThan(0);
		expect(weekdayHeaders()).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
	});

	it('uses the language of the settings for the heading, the day names and the trigger', () => {
		withDates({ locale: 'fr-FR' }, <DateRangePicker value={RANGE} onChange={vi.fn()} open />);
		expect(screen.getByRole('button', { name: /10 janv\. 2024 – 20 janv\. 2024/ })).toBeInTheDocument();
		expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['janvier 2024', 'février 2024']);
		expect(screen.getAllByRole('button', { name: '12 janvier 2024' }).length).toBeGreaterThan(0);
	});

	// 2024-01-17 is a Wednesday.
	it.each([
		['monday', new Date(2024, 0, 15), new Date(2024, 0, 21)],
		['sunday', new Date(2024, 0, 14), new Date(2024, 0, 20)],
		['saturday', new Date(2024, 0, 13), new Date(2024, 0, 19)],
	] as const)('the "This Week" preset runs from the first day of the week (%s)', (weekStart, from, to) => {
		vi.useFakeTimers({ now: new Date(2024, 0, 17, 12, 0), toFake: ['Date'] });
		const onChange = vi.fn();
		withDates({ weekStart }, <DateRangePicker value={{ from: null, to: null }} onChange={onChange} open />);
		fireEvent.click(screen.getByText('This Week'));
		const range = onChange.mock.calls[0]![0] as { from: Date; to: Date };
		expect([range.from.getFullYear(), range.from.getMonth(), range.from.getDate()]).toEqual([from.getFullYear(), from.getMonth(), from.getDate()]);
		expect([range.to.getFullYear(), range.to.getMonth(), range.to.getDate()]).toEqual([to.getFullYear(), to.getMonth(), to.getDate()]);
	});

	it('an explicit dateFormat still decides the trigger text', () => {
		withDates({ locale: 'fr-FR' }, <DateRangePicker value={RANGE} onChange={vi.fn()} dateFormat="yyyy-MM-dd" />);
		expect(screen.getByRole('button', { name: /2024-01-10 – 2024-01-20/ })).toBeInTheDocument();
	});
});

describe('TimePicker follows the clock of the date settings', () => {
	it('is a 24h clock by default (English en-GB)', () => {
		render(<TimePicker value="14:30" onChange={vi.fn()} />);
		expect(screen.getByRole('button', { name: '14:30' })).toBeInTheDocument();
	});

	it('is a 12h clock when the settings write one, with the AM/PM toggle', () => {
		withDates({ locale: 'en-US' }, <TimePicker value="14:30" onChange={vi.fn()} open />);
		expect(screen.getByRole('button', { name: /02:30 PM/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /currently PM/i })).toBeInTheDocument();
	});

	it('an explicit is12Hour wins over the settings, both ways', () => {
		withDates({ locale: 'en-US' }, <TimePicker value="14:30" onChange={vi.fn()} is12Hour={false} />);
		expect(screen.getByRole('button', { name: '14:30' })).toBeInTheDocument();
		withDates({ hourCycle: '24h' }, <TimePicker value="09:15" onChange={vi.fn()} is12Hour />);
		expect(screen.getByRole('button', { name: '09:15 AM' })).toBeInTheDocument();
	});

	it('FieldDateTime forwards no clock of its own: its time half follows the settings too', () => {
		withDates({ hourCycle: '12h' }, <FieldDateTime label="Run at" value={new Date(2024, 0, 15, 14, 30)} onChange={vi.fn()} />);
		expect(screen.getByRole('textbox')).toHaveValue('15 Jan 2024');
		expect(screen.getByRole('button', { name: '02:30 PM' })).toBeInTheDocument();
	});
});

describe('buildCalendarGrid first day of the week', () => {
	const firstRow = (month: Date, first?: number) => buildCalendarGrid(month, first)[0]!.map(d => `${d.getMonth() + 1}/${d.getDate()}`);

	// January 2024 starts on a Monday.
	it('starts on Sunday by default and pads with the days before', () => {
		expect(firstRow(JAN_15)).toEqual(['12/31', '1/1', '1/2', '1/3', '1/4', '1/5', '1/6']);
	});

	it('starts on Monday with no padding when the month starts on a Monday', () => {
		expect(firstRow(JAN_15, 1)).toEqual(['1/1', '1/2', '1/3', '1/4', '1/5', '1/6', '1/7']);
	});

	it('starts on Saturday', () => {
		expect(firstRow(JAN_15, 6)).toEqual(['12/30', '12/31', '1/1', '1/2', '1/3', '1/4', '1/5']);
	});

	it.each([0, 1, 2, 3, 4, 5, 6])('every row has 7 days, the first column is always weekday %i, and the month is fully inside', first => {
		for (let month = 0; month < 12; month++) {
			const grid = buildCalendarGrid(new Date(2024, month, 1), first);
			for (const week of grid) {
				expect(week).toHaveLength(7);
				expect(week[0]!.getDay()).toBe(first);
			}
			const days = grid.flat();
			expect(days.filter(d => d.getMonth() === month)).toHaveLength(new Date(2024, month + 1, 0).getDate());
		}
	});
});

describe('calendarFormat', () => {
	// The same calendar day must read the same in a zone far east and far west of the machine's.
	it.each(['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Asia/Kolkata', 'America/St_Johns', 'UTC'])('noonOfDay reads noon of the same day in %s', timeZone => {
		const f = settings({ timeZone });
		const noon = noonOfDay(f, new Date(2024, 2, 9));
		expect(f.format(noon, 'short', 'date')).toBe('09/03/2024');
		expect(f.format(noon, 'short', 'time')).toBe('12:00');
	});

	it('writes a day, its long name, its number and its month title', () => {
		const f = settings({ locale: 'en-GB' });
		expect(formatDay(f, JAN_15)).toBe('15 Jan 2024');
		expect(formatDayLong(f, JAN_15)).toBe('15 January 2024');
		expect(formatDayNumber(f, JAN_15)).toBe('15');
		expect(formatMonthTitle(f, JAN_15)).toBe('January 2024');
		expect(formatDayLong(settings({ locale: 'en-US' }), JAN_15)).toBe('January 15, 2024');
	});

	it('parseDay reads what formatDay writes, in every language, and ISO', () => {
		for (const locale of ['en-GB', 'en-US', 'fr-FR', 'de-DE']) {
			const f = settings({ locale });
			expect(parseDay(f, formatDay(f, new Date(2024, 10, 5)))).toEqual(new Date(2024, 10, 5));
		}
		expect(parseDay(settings({}), ' 2024-11-05 ')).toEqual(new Date(2024, 10, 5));
	});

	it('parseDay refuses what is not exactly a day of the field', () => {
		const f = settings({});
		expect(parseDay(f, '2024-02-30')).toBeUndefined();
		expect(parseDay(f, '2024-13-01')).toBeUndefined();
		expect(parseDay(f, '5 November 2024')).toBeUndefined();
		expect(parseDay(f, '')).toBeUndefined();
	});
});
