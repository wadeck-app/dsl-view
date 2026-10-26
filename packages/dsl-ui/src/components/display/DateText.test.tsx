import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DateFormatProvider } from '@dsl-ui/dates/DateFormatContext.js';
import { DEFAULT_DATE_SETTINGS } from '@dsl-ui/dates/dateSettings.js';

import { DateText } from './DateText.js';

// 2026-10-24 16:38:05.123 UTC: 18:38 in Paris (CEST), 01:38 the next day in Tokyo.
const INSTANT = '2026-10-24T16:38:05.123Z';
const withDates = (change: Partial<typeof DEFAULT_DATE_SETTINGS>, ui: React.ReactElement) =>
	render(<DateFormatProvider formatter={createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC', ...change })}>{ui}</DateFormatProvider>);

describe('DateText', () => {
	it('writes a medium date and time by default, in English en-GB, as plain text in a <time> element', () => {
		withDates({}, <DateText value={INSTANT} />);
		const time = screen.getByText('24 Oct 2026, 16:38:05');
		expect(time.tagName).toBe('TIME');
		expect(time).toHaveAttribute('dateTime', INSTANT);
		// text only: nothing of its own to decide the look
		expect(time.getAttribute('class')).toBeNull();
	});

	it('has the exact timestamp, with offset and zone, as its tooltip', () => {
		withDates({ timeZone: 'Europe/Paris' }, <DateText value={INSTANT} />);
		expect(screen.getByText('24 Oct 2026, 18:38:05')).toHaveAttribute('title', '2026-10-24T18:38:05.123+02:00 (Europe/Paris)');
	});

	it.each([
		['short', 'datetime', '24/10/2026, 16:38'],
		['medium', 'datetime', '24 Oct 2026, 16:38:05'],
		['long', 'date', 'Saturday, 24 October 2026'],
		['short', 'date', '24/10/2026'],
		['medium', 'time', '16:38:05'],
		['short', 'time', '16:38'],
	] as const)('dateStyle %s with part %s reads "%s"', (dateStyle, part, expected) => {
		withDates({}, <DateText value={INSTANT} dateStyle={dateStyle} part={part} />);
		expect(screen.getByText(expected).tagName).toBe('TIME');
	});

	it('shows how long ago or ahead with relative, keeping the exact timestamp as the tooltip', () => {
		const now = Date.now();
		withDates({}, <DateText value={now - 5 * 60_000} relative />);
		const time = screen.getByText('5 minutes ago');
		expect(time.getAttribute('title')).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z \(UTC\)$/);
	});

	it('follows the language, clock and time zone of the provider', () => {
		withDates({ locale: 'fr-FR', timeZone: 'Asia/Tokyo' }, <DateText value={INSTANT} dateStyle="short" />);
		expect(screen.getByText(/^25\/10\/2026,? 01:38$/)).toBeInTheDocument();
		withDates({ locale: 'en-US', hourCycle: '12h' }, <DateText value={INSTANT} dateStyle="short" part="time" />);
		expect(screen.getByText(/^04:38\sPM$/)).toBeInTheDocument();
	});

	it('accepts a Date and epoch milliseconds like ISO text', () => {
		withDates(
			{},
			<>
				<DateText value={new Date(INSTANT)} part="time" />
				<DateText value={Date.parse(INSTANT)} part="time" />
				<DateText value={INSTANT} part="time" />
			</>,
		);
		expect(screen.getAllByText('16:38:05')).toHaveLength(3);
	});

	it('shows text that is not a date as it came, with no tooltip and no <time>, and the formatter warns once', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = withDates(
			{},
			<>
				<DateText value="next tuesday-ish" />
				<DateText value="next tuesday-ish" />
			</>,
		);
		expect(screen.getAllByText('next tuesday-ish')).toHaveLength(2);
		expect(container.querySelector('time')).toBeNull();
		expect(container.querySelector('[title]')).toBeNull();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"next tuesday-ish" is not a date'));
	});

	it.each([[undefined], [null], ['']])('renders nothing for the empty value %j, quietly', value => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { container } = withDates({}, <DateText value={value as unknown as string} />);
		expect(container.innerHTML).toBe('');
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	});

	it('treats 0 as the epoch, not as an empty value', () => {
		withDates({}, <DateText value={0} dateStyle="short" part="date" />);
		expect(screen.getByText('01/01/1970')).toBeInTheDocument();
	});

	it.each([[{}], [[]], [true]])('renders nothing for a value of the wrong type %j and says what was expected', value => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { container } = withDates({}, <DateText value={value as unknown as string} />);
		expect(container.innerHTML).toBe('');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('[DateText] value must be a Date, epoch milliseconds or an ISO 8601 text'));
	});

	it('names the allowed values for an unknown dateStyle or part and falls back to the defaults', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		withDates({}, <DateText value={INSTANT} dateStyle={'tiny' as 'short'} part={'hour' as 'time'} />);
		expect(screen.getByText('24 Oct 2026, 16:38:05')).toBeInTheDocument();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown dateStyle "tiny": using "medium" instead. Allowed values: short, medium, long.'));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown part "hour": using "datetime" instead. Allowed values: datetime, date, time.'));
	});
});
