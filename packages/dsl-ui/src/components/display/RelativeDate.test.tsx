import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRelativeLabel, RelativeDate } from './RelativeDate.js';

// Fixed reference point: 2026-09-12T12:00:00.000Z
const fixedDate = new Date('2026-09-12T12:00:00.000Z');

beforeEach(() => {
	vi.useFakeTimers({ now: fixedDate });
});

afterEach(() => {
	vi.useRealTimers();
});

function ago(ms: number): Date {
	return new Date(fixedDate.getTime() - ms);
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('RelativeDate', () => {
	it('shows "just now" for a date 10 seconds ago', () => {
		render(<RelativeDate date={ago(10 * SECOND)} tooltip={false} />);
		expect(screen.getByText('just now')).toBeInTheDocument();
	});

	it('shows "1 minute ago" for 90 seconds ago', () => {
		render(<RelativeDate date={ago(90 * SECOND)} tooltip={false} />);
		expect(screen.getByText('1 minute ago')).toBeInTheDocument();
	});

	it('shows "5 minutes ago" for 5 minutes ago', () => {
		render(<RelativeDate date={ago(5 * MINUTE)} tooltip={false} />);
		expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
	});

	it('shows "2 hours ago" for 2 hours ago', () => {
		render(<RelativeDate date={ago(2 * HOUR)} tooltip={false} />);
		expect(screen.getByText('2 hours ago')).toBeInTheDocument();
	});

	it('shows "yesterday" for 36 hours ago', () => {
		render(<RelativeDate date={ago(36 * HOUR)} tooltip={false} />);
		expect(screen.getByText('yesterday')).toBeInTheDocument();
	});

	it('shows "3 days ago" for 3 days ago', () => {
		render(<RelativeDate date={ago(3 * DAY)} tooltip={false} />);
		expect(screen.getByText('3 days ago')).toBeInTheDocument();
	});

	it('renders a <time> element', () => {
		// <time> role is 'time' in some browsers; query by tag
		// eslint-disable-next-line testing-library/no-container
		const { container } = render(<RelativeDate date={ago(10 * SECOND)} tooltip={false} />);
		expect(container.querySelector('time')).not.toBeNull();
	});

	// Every bucket edge, both sides: an off-by-one in a comparison moves the label by a whole unit.
	it.each([
		[-1 * SECOND, 'in the future'],
		[0, 'just now'],
		[59 * SECOND, 'just now'],
		[60 * SECOND, '1 minute ago'],
		[119 * SECOND, '1 minute ago'],
		[120 * SECOND, '2 minutes ago'],
		[59 * MINUTE, '59 minutes ago'],
		[60 * MINUTE, '1 hour ago'],
		[2 * HOUR, '2 hours ago'],
		[23 * HOUR + 59 * MINUTE, '23 hours ago'],
		[24 * HOUR, 'yesterday'],
		[47 * HOUR, 'yesterday'],
		[48 * HOUR, '2 days ago'],
		[6 * DAY, '6 days ago'],
		[7 * DAY, 'last week'],
		[13 * DAY, 'last week'],
		[14 * DAY, '2 weeks ago'],
		[29 * DAY, '4 weeks ago'],
		[30 * DAY, 'last month'],
		[59 * DAY, 'last month'],
		[60 * DAY, '2 months ago'],
		[364 * DAY, '12 months ago'],
		[365 * DAY, 'last year'],
		[729 * DAY, 'last year'],
		[730 * DAY, '2 years ago'],
		[1000 * DAY, '2 years ago'],
	])('labels a date %i ms in the past as "%s"', (ms, expected) => {
		expect(getRelativeLabel(ago(ms))).toBe(expected);
	});

	it('uses the singular for exactly one minute and one hour, the plural otherwise', () => {
		expect(getRelativeLabel(ago(MINUTE))).toBe('1 minute ago');
		expect(getRelativeLabel(ago(2 * MINUTE))).toBe('2 minutes ago');
		expect(getRelativeLabel(ago(HOUR))).toBe('1 hour ago');
		expect(getRelativeLabel(ago(2 * HOUR))).toBe('2 hours ago');
	});

	it('live: the label moves on with the clock every 60 s, and stops ticking after unmount', () => {
		const view = render(<RelativeDate date={ago(59 * SECOND)} tooltip={false} />);
		expect(screen.getByText('just now')).toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(60 * SECOND);
		});
		expect(screen.getByText('1 minute ago')).toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(60 * SECOND);
		});
		expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
		view.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('live=false keeps the label it was rendered with, whatever the clock does', () => {
		render(<RelativeDate date={ago(59 * SECOND)} tooltip={false} live={false} />);
		act(() => {
			vi.advanceTimersByTime(10 * MINUTE);
		});
		expect(screen.getByText('just now')).toBeInTheDocument();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('follows a new date prop immediately', () => {
		const view = render(<RelativeDate date={ago(10 * SECOND)} tooltip={false} />);
		expect(screen.getByText('just now')).toBeInTheDocument();
		view.rerender(<RelativeDate date={ago(3 * HOUR)} tooltip={false} />);
		expect(screen.getByText('3 hours ago')).toBeInTheDocument();
	});

	it('does not restart its timer when re-rendered with an equal date (new Date object, same instant)', () => {
		const view = render(<RelativeDate date={new Date(ago(MINUTE).getTime())} tooltip={false} />);
		const timers = vi.getTimerCount();
		view.rerender(<RelativeDate date={new Date(ago(MINUTE).getTime())} tooltip={false} />);
		expect(vi.getTimerCount()).toBe(timers);
	});

	it('shows an invalid date as it came, with a console warning, instead of crashing the page', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = render(<RelativeDate date="soon-ish" />);
		expect(screen.getByText('soon-ish')).toBeInTheDocument();
		expect(container.querySelector('time')).toBeNull();
		expect(screen.queryByRole('tooltip')).toBeNull();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"soon-ish" is not a valid date'));
		warn.mockRestore();
	});

	it('puts the absolute date in the tooltip with the given date-fns format, in local time', () => {
		const local = new Date(2026, 0, 5, 14, 5);
		vi.setSystemTime(new Date(2026, 0, 5, 14, 10));
		render(<RelativeDate date={local} format="yyyy-MM-dd HH:mm" />);
		expect(screen.getByRole('tooltip')).toHaveTextContent('2026-01-05 14:05');
	});

	it('appends a custom className to the base text classes', () => {
		const { container } = render(<RelativeDate date={ago(10 * SECOND)} tooltip={false} className="text-xs" />);
		expect(container.querySelector('time')).toHaveClass('text-content', 'text-sm', 'text-xs');
	});

	it('<time> element has correct dateTime attribute', () => {
		const date = ago(5 * MINUTE);
		const { container } = render(<RelativeDate date={date} tooltip={false} />);
		const timeEl = container.querySelector('time');
		expect(timeEl).not.toBeNull();
		expect(timeEl!.getAttribute('dateTime')).toBe(date.toISOString());
	});

	it('accepts a string (ISO) date input and renders without crashing', () => {
		const isoString = fixedDate.toISOString();
		render(<RelativeDate date={isoString} tooltip={false} />);
		expect(screen.getAllByText('just now')[0]).toBeInTheDocument();
	});

	it('accepts a number (timestamp) input and renders without crashing', () => {
		render(<RelativeDate date={fixedDate.getTime()} tooltip={false} />);
		expect(screen.getAllByText('just now')[0]).toBeInTheDocument();
	});

	it('live=false does NOT call setInterval', () => {
		const spy = vi.spyOn(globalThis, 'setInterval');
		render(<RelativeDate date={ago(5 * MINUTE)} tooltip={false} live={false} />);
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it('live=true DOES call setInterval', () => {
		const spy = vi.spyOn(globalThis, 'setInterval');
		render(<RelativeDate date={ago(5 * MINUTE)} tooltip={false} live={true} />);
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});

	it('shows tooltip content (absolute date) when tooltip=true', () => {
		render(<RelativeDate date={ago(5 * MINUTE)} tooltip={true} />);
		// Tooltip renders a role="tooltip" span
		expect(screen.getByRole('tooltip')).toBeInTheDocument();
	});

	it('does not render a tooltip when tooltip=false', () => {
		render(<RelativeDate date={ago(5 * MINUTE)} tooltip={false} />);
		expect(screen.queryByRole('tooltip')).toBeNull();
	});
});
