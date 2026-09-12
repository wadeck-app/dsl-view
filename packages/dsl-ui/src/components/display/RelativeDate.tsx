import React, { useEffect, useState } from 'react';

import { format as dateFnsFormat } from 'date-fns';

import { Tooltip } from '../overlay/Tooltip.js';

export interface RelativeDateProps {
	date: Date | string | number;
	className?: string;
	/** @default true - updates label every 60s */
	live?: boolean;
	/** @default true - shows absolute date in Tooltip on hover */
	tooltip?: boolean;
	/** date-fns format string for the tooltip, default 'PPP p' */
	format?: string;
}

export function getRelativeLabel(date: Date): string {
	const now = Date.now();
	const diffMs = now - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);
	const diffWeek = Math.floor(diffDay / 7);
	const diffMonth = Math.floor(diffDay / 30);
	const diffYear = Math.floor(diffDay / 365);

	if (diffSec < 0) return 'in the future';
	if (diffSec < 60) return 'just now';
	if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
	if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
	if (diffDay < 2) return 'yesterday';
	if (diffDay < 7) return `${diffDay} days ago`;
	if (diffDay < 14) return 'last week';
	if (diffDay < 30) return `${diffWeek} weeks ago`;
	if (diffDay < 60) return 'last month';
	if (diffDay < 365) return `${diffMonth} months ago`;
	if (diffDay < 730) return 'last year';
	return `${diffYear} years ago`;
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
	format = 'PPP p',
}: RelativeDateProps) {
	const dateObj = date instanceof Date ? date : new Date(date);
	const [label, setLabel] = useState(() => getRelativeLabel(dateObj));

	useEffect(() => {
		setLabel(getRelativeLabel(dateObj));

		if (!live) return;

		const id = setInterval(() => {
			setLabel(getRelativeLabel(dateObj));
		}, 60000);

		return () => clearInterval(id);
	}, [dateObj.getTime(), live]);

	// text-content ensures no ambient color (e.g. CSS variable leakage via inline-flex context) bleeds onto the number
	const timeEl = (
		<time dateTime={dateObj.toISOString()} className={['text-content text-sm', className].filter(Boolean).join(' ')}>
			{label}
		</time>
	);

	if (tooltip) {
		const absoluteDate = dateFnsFormat(dateObj, format);
		return <Tooltip content={absoluteDate}>{timeEl}</Tooltip>;
	}

	return timeEl;
}
