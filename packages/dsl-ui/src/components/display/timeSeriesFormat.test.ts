import { describe, expect, it, vi } from 'vitest';

import { createDateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DEFAULT_DATE_SETTINGS } from '@dsl-ui/dates/dateSettings.js';
import type { DateSettings } from '@dsl-ui/dates/dateSettings.js';

import { formatBrushDate, formatXHeading, xTickLabels } from './timeSeriesFormat.js';
import { DAY_MS } from './timeSeriesMath.js';

// UTC everywhere: the expectations must not depend on the zone of the machine running the tests.
const formatterOf = (overrides: Partial<DateSettings> = {}) => createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC', ...overrides });
const at = (day: number, hour = 0, minute = 0) => Date.UTC(2026, 0, day, hour, minute);
const labelsOf = (formatter: ReturnType<typeof formatterOf>, ticks: number[], xFormat: 'date' | 'time' | 'datetime', span: number) => ticks.map(t => xTickLabels(formatter, ticks, xFormat, span).get(t));

describe('xTickLabels: date', () => {
	it('writes "5 Jan" in the language of the settings, without a year under 300 days', () => {
		expect(labelsOf(formatterOf(), [at(5), at(12)], 'date', 10 * DAY_MS)).toStrictEqual(['5 Jan', '12 Jan']);
		expect(labelsOf(formatterOf({ locale: 'fr-FR' }), [at(5)], 'date', 10 * DAY_MS)).toStrictEqual(['5 janv.']);
	});

	it('adds a two-digit year from 300 days, not at 300 days exactly', () => {
		expect(labelsOf(formatterOf(), [at(5)], 'date', 300 * DAY_MS)).toStrictEqual(['5 Jan']);
		expect(labelsOf(formatterOf(), [at(5)], 'date', 300 * DAY_MS + 1)[0]).toMatch(/^5 Jan,? 26$/);
	});

	it('follows the time zone of the settings (a tick near midnight UTC is the next day in Paris)', () => {
		const tick = at(5, 23, 30);
		expect(labelsOf(formatterOf({ timeZone: 'UTC' }), [tick], 'date', DAY_MS)).toStrictEqual(['5 Jan']);
		expect(labelsOf(formatterOf({ timeZone: 'Europe/Paris' }), [tick], 'date', DAY_MS)).toStrictEqual(['6 Jan']);
	});
});

describe('xTickLabels: datetime', () => {
	it('writes the date and the time on every tick', () => {
		expect(labelsOf(formatterOf(), [at(5, 14, 30), at(5, 15, 30)], 'datetime', 2 * 3_600_000)).toStrictEqual(['5 Jan, 14:30', '5 Jan, 15:30']);
	});

	it('never adds the year, whatever the span', () => {
		expect(labelsOf(formatterOf(), [at(5, 14, 30)], 'datetime', 900 * DAY_MS)).toStrictEqual(['5 Jan, 14:30']);
	});
});

describe('xTickLabels: time (the date-less format over several days)', () => {
	it('is time of day only for the ticks of one day after the first', () => {
		const labels = labelsOf(formatterOf(), [at(5, 0), at(5, 6), at(5, 12), at(5, 18)], 'time', DAY_MS);
		expect(labels.slice(1)).toStrictEqual(['06:00', '12:00', '18:00']);
	});

	it('carries the date on the first tick, so a one-day axis says which day', () => {
		expect(labelsOf(formatterOf(), [at(5, 6), at(5, 12)], 'time', DAY_MS)).toStrictEqual(['5 Jan, 06:00', '12:00']);
	});

	it('carries the date again on the first tick of each new day (ticks 12h apart over 3 days)', () => {
		const ticks = [at(5, 12), at(6, 0), at(6, 12), at(7, 0), at(7, 12)];
		expect(labelsOf(formatterOf(), ticks, 'time', 3 * DAY_MS)).toStrictEqual(['5 Jan, 12:00', '6 Jan, 00:00', '12:00', '7 Jan, 00:00', '12:00']);
	});

	it('decides the day in the time zone of the settings, not in UTC', () => {
		// 22:30 and 23:30 UTC are 23:30 and 00:30 in Paris (UTC+1 in January): the second tick starts a new day there.
		const ticks = [at(5, 22, 30), at(5, 23, 30)];
		expect(labelsOf(formatterOf({ timeZone: 'UTC' }), ticks, 'time', DAY_MS)).toStrictEqual(['5 Jan, 22:30', '23:30']);
		expect(labelsOf(formatterOf({ timeZone: 'Europe/Paris' }), ticks, 'time', DAY_MS)).toStrictEqual(['5 Jan, 23:30', '6 Jan, 00:30']);
	});

	it('gives every tick of a list its own label, and an empty list none', () => {
		expect(xTickLabels(formatterOf(), [], 'time', DAY_MS).size).toBe(0);
		expect(xTickLabels(formatterOf(), [at(5, 1), at(5, 2), at(5, 3)], 'time', DAY_MS).size).toBe(3);
	});
});

