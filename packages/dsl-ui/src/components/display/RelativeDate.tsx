import React, { useEffect, useState } from 'react';

import { useDateFormat } from '@dsl-ui/dates/DateFormatContext.js';
import { getDefaultDateFormatter } from '@dsl-ui/dates/DateFormatContext.js';
import type { DateFormatter } from '@dsl-ui/dates/dateFormatter.js';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

import { Tooltip } from '../overlay/Tooltip.js';

export interface RelativeDateProps {
	date: Date | string | number;
	className?: string;
	/** @default true - updates label every 60s */
	live?: boolean;
	/** @default true - shows the exact timestamp (ISO 8601 with offset and zone, from the date settings) in a Tooltip on hover */
	tooltip?: boolean;
	/** @deprecated Ignored: the tooltip is the exact timestamp of the date settings (`DateFormatProvider`), not a date-fns format. */
	format?: string;
}

/**
 * "5 minutes ago", "yesterday", "in 2 hours", in the language of the date settings (English `en-GB` without a
 * `DateFormatProvider`). A date less than 45 seconds away reads "now".
 */
export function getRelativeLabel(date: Date | string | number, formatter: DateFormatter = getDefaultDateFormatter()): string {
	return formatter.relative(date);
}

/**
 * @registryCategory atomic
 * @registryTags date relative time
 */
export function RelativeDate({
	date,
	className,
	live = true,
	tooltip = true,
	format,
}: RelativeDateProps) {
	const formatter = useDateFormat();
	const dateObj = date instanceof Date ? date : new Date(date);
	const [label, setLabel] = useState(() => getRelativeLabel(date, formatter));

	useEffect(() => {
		if (format !== undefined) {
			reportAuthoringMistake('[RelativeDate] `format` is ignored: the tooltip is the exact timestamp of the date settings. Remove it, or show the date with DateText.');
		}
	}, [format !== undefined]);

	useEffect(() => {
		setLabel(getRelativeLabel(date, formatter));

		if (!live) return;

		const id = setInterval(() => {
			setLabel(getRelativeLabel(date, formatter));
		}, 60000);

		return () => clearInterval(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dateObj.getTime(), live, formatter.key]);

	// toISOString throws a RangeError on an invalid date, which would take the whole page down for one bad cell. Show the
	// value as it came (visible, not hidden); the formatter has said so in the console.
	if (Number.isNaN(dateObj.getTime())) {
		return <span className={['text-content text-sm', className].filter(Boolean).join(' ')}>{String(date)}</span>;
	}

	// text-content ensures no ambient color (e.g. CSS variable leakage via inline-flex context) bleeds onto the number
	const timeEl = (
		<time dateTime={dateObj.toISOString()} className={['text-content text-sm', className].filter(Boolean).join(' ')}>
			{label}
		</time>
	);

	if (tooltip) {
		return <Tooltip content={formatter.exact(dateObj)}>{timeEl}</Tooltip>;
	}

	return timeEl;
}
