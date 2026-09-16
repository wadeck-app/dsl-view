import React from 'react';

import { Button } from './_Button.js';

export interface ButtonActionProps {
	label: string;
	variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'success';
	/**
	 * Leading icon. Dropped while `loading`, where the spinner occupies that slot.
	 *
	 * Without this a caller needing an icon had to hand-roll the whole button, since the
	 * base Button is internal - and the copy then carried its own padding and font size,
	 * which is how a row of actions ended up with buttons of three different heights.
	 */
	icon?: React.ReactNode;
	/** Geometry belongs to the design system; callers pick a size, never a padding. */
	size?: 'sm' | 'md';
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
export function ButtonAction({ label, variant = 'primary', icon, size, onClick, disabled, disabledReason, loading, type = 'button' }: ButtonActionProps) {
	return (
		<Button
			variant={variant}
			size={size}
			onClick={onClick}
			disabled={disabled}
			disabledReason={disabledReason}
			loading={loading}
			type={type}
		>
			{icon && !loading && icon}
			{label}
		</Button>
	);
}
