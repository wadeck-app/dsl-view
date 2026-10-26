/**
 * CSS custom properties of the `AppShell` frame. The shell declares them on its own root (so the first paint has them)
 * and publishes them on the document root while mounted (so tools mounted outside the shell, such as the A/B dock, can
 * read them: a custom property only inherits downwards). They are removed when the last shell unmounts.
 */

/** Width of the side menu. */
export const APP_SHELL_MENU_WIDTH_VAR = '--app-shell-menu-width';
/** Width of the classic side menu (Tailwind `w-60`), also of the `toggle` and `accent` variants when open. */
export const APP_SHELL_MENU_WIDTH = '15rem';
/** Width of the `compact` variant. */
export const APP_SHELL_MENU_WIDTH_COMPACT = '11rem';
/** Width of the `rail` variant, and of the `toggle` variant when folded. */
export const APP_SHELL_MENU_WIDTH_RAIL = '3.5rem';
/** `drawer`: no permanent column. */
export const APP_SHELL_MENU_WIDTH_NONE = '0px';

/** Height of the sticky top bar. The side menu sticks below it, and so should anything else sticky in the page. */
export const APP_SHELL_BAR_HEIGHT_VAR = '--app-shell-bar-height';
/** Fixed height of the top bar (Tailwind `h-11`). */
export const APP_SHELL_BAR_HEIGHT = '2.75rem';
