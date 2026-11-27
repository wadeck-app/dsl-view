import { createContext, useContext, useMemo } from 'react';

import type { ButtonProps } from './_Button.js';

export interface ButtonContextValue {
	size?: ButtonProps['size'];
	defaultVariant?: ButtonProps['variant'];
	/**
	 * The container owns the size of its buttons: a button's own `size` no longer wins (it is brought back to `size` and reported
	 * once). A container that sets this is ActionBar, CardActions, DialogFooter, NavBar, TableRowActions. A bare provider leaves it
	 * unset: the explicit size wins, as before.
	 */
	lockSize?: boolean;
	/** Name of the container, for the message that tells an author a size was ignored. */
	owner?: string;
}

export const ButtonContext = createContext<ButtonContextValue | null>(null);

// For containers: reads parent context, merges own values, returns merged value for Provider.
// Destructured deps keep useMemo stable without JSON.stringify.
export function useProvideButtonContext(own: ButtonContextValue): ButtonContextValue {
	const parent = useContext(ButtonContext);
	const { size, defaultVariant, lockSize, owner } = own;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => ({ ...parent, ...own }), [parent, size, defaultVariant, lockSize, owner]);
}

// For consumers (_Button, wrappers): returns current merged context or empty object.
export function useButtonContext(): ButtonContextValue {
	return useContext(ButtonContext) ?? {};
}

const ICON_SIZE_FOR: Record<string, NonNullable<ButtonProps['size']>> = { xs: 'icon-xs', sm: 'icon-sm', md: 'icon' };
const ICON_SIZES = new Set(['icon', 'icon-field', 'icon-sm', 'icon-xs']);

/**
 * The size an icon button gets from a container that owns the size: the icon-scale counterpart of the container's text size
 * (sm -> icon-sm). Undefined when the context locks nothing.
 */
export function lockedIconSize(ctx: ButtonContextValue): ButtonProps['size'] | undefined {
	return ctx.lockSize && ctx.size ? (ICON_SIZE_FOR[ctx.size] ?? ctx.size) : undefined;
}

/**
 * Applies a container's size to a button that may ask for another one. Returns the size to use and, when it differs from what the
 * button asked, the message to report. `none` (a component that owns its geometry) and an unlocked context are left alone.
 */
export function resolveLockedSize(requested: ButtonProps['size'], ctx: ButtonContextValue): { size: ButtonProps['size']; mismatch?: string } {
	if (!ctx.lockSize || !ctx.size || requested === undefined || requested === 'none') {
		return { size: requested };
	}
	const locked = ICON_SIZES.has(requested) ? lockedIconSize(ctx) : ctx.size;
	if (locked === requested) {
		return { size: requested };
	}
	return {
		size: locked,
		mismatch: `size "${requested}" is ignored inside ${ctx.owner ?? 'its container'}, which sets "${ctx.size}" for every button: remove the size so the buttons stay on one scale.`,
	};
}
