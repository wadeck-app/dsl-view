import React from 'react';

import { useDateFormat } from '@dsl-ui/dates/DateFormatContext.js';
import type { DatePart, DateStyle } from '@dsl-ui/dates/dateFormatter.js';
import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

export interface DateTextProps {
	/** The moment to show: a Date, epoch milliseconds, or ISO 8601 text. Empty or missing renders nothing. */
	value: Date | string | number;
	/** `short` 24/10/2026, 18:38 | `medium` (default) 24 Oct 2026, 18:38:05 | `long` Saturday 24 October 2026 at 18:38:05 UTC (en-GB, 24h). */
	dateStyle?: DateStyle;
	/** `datetime` (default), or only the `date` or the `time`. */
	part?: DatePart;
	/** Shows "5 minutes ago" / "in 2 hours" instead of the date, computed once per render (use `RelativeDate` for a label that keeps updating). */
	relative?: boolean;
}

const STYLES: Readonly<Record<DateStyle, DateStyle>> = { short: 'short', medium: 'medium', long: 'long' };
const PARTS: Readonly<Record<DatePart, DatePart>> = { datetime: 'datetime', date: 'date', time: 'time' };

/**
 * A date or time as plain text, written the way the user's date settings say (language, clock, time zone: see
 * `DateFormatProvider`). The exact instant (ISO 8601 with offset and zone) is the tooltip. No colour and no weight: the
 * surrounding text decides how it looks. A value that is not a date is shown as it came (the formatter warns once).
 *
 * @registryCategory atomic
 * @registryTags date time text
 */
export function DateText({ value, dateStyle, part, relative }: DateTextProps) {
	const formatter = useDateFormat();
	if (value === undefined || value === null || value === '') {
		return null;
	}
	if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
		reportAuthoringMistake(`[DateText] value must be a Date, epoch milliseconds or an ISO 8601 text, got ${Array.isArray(value) ? 'an array' : typeof value}; nothing is shown.`);
		return null;
	}
	const style = classFor('DateText', 'dateStyle', dateStyle, STYLES, 'medium') as DateStyle;
	const shownPart = classFor('DateText', 'part', part, PARTS, 'datetime') as DatePart;
	const text = relative === true ? formatter.relative(value) : formatter.format(value, style, shownPart);
	const moment = value instanceof Date ? value : new Date(value);
	// Not a date: shown as it came, with nothing to say about an instant.
	if (Number.isNaN(moment.getTime())) {
		return <span>{text}</span>;
	}
	return (
		<time dateTime={moment.toISOString()} title={formatter.exact(value)}>
			{text}
		</time>
	);
}
