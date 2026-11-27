import React from 'react';

import { Button } from '../controls/_Button.js';

export interface ButtonCancelProps {
	label?: string;
	onCancel: () => void;
	disabled?: boolean;
	/** Why the button is off; shown in its tooltip while it is. */
	disabledReason?: string;
}

/**
 * @registryCategory atomic
 * @registryTags button form-specific
 */
export function ButtonCancel({ label = 'Cancel', onCancel, disabled, disabledReason }: ButtonCancelProps) {
	return (
		<Button variant="ghost" onClick={onCancel} disabled={disabled} disabledReason={disabledReason}>
			{label}
		</Button>
	);
}
