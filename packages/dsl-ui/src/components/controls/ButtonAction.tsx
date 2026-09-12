import React from 'react';

import { Button } from './_Button.js';

export interface ButtonActionProps {
	label: string;
	variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'success';
	onClick?: () => void;
	disabled?: boolean;
	disabledReason?: string;
	loading?: boolean;
	type?: 'button' | 'submit';
}

/**
 * @registryCategory atomic
 * @registryTags button action
 */
export function ButtonAction({ label, variant = 'primary', onClick, disabled, disabledReason, loading, type = 'button' }: ButtonActionProps) {
	return (
		<Button variant={variant} onClick={onClick} disabled={disabled} disabledReason={disabledReason} loading={loading} type={type}>
			{label}
		</Button>
	);
}