describe('the clock of the date settings decides 24h or 12h (the component never sets it)', () => {
	const ticks = [at(5, 14, 30), at(5, 15, 30)];
	// The first tick of a `time` axis carries the date; the second shows the clock alone.
	const secondOf = (formatter: ReturnType<typeof formatterOf>) => labelsOf(formatter, ticks, 'time', DAY_MS)[1];

	it('default settings (en-GB, auto): 24h', () => {
		expect(secondOf(formatterOf())).toBe('15:30');
	});

	it('en-US with an automatic clock: 12h with a day period', () => {
		expect(secondOf(formatterOf({ locale: 'en-US' }))).toMatch(/^0?3:30\s?PM$/i);
	});

	it('hourCycle 24h forces 24h even for en-US', () => {
		expect(secondOf(formatterOf({ locale: 'en-US', hourCycle: '24h' }))).toBe('15:30');
	});

	it('hourCycle 12h forces 12h even for en-GB', () => {
		expect(secondOf(formatterOf({ hourCycle: '12h' }))).toMatch(/^0?3:30\s?pm$/i);
	});

	it('the iso preset is a 24h clock whatever the locale', () => {
		expect(secondOf(formatterOf({ locale: 'en-US', preset: 'iso' }))).toBe('15:30');
	});
});

describe('values outside what Intl can print', () => {
	it('a tick beyond +-8.64e15 ms or not finite is shown as the raw number, never throws', () => {
		const formatter = formatterOf();
		for (const bad of [8.64e15 + 1, -8.64e15 - 1, Infinity, NaN]) {
			for (const xFormat of ['date', 'time', 'datetime'] as const) {
				expect(xTickLabels(formatter, [bad], xFormat, DAY_MS).get(bad)).toBe(String(bad));
			}
			expect(formatXHeading(formatter, bad, 'datetime')).toBe(String(bad));
			expect(formatBrushDate(formatter, bad)).toBe(String(bad));
		}
	});

	it('the limits themselves are still dates', () => {
		expect(formatBrushDate(formatterOf(), 8.64e15)).not.toBe(String(8.64e15));
	});
});

describe('formatXHeading and formatBrushDate', () => {
	it('date: weekday and date without a time of day', () => {
		const heading = formatXHeading(formatterOf(), at(5, 14, 30), 'date');
		expect(heading).toMatch(/Mon/);
		expect(heading).toMatch(/5 Jan 2026/);
		expect(heading).not.toMatch(/14:30/);
	});

	it('time and datetime: the same plus the clock of the settings', () => {
		for (const xFormat of ['time', 'datetime'] as const) {
			expect(formatXHeading(formatterOf(), at(5, 14, 30), xFormat)).toMatch(/5 Jan 2026.*14:30$/);
		}
		expect(formatXHeading(formatterOf({ locale: 'en-US' }), at(5, 14, 30), 'time')).toMatch(/0?2:30\s?PM$/i);
	});

	it('the brush date has the year', () => {
		expect(formatBrushDate(formatterOf(), at(5))).toBe('5 Jan 2026');
	});
});

describe('no side effect', () => {
	it('formatting does not log (a tick is drawn on every render)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		xTickLabels(formatterOf(), [at(5), NaN, Infinity], 'time', DAY_MS);
		formatXHeading(formatterOf(), NaN, 'date');
		expect(warn).not.toHaveBeenCalled();
	});
});
