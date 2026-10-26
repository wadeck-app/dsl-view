/**
 * The side menu variants of `AppShell` (`menuVariant`): the allowed values, the width each publishes in
 * `--app-shell-menu-width`, and the label + one-line hint a host feeds to the A/B dock (`useAbTest` `options`).
 */

export type ShellMenuVariant = 'classic' | 'slim' | 'cards' | 'tiles' | 'flyout' | 'floating' | 'tree' | 'peek';

/** Width of the menu column by variant (`peek`: its open width, see `MENU_WIDTH_PEEK_FOLDED`). `floating` includes its 0.75rem margin on each side. */
export const MENU_VARIANT_WIDTH: Readonly<Record<ShellMenuVariant, string>> = {
	classic: '15rem',
	slim: '13rem',
	cards: '18rem',
	tiles: '5rem',
	flyout: '3.5rem',
	floating: '15.5rem',
	tree: '14rem',
	peek: '15rem',
};

/** Width of the `peek` variant once folded: a sliver with a grab handle. */
export const MENU_WIDTH_PEEK_FOLDED = '1rem';

/** `label` and `hint` of each variant, in the shape `useAbTest({ options })` takes (the hint is the dock's tooltip). */
export const MENU_VARIANT_AB_OPTIONS: Readonly<Record<ShellMenuVariant, { label: string; hint: string }>> = {
	classic: { label: 'Classic', hint: '15rem list with icon and label, tinted current entry. The reference.' },
	slim: { label: 'Slim', hint: '13rem, text rows without icons, soft hover tint, accent line on the right edge for the current one.' },
	cards: { label: 'Wide cards', hint: '18rem, one rounded card per entry with icon, label and an optional description, lifts on hover.' },
	tiles: { label: 'Icon + label', hint: '5rem launcher column, icon above a small label, the current one is a filled accent tile.' },
	flyout: { label: 'Rail + flyout', hint: '3.5rem icon rail, the label flies out to the right on hover or focus, accent dot on the current one.' },
	floating: { label: 'Floating panel', hint: '14rem rounded panel detached from the edges with a soft shadow, pill entries, captions for groups.' },
	tree: { label: 'Tree lines', hint: '14rem timeline: a guide line with a node per entry, the current node filled, groups as titles.' },
	peek: { label: 'Fold + peek', hint: '15rem, folds (button or [ key, remembered) to a 1rem sliver whose handle peeks the menu on hover.' },
};
