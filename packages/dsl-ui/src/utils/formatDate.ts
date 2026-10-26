import { getDefaultDateFormatter } from '@dsl-ui/dates/DateFormatContext.js';
import type { DateFormatter } from '@dsl-ui/dates/dateFormatter.js';

/**
 * A short date and time ("24/10/2026, 18:38") from the date settings. Not a hook: pass the formatter you got from
 * `useDateFormat()` to follow a `DateFormatProvider`; without one the documented default (English `en-GB`, 24h) is used.
 * A value that is not a date comes back as it was and the formatter warns once.
 */
export function formatDateTime(iso: string, formatter: DateFormatter = getDefaultDateFormatter()): string {
	return formatter.format(iso, 'short');
}
