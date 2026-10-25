import React, { useState } from 'react';

import { ActionBannerEntry } from './ActionBannerEntry.js';
import type { BannerItem } from './notifier.js';

/** Entries shown at once; the older ones wait behind the "+N more" control. */
export const MAX_VISIBLE_BANNERS = 5;

/**
 * Default feedback surface when the host provides no notifier. Renders nothing while there is nothing to say.
 * Newest first. Beyond {@link MAX_VISIBLE_BANNERS} the older entries collapse into one reachable control: an error is
 * never dropped, only folded.
 */
export function ActionBanner({ items, onDismiss }: { items: BannerItem[]; onDismiss: (id: number) => void }) {
	const [expanded, setExpanded] = useState(false);
	if (items.length === 0) {
		return null;
	}
	const newestFirst = [...items].reverse();
	const hidden = expanded ? 0 : Math.max(0, newestFirst.length - MAX_VISIBLE_BANNERS);
	const shown = hidden > 0 ? newestFirst.slice(0, MAX_VISIBLE_BANNERS) : newestFirst;
	return (
		<div data-testid="action-banner">
			{shown.map(item => (
				<ActionBannerEntry key={item.id} item={item} onDismiss={onDismiss} />
			))}
			{(hidden > 0 || (expanded && newestFirst.length > MAX_VISIBLE_BANNERS)) && (
				// violations-suppress: react/no-raw-button - dsl-renderer cannot import dsl-ui's Button (dependency direction)
				<button
					type="button"
					aria-expanded={expanded}
					onClick={() => setExpanded(value => !value)}
					style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.8125rem', textDecoration: 'underline', marginBottom: '0.5rem' }}
				>
					{expanded ? 'Show fewer' : `+${hidden} more`}
				</button>
			)}
		</div>
	);
}
