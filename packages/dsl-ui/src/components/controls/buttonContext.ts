import { createContext, useContext, useMemo } from 'react';

import type { ButtonProps } from './_Button.js';

export interface ButtonContextValue {
	size?: ButtonProps['size'];
	defaultVariant?: ButtonProps['variant'];
}

export const ButtonContext = createContext<ButtonContextValue | null>(null);

// For containers: reads parent context, merges own values, returns merged value for Provider.
// Destructured deps keep useMemo stable without JSON.stringify.
export function useProvideButtonContext(own: ButtonContextValue): ButtonContextValue {
	const parent = useContext(ButtonContext);
	const { size, defaultVariant } = own;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => ({ ...parent, ...own }), [parent, size, defaultVariant]);
}

// For consumers (_Button, wrappers): returns current merged context or empty object.
export function useButtonContext(): ButtonContextValue {
	return useContext(ButtonContext) ?? {};
}
