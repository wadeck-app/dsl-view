import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDateFormatter } from './dateFormatter.js';
import { DEFAULT_DATE_SETTINGS, type DateSettings } from './dateSettings.js';

// 2026-10-24 16:38:05.123 UTC: 18:38 in Paris (CEST, +02:00), a Saturday.
const INSTANT = Date.UTC(2026, 9, 24, 16, 38, 5, 123);
const formatter = (change: Partial<DateSettings> = {}) => createDateFormatter({ ...DEFAULT_DATE_SETTINGS, timeZone: 'UTC', ...change });

afterEach(() => {
	vi.restoreAllMocks();
});

describe('createDateFormatter: the three styles of the locale preset', () => {
	it('formats short, medium and long in the language and the time zone of the settings', () => {
		const f = formatter({ locale: 'en-GB' });
		expect(f.format(INSTANT, 'short')).toBe('24/10/2026, 16:38');
		expect(f.format(INSTANT, 'medium')).toBe('24 Oct 2026, 16:38:05');
		expect(f.format(INSTANT, 'long')).toMatch(/^Saturday,? 24 October 2026 at 16:38:05 UTC$/);
		expect(f.format(INSTANT)).toBe(f.format(INSTANT, 'medium'));
	});

	it('moves the same instant with the time zone', () => {
		expect(formatter({ timeZone: 'Europe/Paris' }).format(INSTANT, 'short')).toBe('24/10/2026, 18:38');
		expect(formatter({ timeZone: 'Asia/Tokyo' }).format(INSTANT, 'short')).toBe('25/10/2026, 01:38');
	});

	it('takes the conventions of the language, never those of the browser', () => {
		expect(formatter({ locale: 'en-US' }).format(INSTANT, 'short')).toBe('10/24/2026, 04:38 PM');
		expect(formatter({ locale: 'fr-FR' }).format(INSTANT, 'medium')).toBe('24 oct. 2026, 16:38:05');
	});

	it('shows only the date, or only the time', () => {
		const f = formatter({ locale: 'en-GB' });
		expect(f.format(INSTANT, 'short', 'date')).toBe('24/10/2026');
		expect(f.format(INSTANT, 'medium', 'date')).toBe('24 Oct 2026');
		expect(f.format(INSTANT, 'short', 'time')).toBe('16:38');
		expect(f.format(INSTANT, 'medium', 'time')).toBe('16:38:05');
	});

	it('forces a 12h or a 24h clock whatever the language does', () => {
		expect(formatter({ locale: 'en-GB', hourCycle: '12h' }).format(INSTANT, 'short', 'time')).toMatch(/^04:38\s?pm$/i);
		expect(formatter({ locale: 'en-US', hourCycle: '24h' }).format(INSTANT, 'short', 'time')).toBe('16:38');
	});
});

describe('createDateFormatter: the iso preset', () => {
	it('writes sortable text in the chosen zone, always on a 24h clock', () => {
		const f = formatter({ preset: 'iso', timeZone: 'Europe/Paris', hourCycle: '12h' });
		expect(f.format(INSTANT, 'short')).toBe('2026-10-24 18:38');
		expect(f.format(INSTANT, 'medium')).toBe('2026-10-24 18:38:05');
		expect(f.format(INSTANT, 'long')).toBe('2026-10-24 18:38:05+02:00');
		expect(f.format(INSTANT, 'long', 'date')).toBe('2026-10-24');
		expect(f.format(INSTANT, 'medium', 'time')).toBe('18:38:05');
	});

	it('writes Z for UTC', () => {
		expect(formatter({ preset: 'iso' }).format(INSTANT, 'long')).toBe('2026-10-24 16:38:05Z');
	});
});

