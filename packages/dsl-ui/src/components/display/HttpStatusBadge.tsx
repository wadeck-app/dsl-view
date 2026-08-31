import React from 'react';

export interface HttpStatusBadgeProps {
	status: number;
}

// HTTP Status colors - dynamic per-status-family swatch mapping, already safelisted in
// tailwind.config.js (no single semantic token can represent "one of N status-family colors")
function statusColor(status: number): string {
	if (status < 300) return 'text-green-600 dark:text-green-400';
	if (status < 400) return 'text-yellow-600 dark:text-yellow-400';
	if (status < 500) return 'text-orange-600 dark:text-orange-400';
	return 'text-red-600 dark:text-red-400';
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
