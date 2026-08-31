import React from 'react';

export interface HttpMethodBadgeProps {
	method: string;
}

// HTTP Method colors - dynamic per-method swatch mapping, already safelisted in
// tailwind.config.js (no single semantic token can represent "one of N method colors")
const METHOD_COLORS: Record<string, string> = {
	GET: 'text-blue-600 dark:text-blue-400',
	POST: 'text-green-600 dark:text-green-400',
	PUT: 'text-yellow-600 dark:text-yellow-400',
	PATCH: 'text-orange-600 dark:text-orange-400',
	DELETE: 'text-red-600 dark:text-red-400',
	OPTIONS: 'text-purple-600 dark:text-purple-400',
	HEAD: 'text-cyan-600 dark:text-cyan-400',
};

/**
 * @registryCategory atomic
 * @registryTags badge http
 */
export function HttpMethodBadge({ method }: HttpMethodBadgeProps) {
	return (
		<span className={`font-semibold whitespace-nowrap ${METHOD_COLORS[method] ?? 'text-content'}`}>
			{method}
		</span>
	);
}