describe('createDateFormatter: exact (the tooltip)', () => {
	it('gives the instant to the millisecond with its offset and its zone, whatever the preset', () => {
		expect(formatter({ timeZone: 'Europe/Paris' }).exact(INSTANT)).toBe('2026-10-24T18:38:05.123+02:00 (Europe/Paris)');
		expect(formatter({ locale: 'fr-FR', preset: 'iso' }).exact(INSTANT)).toBe('2026-10-24T16:38:05.123Z (UTC)');
	});

	it('accepts a Date and ISO text', () => {
		const f = formatter({ timeZone: 'Europe/Paris' });
		expect(f.exact(new Date(INSTANT))).toBe(f.exact('2026-10-24T16:38:05.123Z'));
	});
});

describe('createDateFormatter: relative', () => {
	const f = formatter({ locale: 'en-GB' });
	it('says now, minutes, hours, days, months and years, in the past and in the future', () => {
		expect(f.relative(INSTANT + 10_000, INSTANT)).toBe('now');
		expect(f.relative(INSTANT - 5 * 60_000, INSTANT)).toBe('5 minutes ago');
		expect(f.relative(INSTANT + 2 * 3600_000, INSTANT)).toBe('in 2 hours');
		expect(f.relative(INSTANT - 24 * 3600_000, INSTANT)).toBe('yesterday');
		expect(f.relative(INSTANT - 3 * 86400_000, INSTANT)).toBe('3 days ago');
		expect(f.relative(INSTANT - 90 * 86400_000, INSTANT)).toBe('3 months ago');
		expect(f.relative(INSTANT - 800 * 86400_000, INSTANT)).toBe('2 years ago');
	});

	it('follows the language of the settings', () => {
		expect(formatter({ locale: 'fr-FR' }).relative(INSTANT - 5 * 60_000, INSTANT)).toBe('il y a 5 minutes');
	});
});

describe('createDateFormatter: weekday and month names', () => {
	it('starts the week where the settings say, in the language of the settings', () => {
		expect(formatter({ locale: 'fr-FR', weekStart: 'monday' }).weekdays('narrow')).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
		expect(formatter({ locale: 'en-GB', weekStart: 'sunday' }).weekdays('narrow')).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
		expect(formatter({ locale: 'en-GB', weekStart: 'saturday' }).weekdays('short')).toEqual(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
	});

	it('follows the language for the first day when the setting is auto', () => {
		expect(formatter({ locale: 'en-US', weekStart: 'auto' }).firstDayOfWeek).toBe(0);
		expect(formatter({ locale: 'fr-FR', weekStart: 'auto' }).firstDayOfWeek).toBe(1);
	});

	it('uses the weekday style of the settings by default', () => {
		expect(formatter({ locale: 'en-GB', weekStart: 'monday', weekdayStyle: 'long' }).weekdays()[0]).toBe('Monday');
	});

	it('lists the twelve months from January', () => {
		const names = formatter({ locale: 'en-GB' }).months('short');
		expect(names).toHaveLength(12);
		expect([names[0], names[11]]).toEqual(['Jan', 'Dec']);
		expect(formatter({ locale: 'fr-FR' }).months('long')[1]).toBe('février');
	});
});

describe('createDateFormatter: intl, for charts', () => {
	it('applies the locale, the zone and the hour cycle to any options', () => {
		const f = formatter({ locale: 'en-GB', timeZone: 'Europe/Paris' });
		expect(f.intl({ hour: '2-digit', minute: '2-digit' }).format(INSTANT)).toBe('18:38');
		expect(f.intl({ weekday: 'narrow' }).format(INSTANT)).toBe('S');
	});
});

describe('createDateFormatter: values that are not dates', () => {
	it('returns them as they came and says so once', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const f = formatter();
		expect(f.format('not a date')).toBe('not a date');
		expect(f.exact('not a date')).toBe('not a date');
		expect(f.relative('not a date')).toBe('not a date');
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"not a date" is not a date'));
	});
});

describe('createDateFormatter: resolved values', () => {
	it('resolves auto and local, and changes its key with the settings', () => {
		const f = createDateFormatter({ ...DEFAULT_DATE_SETTINGS, locale: 'auto', timeZone: 'local' });
		expect(f.locale).not.toBe('auto');
		expect(f.timeZone).not.toBe('local');
		expect(createDateFormatter({ ...DEFAULT_DATE_SETTINGS }).key).not.toBe(createDateFormatter({ ...DEFAULT_DATE_SETTINGS, preset: 'iso' }).key);
		expect(createDateFormatter({ ...DEFAULT_DATE_SETTINGS }).key).toBe(createDateFormatter({ ...DEFAULT_DATE_SETTINGS }).key);
	});
});

