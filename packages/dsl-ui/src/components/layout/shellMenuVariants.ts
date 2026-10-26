/**
 * The side menu variants of `AppShell` (`menuVariant`). They all look the same (rows, icons, accent, hover, separators);
 * only the WIDTH of the menu differs. This file holds the allowed values, the width of the fixed ones, the limits of the
 * two that compute theirs, and the label + one-line hint a host feeds to the A/B dock (`useAbTest` `options`).
 */

export type ShellMenuVariant = 'classic' | 'narrow' | 'wide' | 'fluid' | 'fit' | 'resizable';

/** Width published in `--app-shell-menu-width` by the variants whose width is a constant. */
export const MENU_FIXED_WIDTH = {
	classic: '15rem',
	narrow: '12rem',
	wide: '19rem',
	fluid: 'clamp(12rem, 16vw, 22rem)',
} as const;

/** The reference width, and where `resizable` starts and returns to. */
export const MENU_DEFAULT_REM = 15;
/** `fit` limits, in rem. */
export const MENU_FIT_MIN_REM = 10;
export const MENU_FIT_MAX_REM = 24;
/**
 * `resizable` limits and keyboard step. The minimum is fixed; the maximum follows the window: `MENU_RESIZE_MAX_SHARE` of
 * it, and never so much that less than `MENU_RESIZE_CONTENT_MIN_REM` is left for the content (when the window is so small
 * that the maximum falls under the minimum, the minimum wins). Under `MENU_ICONS_ONLY_BELOW_REM` the menu shows icons only.
 */
export const MENU_RESIZE_MIN_REM = 3.5;
export const MENU_RESIZE_MAX_SHARE = 0.6;
export const MENU_RESIZE_CONTENT_MIN_REM = 20;
export const MENU_ICONS_ONLY_BELOW_REM = 6;
export const MENU_RESIZE_STEP_REM = 1;

/** `label` and `hint` of each variant, in the shape `useAbTest({ options })` takes (the hint is the dock's tooltip). */
export const MENU_VARIANT_AB_OPTIONS: Readonly<Record<ShellMenuVariant, { label: string; hint: string }>> = {
	classic: { label: 'Classic', hint: 'Fixed 15rem. The reference: icon and label rows, tinted current entry.' },
	narrow: { label: 'Narrow', hint: 'Fixed 12rem. Same look as classic, a tighter column; a longer label is cut, its tooltip shows all of it.' },
	wide: { label: 'Wide', hint: 'Fixed 19rem. Same look as classic, room for long labels.' },
	fluid: { label: 'Fluid', hint: 'Follows the window: 16vw, never under 12rem nor over 22rem. Same look as classic.' },
	fit: { label: 'Fit to content', hint: 'As wide as the longest entry (icon, label, padding), between 10rem and 24rem; measured again when the entries change.' },
	resizable: { label: 'Resizable', hint: 'Starts at 15rem; drag the right edge (or Left/Right, Home/End; double-click resets) from 3.5rem (icons only under 6rem) to 60% of the window, always leaving 20rem for the content. Long labels are cut. Remembered.' },
};
