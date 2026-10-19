import { isDev } from '../dev/isDev.js';

/** The accent family of the theme (theme.css defines them per theme: `:root` / `.light` for light, `.dark` for dark). */
export const ACCENT_VARIABLES = ['--color-primary', '--color-primary-solid', '--color-primary-solid-hover', '--color-primary-light'] as const;
export type AccentVariable = (typeof ACCENT_VARIABLES)[number];
export type AccentVariables = Record<AccentVariable, string>;

/**
 * The accent variables derived from ONE color (`solid`, the fill of a primary button). Pure: no DOM, no state.
 *
 * It overrides only the accent family, never backgrounds or text colors. Light and dark values live in the same
 * declaration through `light-dark()`, which picks by the `color-scheme` that theme.css sets per theme (`light` on
 * `:root`/`.light`, `dark` on `.dark`) - so it follows the nearest `ThemeScope` too, with no theme-specific rule, no
 * stylesheet-order or specificity concern, and no `dark:` variant.
 *
 * Needs `light-dark()` and `color-mix()` (Chrome 123+, Safari 17.5+, Firefox 120+). See `warnIfAccentUnsupported`.
 */
export function accentVariables(solid: string): AccentVariables {
	const mix = (pct: number, other: string): string => `color-mix(in srgb, ${solid} ${pct}%, ${other})`;
	const lightDark = (light: string, dark: string): string => `light-dark(${light}, ${dark})`;
	return {
		// Text and icons in the accent: the color itself on light, a lighter tint on dark for contrast.
		'--color-primary': lightDark(solid, mix(60, 'white')),
		'--color-primary-solid': solid,
		'--color-primary-solid-hover': mix(85, 'black'),
		// Tinted background: almost white on light, a deep tint on dark.
		'--color-primary-light': lightDark(mix(10, 'white'), mix(28, '#0b1120')),
	};
}

let warnedUnsupported = false;

/**
 * Development only, once per page load: warns when the browser cannot evaluate the accent declarations, in which case
 * the browser drops them and the theme's own accent stays, with no other sign of it. Does nothing where support cannot
 * be detected (no `CSS.supports`, e.g. jsdom): absence of the API is not evidence of a missing feature.
 */
export function warnIfAccentUnsupported(): void {
	if (warnedUnsupported || !isDev()) {
		return;
	}
	if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
		return;
	}
	const supported = CSS.supports('color', 'light-dark(red, blue)') && CSS.supports('color', 'color-mix(in srgb, red 50%, white)');
	if (supported) {
		return;
	}
	warnedUnsupported = true;
	console.warn('[accent] this browser does not support light-dark() and color-mix() (Chrome 123+, Safari 17.5+, Firefox 120+): the accent color is ignored and the theme accent is kept.');
}
