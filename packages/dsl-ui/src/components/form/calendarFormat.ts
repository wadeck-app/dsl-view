import type { DateFormatter } from '@dsl-ui/dates/dateFormatter.js';

// The calendars work on local calendar days (a `Date` at local midnight stands for "that day"). Writing such a day through
// the date settings must not depend on the settings' time zone: midnight of Oct 24 in Paris is still Oct 23 in New York.
// So the day is turned into an instant that the formatter's zone writes as NOON of that same day, then formatted.

const offsetFormats = new Map<string, Intl.DateTimeFormat>();

// Offset of a zone (minutes east of UTC) at an instant; read from a fixed locale so the text is always "GMT+02:00" / "GMT".
function zoneOffsetMinutes(timeZone: string, at: number): number {
	let format = offsetFormats.get(timeZone);
	if (format === undefined) {
		format = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' });
		offsetFormats.set(timeZone, format);
	}
	const name = format.formatToParts(at).find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
	const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(name);
	if (match === null) {
		throw new Error(`[dates] cannot read the offset of time zone "${timeZone}" from "${name}".`);
	}
	if (match[1] === undefined) {
		return 0;
	}
	return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

/** The instant at which `formatter`'s time zone reads noon of the local calendar day of `day`. */
export function noonOfDay(formatter: DateFormatter, day: Date): Date {
	const utcNoon = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12);
	return new Date(utcNoon - zoneOffsetMinutes(formatter.timeZone, utcNoon) * 60_000);
}

/** "24 Oct 2026" (or "2026-10-24" with the iso preset): what a date field shows when it has no `dateFormat`. */
export function formatDay(formatter: DateFormatter, day: Date): string {
	return formatter.format(noonOfDay(formatter, day), 'medium', 'date');
}

/** "24 October 2026" ("October 24, 2026" in en-US): the accessible name of a calendar day. */
export function formatDayLong(formatter: DateFormatter, day: Date): string {
	return formatter.intl({ day: 'numeric', month: 'long', year: 'numeric' }).format(noonOfDay(formatter, day));
}

/** The number of the day in the month, in the digits of the language. */
export function formatDayNumber(formatter: DateFormatter, day: Date): string {
	return formatter.intl({ day: 'numeric' }).format(noonOfDay(formatter, day));
}

/** "October 2026", the heading of a calendar month. */
export function formatMonthTitle(formatter: DateFormatter, month: Date): string {
	return formatter.intl({ month: 'long', year: 'numeric' }).format(noonOfDay(formatter, month));
}

/**
 * Reads what the user typed into a date field that shows `formatDay` text: ISO `yyyy-MM-dd`, or exactly the text the field
 * would show for that day. Anything else is not a date here (undefined), never a guess.
 */
export function parseDay(formatter: DateFormatter, text: string): Date | undefined {
	const trimmed = text.trim();
	const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	const candidate = iso !== null ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(trimmed);
	if (Number.isNaN(candidate.getTime())) {
		return undefined;
	}
	const day = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
	// An ISO text must name a real day (2026-02-31 would roll over to March); other text must be what the field shows.
	if (iso !== null) {
		return day.getMonth() === Number(iso[2]) - 1 && day.getDate() === Number(iso[3]) ? day : undefined;
	}
	return formatDay(formatter, day) === trimmed ? day : undefined;
}
