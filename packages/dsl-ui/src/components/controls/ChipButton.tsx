import React from 'react';

import { type ChipColor, CHIP_COLOR_CLASSES, DEFAULT_CHIP_COLORS } from '@dsl-ui/utils/chipColors.js';
import { Button } from './_Button.js';

export interface ChipButtonProps {
	active: boolean;
	color?: ChipColor;
	onClick: () => void;
	/** @slot tag:atomic */
	children: React.ReactNode;
	shape?: 'pill' | 'square';
	/**
	 * How loudly the active state is drawn.
	 *
	 * 'subtle' (default) is the palette-tinted fill every existing chip uses, which suits a small
	 * set of filters where the label already carries the meaning.
	 *
	 * 'strong' fills with the primary colour, for a grid where the selection IS the content and has
	 * to be readable at a glance. The subtle active fill is `bg-gray-100`, which against a white
	 * surface is almost indistinguishable from unselected - fine for three filters, useless for
	 * picking hours out of twenty-four.
	 */
	emphasis?: 'subtle' | 'strong';
	'aria-pressed'?: boolean;
	'aria-label'?: string;
	title?: string;
	className?: string;
}

const chipBaseClass = 'border px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer';

// Reuses the same token as the primary button, so a selected chip and a primary action cannot
// drift to different blues.
const STRONG_ACTIVE = 'border-transparent bg-[var(--color-primary-solid)] text-white hover:bg-[var(--color-primary-solid-hover)]';

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
	emphasis = 'subtle',
	className = '',
	...rest
}: ChipButtonProps) {
	// Guard: unknown color keys (e.g. 'gray') fall back to default palette
	const colors = (color && CHIP_COLOR_CLASSES[color]) ? CHIP_COLOR_CLASSES[color] : DEFAULT_CHIP_COLORS;
	const shapeClass = shape === 'pill' ? 'rounded-full' : 'rounded';
	// An explicit `color` still wins when strong is asked for: a caller that named a palette meant
	// that palette. Strong only replaces the default tint.
	const strongActive = emphasis === 'strong' && !color;
	const stateClasses = active
		? (strongActive ? STRONG_ACTIVE : colors.active)
		: colors.inactive;
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
