import React from 'react';
import { Button } from './_Button.js';
import type { ButtonProps } from './_Button.js';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
	icon: React.ReactNode;
	'aria-label': string;
	size?: 'icon' | 'icon-sm' | 'icon-xs';
}

/**
 * Icon-only button wrapper. Requires aria-label for accessibility.
 * Always renders as ghost by default -- container defaultVariant context is intentionally shadowed.
 * @registryCategory controls
 */
export function IconButton({
	icon,
	'aria-label': ariaLabel,
	size = 'icon',
	variant = 'ghost',
	...rest
}: IconButtonProps) {
	return (
		<Button size={size} variant={variant} aria-label={ariaLabel} title={ariaLabel} {...rest}>
			{icon}
		</Button>
	);
}
