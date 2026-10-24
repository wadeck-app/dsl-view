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
		// rest first: the types omit variant and size, but a DSL node can still carry them at runtime.
		<Button {...rest} variant="danger" size="sm">
			{children}
		</Button>
	);
}
