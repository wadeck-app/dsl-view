import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RelativeDate } from './RelativeDate.js';

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
		render(<RelativeDate date={ago(10 * SECOND)} tooltip={false} />);
		// <time> role is 'time' in some browsers; query by tag
		// eslint-disable-next-line testing-library/no-container
		const { container } = render(<RelativeDate date={ago(10 * SECOND)} tooltip={false} />);
		expect(container.querySelector('time')).not.toBeNull();
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
