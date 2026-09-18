import React from 'react';

export interface HttpMethodBadgeProps {
	method: string;
}

/*
 * One hue token per method, not a `text-blue-600 dark:text-blue-400` pair.
 *
 * No single semantic token can mean "one of N method colours", which is why these were literals -
 * but a dark: variant applies under ANY .dark ancestor, so the badge ignored a ThemeScope that
 * re-asserted light and stayed on its dark shade over a light panel. A named hue is still a token,
 * so it resolves against the nearest scope.
 *
 * The shade moves a step: 600/400 becomes the hue token's 700/300, shared with the chips. One ink
 * per hue across the system rather than two that nearly match.
 */
const METHOD_COLORS: Record<string, string> = {
	GET: 'text-hue-blue',
	POST: 'text-hue-green',
	PUT: 'text-hue-yellow',
	PATCH: 'text-hue-orange',
	DELETE: 'text-hue-red',
	OPTIONS: 'text-hue-purple',
	HEAD: 'text-hue-cyan',
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
