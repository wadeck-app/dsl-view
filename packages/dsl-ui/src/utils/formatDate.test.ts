import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DEFAULT_DATE_SETTINGS } from '@dsl-ui/dates/dateSettings.js';

import { formatDateTime } from './formatDate.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('formatDateTime', () => {
	// The ISO instant is built from local-time parts, so the rendered local date and time are the same in any timezone.
	it('formats an instant as a short English day-first date and 24h time in the local timezone', () => {
		const iso = new Date(2024, 0, 5, 14, 7).toISOString();

		expect(formatDateTime(iso)).toBe('05/01/2024, 14:07');
	});

	it('uses 00:00 for midnight and 12:00 for noon', () => {
		expect(formatDateTime(new Date(2024, 5, 1, 0, 0).toISOString())).toBe('01/06/2024, 00:00');
		expect(formatDateTime(new Date(2024, 5, 1, 12, 0).toISOString())).toBe('01/06/2024, 12:00');
	});

	it('writes through the formatter it is given: language, clock and time zone', () => {
		const iso = '2024-01-05T14:07:00Z';
		expect(formatDateTime(iso, createDateFormatter({ ...DEFAULT_DATE_SETTINGS, locale: 'en-US', timeZone: 'UTC' }))).toBe('01/05/2024, 02:07 PM');
		expect(formatDateTime(iso, createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'Asia/Tokyo' }))).toBe('05/01/2024, 23:07');
	});

	it('shows text that is not a date as it came, with a warning, instead of crashing the page', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		expect(formatDateTime('not a date')).toBe('not a date');
		expect(formatDateTime('')).toBe('');

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"not a date"'));
	});
});
