import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatDateTime } from './formatDate.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('formatDateTime', () => {
	// The ISO instant is built from local-time parts, so the rendered local date and time are the same in any timezone.
	it('formats an instant as a short US date and time in the local timezone', () => {
		const iso = new Date(2024, 0, 5, 14, 7).toISOString();

		expect(formatDateTime(iso)).toMatch(/^1\/5\/24, 2:07\sPM$/);
	});

	it('uses 12 AM for midnight and 12 PM for noon', () => {
		expect(formatDateTime(new Date(2024, 5, 1, 0, 0).toISOString())).toMatch(/^6\/1\/24, 12:00\sAM$/);
		expect(formatDateTime(new Date(2024, 5, 1, 12, 0).toISOString())).toMatch(/^6\/1\/24, 12:00\sPM$/);
	});

	it('shows text that is not a date as it came, with a warning, instead of crashing the page', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		expect(formatDateTime('not a date')).toBe('not a date');
		expect(formatDateTime('')).toBe('');

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"not a date"'));
	});
});
