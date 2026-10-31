import type { DateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { DAY_MS } from './timeSeriesMath.js';
import type { XFormat } from './timeSeriesMath.js';

// Every text below goes through the formatter of the date settings (language, clock, time zone: `useDateFormat()`).
// No option here sets `hourCycle`, `hour12` or `timeZone`: the formatter adds them, so the app's choice (24h, 12h, iso) wins.

/** `Intl` throws a RangeError outside +-8.64e15 ms (and for NaN): such a value is shown as the raw number. */
const MAX_DATE_MS = 8.64e15;

const DATE: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const DATE_WITH_YEAR: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: '2-digit' };
const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
const DATE_TIME: Intl.DateTimeFormatOptions = { ...DATE, ...TIME };
const BRUSH_DATE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
const HEADING_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
const HEADING_DATE_TIME: Intl.DateTimeFormatOptions = { ...HEADING_DATE, ...TIME };
// Identifies a calendar day in the formatter's time zone (two instants with the same text are on the same day).
const DAY: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };

/** From this visible span on, a `date` axis adds the year. */
const YEAR_SPAN_MS = 300 * DAY_MS;

function formatMoment(formatter: DateFormatter, options: Intl.DateTimeFormatOptions, t: number): string {
	if (!Number.isFinite(t) || Math.abs(t) > MAX_DATE_MS) {
		return String(t);
	}
	return formatter.intl(options).format(t);
}

/**
 * Axis labels of `ticks`, by tick.
 *
 * - `date`: "5 Jan"; the year is added when the visible span is over 300 days.
 * - `datetime`: "5 Jan, 14:30".
 * - `time`: "14:30", except the first tick and every tick that starts a new calendar day (in the formatter's time zone), which
 *   carry the date too ("5 Jan, 00:00"). A time-only label repeated over several days would be ambiguous.
 *
 * The clock (24h / 12h, "14:30" / "02:30 pm") is the formatter's, not the component's.
 */
export function xTickLabels(formatter: DateFormatter, ticks: readonly number[], xFormat: XFormat, spanMs: number): Map<number, string> {
	const labels = new Map<number, string>();
	if (xFormat !== 'time') {
		const options = xFormat === 'datetime' ? DATE_TIME : spanMs > YEAR_SPAN_MS ? DATE_WITH_YEAR : DATE;
		for (const t of ticks) {
			labels.set(t, formatMoment(formatter, options, t));
		}
		return labels;
	}
	let previousDay: string | null = null;
	for (const t of ticks) {
		const showable = Number.isFinite(t) && Math.abs(t) <= MAX_DATE_MS;
		const day = showable ? formatter.intl(DAY).format(t) : null;
		const startsDay = previousDay === null || day !== previousDay;
		labels.set(t, formatMoment(formatter, startsDay ? DATE_TIME : TIME, t));
		previousDay = day;
	}
	return labels;
}

/** Tooltip heading and screen reader day of `t`: weekday and date, plus the time of day unless `xFormat` is `date`. */
export function formatXHeading(formatter: DateFormatter, t: number, xFormat: XFormat): string {
	return formatMoment(formatter, xFormat === 'date' ? HEADING_DATE : HEADING_DATE_TIME, t);
}

/** Date text of the timestamp `t` (ms) for the TimeBrush label. */
export function formatBrushDate(formatter: DateFormatter, t: number): string {
	return formatMoment(formatter, BRUSH_DATE, t);
}
