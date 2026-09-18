import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Tailwind preset for apps consuming dsl-ui.
 *
 *   // tailwind.config.ts
 *   import dslUiPreset, { dslUiContent } from '@wadeck-app/dsl-ui/tailwind-preset';
 *   export default {
 *     presets: [dslUiPreset],
 *     content: ['./index.html', './src/**\/*.{ts,tsx}', ...dslUiContent],
 *   };
 *
 * Spreading dslUiContent is required, not optional. Tailwind's resolveConfig does
 * not merge `content` from presets - it only reads the top-level config - so a
 * preset cannot contribute scan paths. Leave it out and Tailwind emits none of
 * dsl-ui's own classes: the build still succeeds and every dsl-ui component
 * renders unstyled.
 *
 * Pair it with the token values:
 *
 *   import '@wadeck-app/dsl-ui/theme.css';
 *
 * The preset owns the class-name-to-variable mapping and the dark-mode selector so
 * that consumers stop copying it. Copies drift: one app had mapped `content` onto
 * a --color-text variable this package never defines, and none of them mapped
 * `warning` or `bg` at all even though theme.css declares both.
 */

// Derived from this file's own location, so an app picks up dsl-ui's class names
// without knowing where npm placed the package (hoisted next to the app, or nested
// under it - both happen). This file sits at the package root, so its directory is
// the package root; resolving the package by name would need ./package.json to be
// exported, which it is not.
// Separators are normalised to forward slashes, never path.join: Tailwind scans
// content with fast-glob, which treats a backslash as an escape character rather
// than a separator, so a Windows path would match nothing.
const dslUiRoot = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/');

/**
 * Scan paths for dsl-ui's own components, to spread into the consumer's `content`.
 *
 * Derived from this file's location, so an app does not need to know where npm put
 * the package (hoisted next to the app, or nested under it - both happen).
 *
 * This cannot live on the preset: Tailwind reads `content` from the top-level
 * config only, so anything a preset declares there is discarded without a warning.
 */
export const dslUiContent = [`${dslUiRoot}/src/**/*.{ts,tsx}`];

/** @type {Partial<import('tailwindcss').Config>} */
export default {
	// Both selectors: dsl-ui's useTheme toggles a `dark` class, while consumers that
	// predate it switch on [data-theme="dark"]. theme.css matches the same pair.
	darkMode: ['variant', ['&:is(.dark *)', '&:is([data-theme="dark"] *)']],
	// Deliberately no `content` here: Tailwind would ignore it. Consumers spread
	// the exported dslUiContent into their own content array instead.
	theme: {
		extend: {
			colors: {
				primary: 'var(--color-primary)',
				'primary-solid': 'var(--color-primary-solid)',
				'primary-solid-hover': 'var(--color-primary-solid-hover)',
				'primary-light': 'var(--color-primary-light)',
				border: 'var(--color-border)',
				bg: 'var(--color-bg)',
				surface: 'var(--color-surface)',
				content: 'var(--color-content)',
				muted: 'var(--color-muted)',
				'muted-bg': 'var(--color-muted-bg)',
				'bg-secondary': 'var(--color-bg-secondary)',
				danger: 'var(--color-danger)',
				'danger-bg': 'var(--color-danger-bg)',
				'danger-text': 'var(--color-danger-text)',
				success: 'var(--color-success)',
				'success-bg': 'var(--color-success-bg)',
				'success-text': 'var(--color-success-text)',
				warning: 'var(--color-warning)',
				'warning-bg': 'var(--color-warning-bg)',
				'warning-text': 'var(--color-warning-text)',
				'info-bg': 'var(--color-info-bg)',
				'info-text': 'var(--color-info-text)',
				// Named hues, for things whose colour carries the meaning: a tag's identity, an HTTP
				// method, a status class. These replace `text-blue-600 dark:text-blue-400` pairs, which
				// could not be nested inside a ThemeScope - a dark: variant applies under ANY .dark
				// ancestor, so it ignored a scope that re-asserted light.
				'hue-blue': 'var(--color-hue-blue-text)',
				'hue-blue-bg': 'var(--color-hue-blue-bg)',
				'hue-green': 'var(--color-hue-green-text)',
				'hue-green-bg': 'var(--color-hue-green-bg)',
				'hue-yellow': 'var(--color-hue-yellow-text)',
				'hue-yellow-bg': 'var(--color-hue-yellow-bg)',
				'hue-orange': 'var(--color-hue-orange-text)',
				'hue-orange-bg': 'var(--color-hue-orange-bg)',
				'hue-red': 'var(--color-hue-red-text)',
				'hue-red-bg': 'var(--color-hue-red-bg)',
				'hue-purple': 'var(--color-hue-purple-text)',
				'hue-purple-bg': 'var(--color-hue-purple-bg)',
				'hue-cyan': 'var(--color-hue-cyan-text)',
				'hue-cyan-bg': 'var(--color-hue-cyan-bg)',
			},
		},
	},
	safelist: [
		// ColorPicker swatches
		'bg-blue-500', 'bg-violet-500', 'bg-orange-500',
		'bg-green-500', 'bg-rose-500', 'bg-teal-500',
	],
};
