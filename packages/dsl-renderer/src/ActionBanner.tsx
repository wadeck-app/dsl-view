import React from 'react';

import { ActionBannerEntry } from './ActionBannerEntry.js';
import type { BannerItem } from './notifier.js';

/** Default feedback surface when the host provides no notifier. Renders nothing while there is nothing to say. */
export function ActionBanner({ items, onDismiss }: { items: BannerItem[]; onDismiss: (id: number) => void }) {
	if (items.length === 0) {
		return null;
	}
	return (
		<div data-testid="action-banner">
			{items.map(item => (
				<ActionBannerEntry key={item.id} item={item} onDismiss={onDismiss} />
			))}
		</div>
	);
}
