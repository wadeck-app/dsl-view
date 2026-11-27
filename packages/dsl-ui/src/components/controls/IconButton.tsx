import React from 'react';
import { lockedIconSize, useButtonContext } from './buttonContext.js';
import { Button } from './_Button.js';
import type { ButtonProps } from './_Button.js';
import { Tooltip } from '../overlay/Tooltip.js';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
	icon: React.ReactNode;
	'aria-label': string;
	size?: 'icon' | 'icon-field' | 'icon-sm' | 'icon-xs';
	/** A text longer than the aria-label, shown in the tooltip card instead of it; it then also describes the button. */
	tooltip?: string;
}

/**
 * Icon-only button wrapper. Requires aria-label for accessibility.
 * Always renders as ghost by default -- container defaultVariant context is intentionally shadowed.
 * @registryCategory atomic
 * @registryTags button icon
 */
export function IconButton({
	icon,
	'aria-label': ariaLabel,
	size,
	variant = 'ghost',
	tooltip,
	...rest
}: IconButtonProps) {
	// Inside a container that owns the size (ActionBar...) an icon button takes that scale, so a row never mixes a big icon with small buttons.
	const resolvedSize = size ?? lockedIconSize(useButtonContext()) ?? 'icon';
	const button = (
		<Button size={resolvedSize} variant={variant} aria-label={ariaLabel} {...rest}>
			{icon}
		</Button>
	);
	// A title given by the caller stays the native one it asked for. Otherwise the label is the tooltip: the same text is
	// already the accessible name, so the tooltip does not describe the button a second time; a longer `tooltip` does.
	return rest.title !== undefined ? (
		button
	) : (
		<Tooltip content={tooltip ?? ariaLabel} describe={tooltip !== undefined}>
			{button}
		</Tooltip>
	);
}
