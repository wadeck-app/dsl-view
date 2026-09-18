import { describe, expect, it } from 'vitest';
import { buildCron, parseCronToSpec, CRON_SPEC_DEFAULTS, type CronSpec } from './cron-spec.js';

function spec(over: Partial<CronSpec> = {}): CronSpec {
	return { ...CRON_SPEC_DEFAULTS, ...over };
}

describe('buildCron', () => {
	it.each([
		['minutely',  '* * * * *'],
		['hourly',    '30 * * * *'],
		['daily',     '30 9 * * *'],
		['weekdays',  '30 9 * * 1-5'],
		['monthly',   '30 9 15 * *'],
	] as const)('builds %s as %s', (freq, expected) => {
		expect(buildCron(spec({ freq, hours: [9], minute: 30, dayOfMonth: 15 }))).toBe(expected);
	});

	it('builds an every-N-minutes step', () => {
		expect(buildCron(spec({ freq: 'every-n-min', everyNMinutes: 5 }))).toBe('*/5 * * * *');
	});

	it('maps ticked weekdays onto 1-based cron day numbers', () => {
		const monWedFri = [true, false, true, false, true, false, false];
		expect(buildCron(spec({ freq: 'weekly', hours: [9], minute: 30, weekdays: monWedFri }))).toBe('30 9 * * 1,3,5');
	});

	it('falls back to Monday when no day is ticked', () => {
		expect(buildCron(spec({ freq: 'weekly', hours: [9], minute: 30, weekdays: Array(7).fill(false) })))
			.toBe('30 9 * * 1');
	});
});

/*
 * The reported gap: the jobs in the wild fire more than once a day - `10 10,19 * * *` is a scraper
 * that runs morning and evening - and the wizard could only ever describe one hour.
 */
describe('buildCron with several firing hours', () => {
	it('emits a comma list, so a twice-daily schedule survives', () => {
		expect(buildCron(spec({ freq: 'daily', hours: [10, 19], minute: 10 }))).toBe('10 10,19 * * *');
	});

	it('sorts the hours, so the field does not depend on click order', () => {
		expect(buildCron(spec({ freq: 'daily', hours: [19, 8, 12], minute: 0 }))).toBe('0 8,12,19 * * *');
	});

	it('de-duplicates', () => {
		expect(buildCron(spec({ freq: 'daily', hours: [9, 9, 9], minute: 0 }))).toBe('0 9 * * *');
	});

	it('drops out-of-range hours rather than emitting an invalid field', () => {
		expect(buildCron(spec({ freq: 'daily', hours: [9, 24, -1], minute: 0 }))).toBe('0 9 * * *');
	});

	// An empty hour field is not a valid expression, and a live preview must never show one.
	it('never emits an empty hour field', () => {
		expect(buildCron(spec({ freq: 'daily', hours: [], minute: 0 }))).toBe('0 0 * * *');
	});

	it('carries the hours into weekly and monthly too', () => {
		expect(buildCron(spec({ freq: 'weekly', hours: [6, 18], minute: 15, weekdays: [true, false, false, false, false, false, false] })))
			.toBe('15 6,18 * * 1');
		expect(buildCron(spec({ freq: 'monthly', hours: [6, 18], minute: 15, dayOfMonth: 3 })))
			.toBe('15 6,18 3 * *');
		expect(buildCron(spec({ freq: 'weekdays', hours: [6, 18], minute: 15 })))
			.toBe('15 6,18 * * 1-5');
	});
});

/*
 * `value` was a declared prop that was never read, so the wizard always opened on its defaults.
 * Opening it on an existing twice-daily schedule and pressing Apply replaced that schedule with a
 * once-daily one - a silent edit of something the user had not touched.
 */
describe('parseCronToSpec', () => {
	it('reads back every shape buildCron can emit', () => {
		const cases: CronSpec[] = [
			spec({ freq: 'minutely' }),
			spec({ freq: 'every-n-min', everyNMinutes: 5 }),
			spec({ freq: 'hourly', minute: 30 }),
			spec({ freq: 'daily', hours: [9], minute: 30 }),
			spec({ freq: 'daily', hours: [10, 19], minute: 10 }),
			spec({ freq: 'weekdays', hours: [9], minute: 0 }),
			spec({ freq: 'monthly', hours: [9], minute: 0, dayOfMonth: 15 }),
		];
		for (const original of cases) {
			const roundTripped = parseCronToSpec(buildCron(original));
			expect(roundTripped, buildCron(original)).not.toBeNull();
			expect(buildCron(roundTripped!)).toBe(buildCron(original));
		}
	});

	it('recovers several hours, which is the case that was being destroyed', () => {
		const parsed = parseCronToSpec('10 10,19 * * *');
		expect(parsed).not.toBeNull();
		expect(parsed!.freq).toBe('daily');
		expect(parsed!.hours).toEqual([10, 19]);
		expect(parsed!.minute).toBe(10);
	});

	it('recovers ticked weekdays', () => {
		const parsed = parseCronToSpec('30 9 * * 1,3,5');
		expect(parsed!.freq).toBe('weekly');
		expect(parsed!.weekdays).toEqual([true, false, true, false, true, false, false]);
	});

	// Cron accepts both 0 and 7 for Sunday; the wizard's array is Monday-first.
	it('accepts either spelling of Sunday', () => {
		expect(parseCronToSpec('0 9 * * 7')!.weekdays[6]).toBe(true);
		expect(parseCronToSpec('0 9 * * 0')!.weekdays[6]).toBe(true);
	});

	it('prefers the weekdays frequency for the 1-5 range', () => {
		expect(parseCronToSpec('0 9 * * 1-5')!.freq).toBe('weekdays');
	});

	// Null rather than an approximation: the wizard covers a subset of cron on purpose, and a spec
	// that merely resembles the expression would rewrite the schedule on Apply.
	it.each([
		['0 9 * * * 2026'],   // six fields
		['0 9 1 6 *'],        // a specific month
		['0 */2 * * *'],      // stepped hours
		['15-45 * * * *'],    // a minute range
		['0 9 29 * *'],       // day 29, outside the wizard's 1-28
		['0 25 * * *'],       // hour out of range
		['not a cron'],
		[''],
	])('returns null for %s rather than guessing', expr => {
		expect(parseCronToSpec(expr)).toBeNull();
	});

	it('returns null for a missing expression', () => {
		expect(parseCronToSpec(undefined)).toBeNull();
		expect(parseCronToSpec(null)).toBeNull();
	});
});
