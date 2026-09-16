import preset, { dslUiContent } from './tailwind-preset.js';

/**
 * Storybook's config. It consumes the published preset rather than restating the
 * colour mapping, so the stories render with exactly what a consuming app gets -
 * a second copy here is how the mapping drifted from theme.css in the first place.
 *
 * dslUiContent is spread the same way a consumer must spread it, so this config
 * exercises the documented path instead of a shortcut that only works in-repo.
 */
/** @type {import('tailwindcss').Config} */
export default {
	presets: [preset],
	content: [...dslUiContent],
};
