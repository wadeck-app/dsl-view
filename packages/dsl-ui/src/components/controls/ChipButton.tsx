import React from 'react';

import { type ChipColor, CHIP_COLOR_CLASSES, DEFAULT_CHIP_COLORS } from '../../utils/chipColors.js';
import { Button } from './_Button.js';

export interface ChipButtonProps {
	active: boolean;
	color?: ChipColor;
	onClick: () => void;
	/** @slot tag:atomic */
	children: React.ReactNode;
	shape?: 'pill' | 'square';
	'aria-pressed'?: boolean;
	title?: string;
	className?: string;
}

const chipBaseClass = 'border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer';

/**
 * @registryCategory disposition
 * @registryTags chip filter toggle
 */
export function ChipButton({
	active,
	color,
	onClick,
	children,
	shape = 'pill',
	className = '',
	...rest
}: ChipButtonProps) {
	const colors = color ? CHIP_COLOR_CLASSES[color] : DEFAULT_CHIP_COLORS;
	const shapeClass = shape === 'pill' ? 'rounded-full' : 'rounded';
	const stateClasses = active ? colors.active : colors.inactive;
	return (
		<Button
			variant="ghost"
			onClick={onClick}
			className={[
				chipBaseClass,
				shapeClass,
				stateClasses,
				className,
			]
				.filter(Boolean)
				.join(' ')}
			aria-pressed={active}
			{...rest}
		>
			{children}
		</Button>
	);
}
