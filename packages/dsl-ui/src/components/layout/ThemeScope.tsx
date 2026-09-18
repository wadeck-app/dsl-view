import React from 'react';

export interface ThemeScopeProps {
	/** Which palette this subtree is painted in, regardless of the app theme around it. */
	theme: 'light' | 'dark';
	/**
	 * What background the scope paints, so the subtree cannot end up with this theme's text colour
	 * on the surrounding theme's background.
	 *
	 * 'page' (default) is the page background, for a full region. 'panel' is a raised surface.
	 * 'none' leaves it to the caller, for a scope that only carries an explicit `tokens` palette.
	 */
	surface?: 'page' | 'panel' | 'none';
	/**
	 * Arbitrary token overrides for a palette that is neither light nor dark - a terminal, a code
	 * viewer, a brand surface. Written as CSS custom properties, e.g.
	 * `{ '--color-bg': '#111827', '--color-content': '#e5e7eb' }`.
	 *
	 * Keep the values STABLE. Changing a custom property invalidates computed style for the whole
	 * subtree, so a palette rebuilt with different values on every render restyles every descendant
	 * every time. Rebuilding an EQUAL object is fine: React diffs style property by property and
	 * writes nothing when the values match.
	 */
	tokens?: Record<string, string>;
	className?: string;
	children: React.ReactNode;
}

// @formatter:off
const SURFACE_CLS: Record<NonNullable<ThemeScopeProps['surface']>, string> = {
	page:  'bg-bg text-content',
	panel: 'bg-surface text-content',
	none:  '',
};
// @formatter:on

/**
 * Paints a subtree in a chosen theme, palette and UA colour-scheme together.
 *
 * This is a CSS scope, NOT a React context, and that is the point: it works by the cascade, so a
 * component inside needs to know nothing and opt into nothing. Anything resolving a `--color-*`
 * token is correct automatically, including markup this library has never heard of. A context would
 * require every component to read it and apply classes itself - which is the same as putting a
 * `theme` prop on all of them.
 *
 * It also reaches what React cannot: `color-scheme` is what makes the browser paint scrollbars,
 * native select dropdowns, checkboxes and number spinners in the matching palette. Set the tokens
 * without it and a dark panel in a light app gets a white scrollbar down the middle of it.
 *
 * The palette and `color-scheme` are carried by the SAME class (see theme.css), so the two cannot
 * drift apart - which is the whole reason this is a component and not a pair of utilities.
 *
 * Nests to any depth. Custom properties inherit, so a descendant takes its value from the NEAREST
 * scope above it: light inside dark inside light behaves as written.
 *
 * KNOWN LIMITATION: a handful of dsl-ui components still style themselves with Tailwind `dark:`
 * variants rather than tokens - chipColors (so ChipButton), Skeleton, HttpMethodBadge,
 * HttpStatusBadge, ColorPicker. Those variants key off ANY `.dark` ancestor, so inside a light scope
 * nested in a dark app they keep their dark styling. CSS cannot express "nearest ancestor wins" for
 * a variant selector, so the fix is those components using tokens; it is not something this
 * component can paper over.
 *
 * @registryCategory disposition
 * @registryTags theme scope palette dark light surface
 */
export function ThemeScope({
	theme,
	surface = 'page',
	tokens,
	className = '',
	children,
}: ThemeScopeProps): React.ReactElement {
	return (
		<div
			// The theme class carries both the --color-* palette and color-scheme, from theme.css.
			className={`${theme} ${SURFACE_CLS[surface]} ${className}`.trim().replace(/\s+/g, ' ')}
			style={tokens}
			data-theme-scope={theme}
		>
			{children}
		</div>
	);
}
