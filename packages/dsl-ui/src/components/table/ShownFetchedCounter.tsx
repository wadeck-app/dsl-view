import React from 'react';

import { computeShownTotal } from '../../utils/computeShownTotal.js';

export interface ShownFetchedCounterProps {
	raw: Record<string, unknown> | unknown[] | null | undefined;
	entriesField?: string;
	totalField?: string;
	/** When true, applies ml-auto to push the counter to the right. */
	pushRight?: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags counter pagination
 */
export function ShownFetchedCounter({
	raw,
	entriesField = 'entries',
	totalField = 'total',
	pushRight = false,
}: ShownFetchedCounterProps) {
	const { shown, total } = computeShownTotal(raw, entriesField, totalField);
	return (
		<span
			className={['text-xs text-muted whitespace-nowrap', pushRight ? 'ml-auto' : '']
				.filter(Boolean)
				.join(' ')}
		>
			{shown} shown / {total} fetched
		</span>
	);
}
