import React from 'react';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

import { Button } from './_Button.js';

export interface ButtonActionProps {
	label: string;
	variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'success';
	/**
	 * Leading icon. Dropped while `loading`, where the spinner occupies that slot.
	 *
	 * Without this a caller needing an icon had to hand-roll the whole button, since the
	 * base Button is internal - and the copy then carried its own padding and font size,
	 * which is how a row of actions ended up with buttons of three different heights.
	 */
	icon?: React.ReactNode;
	/** Geometry belongs to the design system; callers pick a size, never a padding. */
	size?: 'xs' | 'sm' | 'md';
	/**
	 * The accessible name when it must say more than the visible `label`: repeated row actions ("Allow <command>"). Named `ariaLabel`
	 * because the entries generator skips `aria-*` props, so the DOM spelling would be unreachable from a DSL page.
	 */
	ariaLabel?: string;
	onClick?: () => void;
	disabled?: boolean;
	disabledReason?: string;
	loading?: boolean;
	type?: 'button' | 'submit';
	/**
	 * Id of the <form> this button submits (HTML `form` attribute), for a button that sits outside it, such as the footer of a
	 * Dialog. Only meaningful with `type="submit"`: with the default `type="button"` it does nothing, and says so in the console.
	 */
	form?: string;
}

/**
 * @registryCategory atomic
 * @registryTags button action
 */
export function ButtonAction({ label, variant = 'primary', icon, size, onClick, disabled, disabledReason, loading, type = 'button', form, ariaLabel }: ButtonActionProps) {
	if (form !== undefined && type !== 'submit') {
		reportAuthoringMistake(`[ButtonAction] "${label}" has form="${form}" but type="${type}": only a submit button submits a form. Set type="submit".`);
	}
	return (
		<Button
			variant={variant}
			size={size}
			onClick={onClick}
			disabled={disabled}
			disabledReason={disabledReason}
			loading={loading}
			type={type}
			form={form}
			aria-label={ariaLabel}
		>
			{icon && !loading && icon}
			{label}
		</Button>
	);
}
