import React from 'react';

export interface HttpStatusBadgeProps {
	status: number;
}

/*
 * A hue token per status family. These were `text-green-600 dark:text-green-400` pairs, and a dark:
 * variant applies under ANY .dark ancestor - so the badge kept its dark shade inside a ThemeScope
 * that re-asserted light. See .claude/docs/theming.md.
 */
function statusColor(status: number): string {
	if (status < 300) {
		return 'text-hue-green';
	}
	if (status < 400) {
		return 'text-hue-yellow';
	}
	if (status < 500) {
		return 'text-hue-orange';
	}
	return 'text-hue-red';
}

/**
 * @registryCategory atomic
 * @registryTags badge http
 */
export function HttpStatusBadge({ status }: HttpStatusBadgeProps) {
	return (
		<span className={`font-semibold whitespace-nowrap ${statusColor(status)}`}>
			{status}
		</span>
	);
}
