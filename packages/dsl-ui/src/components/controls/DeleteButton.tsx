import React from 'react';
import { Button } from './_Button.js';
import type { ButtonProps } from './_Button.js';

export type DeleteButtonProps = Omit<ButtonProps, 'variant' | 'size'>;

/**
 * Danger-styled delete button. variant and size are hardcoded and cannot be overridden.
 * @registryCategory atomic
 */
export function DeleteButton({ children = 'Delete', ...rest }: DeleteButtonProps) {
	return (
		<Button variant="danger" size="sm" {...rest}>
			{children}
		</Button>
	);
}