// Everything a formatter can print, for a fixed instant. Two formatters whose probes differ MUST have different keys: a
// DateFormatProvider keeps the old formatter as long as the key is unchanged.
function probe(f: ReturnType<typeof formatter>): string {
	return JSON.stringify([
		f.format(INSTANT, 'short'),
		f.format(INSTANT, 'medium'),
		f.format(INSTANT, 'long'),
		f.exact(INSTANT),
		f.relative(INSTANT - 3 * 3600 * 1000, INSTANT),
		f.weekdays(),
		f.months(),
		f.intl({ hour: 'numeric', minute: '2-digit' }).format(INSTANT),
		f.firstDayOfWeek,
	]);
}

describe('createDateFormatter: the key covers every setting that changes the output', () => {
	const base: DateSettings = { ...DEFAULT_DATE_SETTINGS, locale: 'en-GB', timeZone: 'UTC', weekStart: 'monday', weekdayStyle: 'short' };
	// One pair per DateSettings field: only that field differs, and it changes what the formatter prints.
	const changing: Record<keyof DateSettings, Partial<DateSettings>> = {
		locale: { locale: 'fr-FR' },
		timeZone: { timeZone: 'Asia/Tokyo' },
		weekStart: { weekStart: 'sunday' },
		preset: { preset: 'iso' },
		hourCycle: { hourCycle: '12h' },
		weekdayStyle: { weekdayStyle: 'long' },
	};

	it('lists every field of DateSettings (a new field must be added here, and to the key if it changes the output)', () => {
		expect(Object.keys(changing).sort()).toStrictEqual(Object.keys(DEFAULT_DATE_SETTINGS).sort());
	});

	it.each(Object.entries(changing))('%s: the output changes, so the key changes', (_field, change) => {
		const a = createDateFormatter(base);
		const b = createDateFormatter({ ...base, ...change });
		expect(probe(b)).not.toBe(probe(a));
		expect(b.key).not.toBe(a.key);
	});

	it.each([
		['short to long', 'short', 'long'],
		['long to short', 'long', 'short'],
		['narrow to short', 'narrow', 'short'],
	] as const)('weekdayStyle %s: the default of weekdays() follows, in both directions', (_name, from, to) => {
		const a = createDateFormatter({ ...base, weekdayStyle: from });
		const b = createDateFormatter({ ...base, weekdayStyle: to });
		expect(a.weekdays()).toStrictEqual(a.weekdays(from));
		expect(b.weekdays()).toStrictEqual(b.weekdays(to));
		expect(a.weekdays()).not.toStrictEqual(b.weekdays());
		expect(a.key).not.toBe(b.key);
	});

	it('does not read the settings object after creation (a later mutation changes neither output nor key)', () => {
		const settings = { ...base };
		const f = createDateFormatter(settings);
		const before = [f.weekdays(), f.key];
		settings.weekdayStyle = 'long';
		expect([f.weekdays(), f.key]).toStrictEqual(before);
	});

	it('keeps the key when the settings differ but resolve to the same values', () => {
		const same = (a: Partial<DateSettings>, b: Partial<DateSettings>): void => {
			const fa = createDateFormatter({ ...base, ...a });
			const fb = createDateFormatter({ ...base, ...b });
			expect(probe(fb)).toBe(probe(fa));
			expect(fb.key).toBe(fa.key);
		};
		// en-GB weeks start on Monday
		same({ weekStart: 'auto' }, { weekStart: 'monday' });
		same({ timeZone: 'local' }, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
		vi.stubGlobal('navigator', { languages: ['en-GB'], language: 'en-GB' });
		same({ locale: 'auto' }, { locale: 'en-GB' });
	});
});
