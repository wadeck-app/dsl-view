import React from 'react';
import { Button } from './_Button.js';
import type { ButtonProps } from './_Button.js';
import { Tooltip } from '../overlay/Tooltip.js';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
	icon: React.ReactNode;
	'aria-label': string;
	size?: 'icon' | 'icon-field' | 'icon-sm' | 'icon-xs';
}

/**
 * Icon-only button wrapper. Requires aria-label for accessibility.
 * Always renders as ghost by default -- container defaultVariant context is intentionally shadowed.
 * @registryCategory atomic
 */
export function IconButton({
	icon,
	'aria-label': ariaLabel,
	size = 'icon',
	variant = 'ghost',
	...rest
}: IconButtonProps) {
	const button = (
		<Button size={size} variant={variant} aria-label={ariaLabel} {...rest}>
			{icon}
		</Button>
	);
	// A title given by the caller stays the native one it asked for. Otherwise the label is the tooltip: the same text is
	// already the accessible name, so the tooltip does not describe the button a second time.
	return rest.title !== undefined ? (
		button
	) : (
		<Tooltip content={ariaLabel} describe={false}>
			{button}
		</Tooltip>
	);
}
