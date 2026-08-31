import React from 'react';

import { Button } from '../controls/_Button.js';

export interface ButtonCancelProps {
	label?: string;
	onCancel: () => void;
}

/**
 * @registryCategory atomic
 * @registryTags button form-specific
 */
export function ButtonCancel({ label = 'Cancel', onCancel }: ButtonCancelProps) {
	return (
		<Button variant="ghost" onClick={onCancel}>
			{label}
		</Button>
	);
}
