import React from 'react';

import { Button } from '../controls/_Button.js';

export interface ButtonCancelProps {
	label?: string;
	onCancel: () => void;
	disabled?: boolean;
}

/**
 * @registryCategory atomic
 * @registryTags button form-specific
 */
export function ButtonCancel({ label = 'Cancel', onCancel, disabled }: ButtonCancelProps) {
	return (
		<Button variant="ghost" onClick={onCancel} disabled={disabled}>
			{label}
		</Button>
	);
}
