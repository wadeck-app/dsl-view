import React from 'react';
import { Button } from './_Button.js';
import type { ButtonProps } from './_Button.js';

export interface TabButtonProps extends ButtonProps {
	active?: boolean;
}

/**
 * Tab-style button. Adds an active underline indicator when active=true.
 * Always renders as ghost by default -- container defaultVariant context is intentionally shadowed.
 * @registryCategory controls
 */
export function TabButton({
	active = false,
	variant = 'ghost',
	className = '',
	children,
	...rest
}: TabButtonProps) {
	const activeClass = active ? 'border-b-2 border-[var(--color-primary-solid)]' : '';
	return (
		<Button variant={variant} className={[activeClass, className].filter(Boolean).join(' ')} {...rest}>
			{children}
		</Button>
	);
}
