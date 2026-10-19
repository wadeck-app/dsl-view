import React, { useEffect } from 'react';
import { accentVariables, warnIfAccentUnsupported } from './accent.js';

export interface AccentScopeProps {
	/** The fill color of a primary button for this subtree (any CSS color). `undefined` keeps the surrounding accent. */
	color: string | undefined;
	children: React.ReactNode;
}

/**
 * Recolors the accent (`primary*` tokens) of everything inside it with `color`.
 *
 * A CSS scope like `ThemeScope`, deliberately separate from it: `ThemeScope` forces a palette (light or dark) and its
 * `tokens` take ONE value per token, so it cannot give a light and a dark variant of an accent. This one overrides only
 * the accent family and leaves the palette, backgrounds and `color-scheme` to whichever theme or `ThemeScope` is around
 * it: the light and dark values are both in the declaration (`light-dark()`) and the nearest `color-scheme` picks.
 *
 * A plain wrapper (`display: contents`, so it takes no part in layout): scopes nest with the cascade and need no
 * effect. The wrapper is always rendered, so switching `color` never remounts the children.
 *
 * Limit: what React renders in a portal (popovers, dialogs, toasts) lives outside the subtree and keeps the theme's
 * accent. For an app that needs those to follow too, use `useRootAccent`.
 *
 * Needs `light-dark()` and `color-mix()` (Chrome 123+, Safari 17.5+, Firefox 120+); warns once in development where
 * they are missing.
 */
export function AccentScope({ color, children }: AccentScopeProps): React.ReactElement {
	useEffect(() => {
		if (color !== undefined) {
			warnIfAccentUnsupported();
		}
	}, [color]);
	return (
		<div data-accent-scope={color} className="contents" style={color === undefined ? undefined : (accentVariables(color) as React.CSSProperties)}>
			{children}
		</div>
	);
}
