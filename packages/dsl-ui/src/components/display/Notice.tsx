import React, { useState } from 'react';

import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';
import type { BadgeVariant } from './Badge.js';

// @formatter:off
// The subtle pairs of Badge, so a view can swap a Badge for a Notice (same `label` and `variant`).
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
	default: 'bg-muted-bg text-muted',
	primary: 'bg-primary-light text-primary',
	success: 'bg-success-bg text-success-text',
	warning: 'bg-warning-bg text-warning-text',
	danger:  'bg-danger-bg text-danger-text',
	info:    'bg-info-bg text-info-text',
};
// @formatter:on

// Above this many characters the message is clamped to three lines behind a "Show more" button.
const LONG_MESSAGE = 140;

export interface NoticeProps {
	/** The message. Named like `Badge.label`. */
	label: string;
	/** Same names as `Badge.variant`. Default `info`. */
	variant?: BadgeVariant;
	/** Label of the button that expands a long message. Default "Show more". */
	showMoreLabel?: string;
	/** Label of the button that collapses it again. Default "Show less". */
	showLessLabel?: string;
}

/**
 * A short message that WRAPS: the feedback of an action ("saved, but 1 event was not delivered") in a narrow column, where
 * `Badge` keeps one line and overflows. A long message (a replay command, say) is clamped to three lines and can be
 * expanded: nothing is cut for good. A danger notice is announced as an alert, the others as a status.
 *
 * For a sentence or two: no actions, no dismissal, no rich content.
 *
 * @registryCategory atomic
 * @registryTags notice message feedback alert banner
 */
export function Notice({ label, variant = 'info', showMoreLabel = 'Show more', showLessLabel = 'Show less' }: NoticeProps): React.ReactElement | null {
	const [expanded, setExpanded] = useState(false);
	if (!label) {
		return null;
	}
	const isLong = label.length > LONG_MESSAGE;
	return (
		<div
			role={variant === 'danger' ? 'alert' : 'status'}
			className={`min-w-0 break-words rounded px-3 py-2 text-sm leading-snug ${classFor('Notice', 'variant', variant, VARIANT_CLASSES, 'info')}`}
		>
			<p className={`m-0 ${isLong && !expanded ? 'line-clamp-3' : ''}`}>{label}</p>
			{isLong && (
				// A link-like control inside a tinted box: it keeps the colour of the text.
				<button
					type="button"
					aria-expanded={expanded}
					className="mt-1 cursor-pointer border-0 bg-transparent p-0 text-xs font-medium underline"
					onClick={() => setExpanded(value => !value)}
				>
					{expanded ? showLessLabel : showMoreLabel}
				</button>
			)}
		</div>
	);
}
