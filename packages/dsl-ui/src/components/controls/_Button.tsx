import React from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { Loader2 } from 'lucide-react';

import { Tooltip } from '../overlay/Tooltip.js';
import { useButtonContext } from './buttonContext.js';

type Variant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'neutral' | 'success' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'icon' | 'icon-field' | 'icon-sm' | 'icon-xs';
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

// Every variant carries `border`, transparent where the design has no visible outline.
// Variants pick colour, never geometry: secondary and danger-outline used to be the only
// ones with a border, which made them 2px taller than primary/danger/neutral/success at
// the same size. In a row of actions that reads as buttons of three different heights.
const VARIANT_CLASSES: Record<Variant, string> = {
	primary:
		'border border-transparent bg-[var(--color-primary-solid)] text-white hover:bg-[var(--color-primary-solid-hover)] focus:ring-[var(--color-primary-solid)]',
	secondary:
		'border border-border bg-surface text-content hover:bg-bg-secondary focus:ring-border',
	danger: 'border border-transparent bg-danger text-white hover:bg-danger/80 focus:ring-danger',
	'danger-outline': 'border border-danger text-danger hover:bg-danger-bg focus:ring-danger',
	neutral:
		'border border-transparent bg-muted-bg text-content hover:bg-bg-secondary focus:ring-border',
	success: 'border border-transparent bg-success text-white hover:bg-success/80 focus:ring-success',
	ghost: 'border border-transparent text-muted hover:bg-muted-bg hover:text-content focus:ring-border',
	// Deliberately excluded: `link` is text, not a box, so it drops padding and border.
	link: 'text-primary hover:underline focus:ring-primary px-0 py-0',
};

const SIZE_CLASSES: Record<Size, string> = {
	sm: 'px-3 py-1 text-xs gap-1.5',
	md: 'px-4 py-2 text-sm gap-2',
	icon: 'h-9 w-9 p-0',
	// 2.375rem is 38px: the height a Field* control renders at (py-2 + text-sm line + border).
	// A trailing icon button beside a field has to match it, and none of the other icon sizes did.
	'icon-field': 'h-[2.375rem] w-[2.375rem] p-0',
	'icon-sm': 'h-7 w-7 p-0',
	'icon-xs': 'h-5 w-5 p-0',
};

const SHAPE_CLASSES: Record<Shape, string> = {
	default: '',
	stack: 'flex-col gap-2',
};
// @formatter:on

/**
 * The class string for a button of this variant and size.
 *
 * Exported so a control that must render as a different element - an anchor, for a
 * navigation that reads as a button - gets the same geometry by construction rather than by
 * a copy that drifts. Consumers restating these classes is how one app ended up with 19
 * distinct button sizings.
 */
export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className = ''): string {
	return [BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className].filter(Boolean).join(' ');
}

// Leading underscore on the filename (guiding-principles.md §2/§29): Button is never an
// independently registrable DSL $type, only an internal React building block consumed directly
// by ButtonAction/ButtonSave/ButtonCancel/CreateTokenDialog and others. No @registryCategory
// needed - the _Button.tsx filename itself exempts it from no-missing-registry-jsdoc.
export function Button({
	variant,
	size,
	shape = 'default',
	className = '',
	disabled,
	disabledReason,
	loading = false,
	children,
	...props
}: ButtonProps) {
	const { size: ctxSize, defaultVariant: ctxVariant } = useButtonContext();
	// Explicit prop wins, then the context default, then the hardcoded fallback.
	const resolvedVariant = variant ?? ctxVariant ?? 'primary';
	const resolvedSize = size ?? ctxSize ?? 'md';
	const isDisabled = disabled || loading;
	// 'stack' shape callers (option-picker style buttons) own their full color and sizing via className -
	// SIZE_CLASSES/VARIANT_CLASSES would fight with their custom padding and active/inactive color classes.
	const isStack = shape === 'stack';
	const btn = (
		// violations-suppress: react/no-raw-button Button IS the atomic wrapper - this is intentional
		<button
			{...props}
			disabled={isDisabled}
			className={[BASE, !isStack && VARIANT_CLASSES[resolvedVariant], !isStack && SIZE_CLASSES[resolvedSize], SHAPE_CLASSES[shape], className]
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
