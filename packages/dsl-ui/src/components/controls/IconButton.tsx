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

const SIZE_CLASS: Record<IconButtonSize, string> = {
	sm: '!w-6 !h-6 !p-0 flex items-center justify-center',
	md: '!w-8 !h-8 !p-0 flex items-center justify-center',
};

const ICON_SIZE: Record<IconButtonSize, string> = {
	sm: 'h-3.5 w-3.5',
	md: 'h-4 w-4',
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
			className={SIZE_CLASS[size]}
		>
			{loading
				? <Loader2 className={`${ICON_SIZE[size]} animate-spin`} aria-hidden="true" />
				: icon}
		</Button>
	);
}
