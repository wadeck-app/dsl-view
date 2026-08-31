import React from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { Loader2 } from 'lucide-react';

import { Tooltip } from '../overlay/Tooltip.js';

type Variant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'neutral' | 'success' | 'ghost' | 'link';
type Size = 'sm' | 'md';
type Shape = 'default' | 'stack';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	/** 'stack' arranges children in a column (icon above label) instead of a row - used by option-picker style buttons. */
	shape?: Shape;
	disabledReason?: string;
	loading?: boolean;
}

// @formatter:off
const BASE =
	'inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

const VARIANT_CLASSES: Record<Variant, string> = {
	primary:
		'bg-[var(--color-primary-solid)] text-white hover:bg-[var(--color-primary-solid-hover)] focus:ring-[var(--color-primary-solid)]',
	secondary:
		'border border-border bg-surface text-content hover:bg-bg-secondary focus:ring-border',
	danger: 'bg-danger text-white hover:bg-danger/80 focus:ring-danger',
	'danger-outline': 'border border-danger text-danger hover:bg-danger-bg focus:ring-danger',
	neutral:
		'bg-muted-bg text-content hover:bg-bg-secondary focus:ring-border',
	success: 'bg-success text-white hover:bg-success/80 focus:ring-success',
	ghost: 'text-muted hover:bg-muted-bg hover:text-content focus:ring-border',
	// Inline navigation link - no button chrome, primary color, underline on hover.
	// Use instead of className overrides for clickable identifiers (IDs, names, paths).
	link: 'text-primary hover:underline focus:ring-primary px-0 py-0 font-mono',
};

const SIZE_CLASSES: Record<Size, string> = {
	sm: 'px-3 py-1 text-xs gap-1.5',
	md: 'px-4 py-2 text-sm gap-2',
};

const SHAPE_CLASSES: Record<Shape, string> = {
	default: '',
	stack: 'flex-col gap-2',
};
// @formatter:on

// Leading underscore on the filename (guiding-principles.md §2/§29): Button is never an
// independently registrable DSL $type, only an internal React building block consumed directly
// by ButtonAction/ButtonSave/ButtonCancel/CreateTokenDialog and others. No @registryCategory
// needed - the _Button.tsx filename itself exempts it from no-missing-registry-jsdoc.
export function Button({
	variant = 'primary',
	size = 'md',
	shape = 'default',
	className = '',
	disabled,
	disabledReason,
	loading = false,
	children,
	...props
}: ButtonProps) {
	const isDisabled = disabled || loading;
	// 'stack' shape callers (option-picker style buttons) own their full color and sizing via className -
	// SIZE_CLASSES/VARIANT_CLASSES would fight with their custom padding and active/inactive color classes.
	const isStack = shape === 'stack';
	const btn = (
		// violations-suppress: react/no-raw-button Button IS the atomic wrapper - this is intentional
		<button
			{...props}
			disabled={isDisabled}
			className={[BASE, !isStack && VARIANT_CLASSES[variant], !isStack && SIZE_CLASSES[size], SHAPE_CLASSES[shape], className]
				.filter(Boolean)
				.join(' ')}
		>
			{loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
			{children}
		</button>
	);
	if (isDisabled && disabledReason) {
		return <Tooltip content={disabledReason}>{btn}</Tooltip>;
	}
	return btn;
}
