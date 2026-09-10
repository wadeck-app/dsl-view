import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './_Button.js';

type IconButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type IconButtonSize = 'sm' | 'md';

export interface IconButtonProps {
	icon: React.ReactNode;
	label: string;
	variant?: IconButtonVariant;
	size?: IconButtonSize;
	onClick?: () => void;
	disabled?: boolean;
	disabledReason?: string;
	loading?: boolean;
}

const SIZE_PADDING: Record<IconButtonSize, string> = {
	sm: 'p-1.5',
	md: 'p-2',
};

/**
 * @registryCategory atomic
 * @registryTags button icon action
 */
export function IconButton({
	icon,
	label,
	variant = 'secondary',
	size = 'md',
	onClick,
	disabled,
	disabledReason,
	loading = false,
}: IconButtonProps) {
	return (
		<Button
			variant={variant}
			size={size}
			onClick={onClick}
			disabled={disabled}
			disabledReason={disabledReason}
			loading={false}
			aria-label={label}
			className={SIZE_PADDING[size]}
		>
			{loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
		</Button>
	);
}
