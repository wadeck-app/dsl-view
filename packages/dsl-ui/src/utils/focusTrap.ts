// Disabled controls and hidden inputs cannot take focus: counting them as the first or last stop makes the Tab
// wrap miss (focus then leaves the modal) and leaves the initial focus on <body> when the first control is disabled.
export const FOCUSABLE_SELECTOR = [
	'button:not([disabled])',
	'[href]',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

// Focus that sits inside another overlay layer is not "lost": a field inside a modal can open a portaled list
// (autocomplete, select, menu) that lives outside the modal's DOM subtree but belongs to it. Pulling focus back
// from there would break the field, so the trap only acts for focus that is on <body> or in plain page content.
const OTHER_LAYER_SELECTOR = [
	'[role="listbox"]',
	'[role="menu"]',
	'[role="tooltip"]',
	'[role="dialog"]',
	'[data-radix-popper-content-wrapper]',
].join(', ');

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Moves focus to the first focusable element of a modal container, or to the container itself when it has none
 * (the container must carry tabindex="-1" for that to work).
 */
export function focusFirstIn(container: HTMLElement): void {
	(getFocusableElements(container)[0] ?? container).focus();
}

/**
 * Keeps Tab and Shift+Tab inside a modal container. Call it from the keydown handler while the modal is open.
 * Returns true when it moved focus itself (and cancelled the key), false when the browser must handle the key.
 *
 * - focus on the last (first, with Shift) control wraps around;
 * - focus outside the container (on <body> or in the page behind the modal) is pulled back inside;
 * - focus inside another overlay layer is left alone;
 * - a modal with nothing focusable keeps focus on the container instead of letting Tab leave it.
 */
export function trapTab(container: HTMLElement, event: KeyboardEvent): boolean {
	const focusable = getFocusableElements(container);
	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	const active = document.activeElement;

	if (!first || !last) {
		event.preventDefault();
		container.focus();
		return true;
	}

	const inside = active !== null && container.contains(active);
	if (!inside && active instanceof Element && active !== document.body && active.closest(OTHER_LAYER_SELECTOR)) {
		return false;
	}

	const leavesBackward = event.shiftKey && (!inside || active === first || active === container);
	const leavesForward = !event.shiftKey && (!inside || active === last);
	if (leavesBackward) {
		event.preventDefault();
		last.focus();
		return true;
	}
	if (leavesForward) {
		event.preventDefault();
		first.focus();
		return true;
	}
	return false;
}
