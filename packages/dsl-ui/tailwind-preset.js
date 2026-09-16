import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Tailwind preset for apps consuming dsl-ui.
 *
 *   // tailwind.config.ts
 *   import dslUiPreset from '@wadeck-app/dsl-ui/tailwind-preset';
 *   export default {
 *     presets: [dslUiPreset],
 *     content: ['./index.html', './src/**\/*.{ts,tsx}'],
 *   };
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
const dslUiRoot = dirname(fileURLToPath(import.meta.url));

/** @type {Partial<import('tailwindcss').Config>} */
export default {
	// Both selectors: dsl-ui's useTheme toggles a `dark` class, while consumers that
	// predate it switch on [data-theme="dark"]. theme.css matches the same pair.
	darkMode: ['variant', ['&:is(.dark *)', '&:is([data-theme="dark"] *)']],
	content: [join(dslUiRoot, 'src/**/*.{ts,tsx}')],
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
			},
		},
	},
	safelist: [
		// ColorPicker swatches
		'bg-blue-500', 'bg-violet-500', 'bg-orange-500',
		'bg-green-500', 'bg-rose-500', 'bg-teal-500',
	],
};
