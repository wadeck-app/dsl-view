import React from 'react';

import { Button } from './_Button.js';

export interface ButtonActionProps {
	label: string;
	variant?: 'primary' | 'danger' | 'danger-outline' | 'success';
	onClick?: () => void;
	disabled?: boolean;
	loading?: boolean;
	type?: 'button' | 'submit';
}

/**
 * @registryCategory atomic
 * @registryTags button action
 */
export function ButtonAction({ label, variant = 'primary', onClick, disabled, loading, type = 'button' }: ButtonActionProps) {
	return (
		<Button variant={variant} onClick={onClick} disabled={disabled} loading={loading} type={type}>
			{label}
		</Button>
	);
}
