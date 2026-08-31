import React from 'react';

import { Button } from './_Button.js';

export interface ButtonActionProps {
	label: string;
	variant?: 'primary' | 'danger' | 'danger-outline' | 'success';
	onClick?: () => void;
}

/**
 * @registryCategory atomic
 * @registryTags button action
 */
export function ButtonAction({ label, variant = 'primary', onClick }: ButtonActionProps) {
	return (
		<Button variant={variant} onClick={onClick}>
			{label}
		</Button>
	);
}
