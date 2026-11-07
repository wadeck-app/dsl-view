import React, { useEffect } from 'react';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import type { ShellItem } from './AppShell.js';

/**
 * The figure to show for `ShellItem.badge`, or `undefined` for none. Only a non-negative safe integer counts (`0`
 * included). `undefined` and `null` mean "no badge" and are not a mistake; anything else that is not such an integer (a
 * string, `NaN`, `Infinity`, a negative or fractional number) is an authoring mistake, reported by {@link ShellBadge}.
 */
export function shellBadgeCount(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

/** The text of an item's tooltip when it has a badge: "Jobs (3)". Without a valid badge, the label alone. */
export function labelWithBadge(item: Pick<ShellItem, 'label' | 'badge'>): string {
	const count = shellBadgeCount(item.badge);
	return count === undefined ? item.label : `${item.label} (${count})`;
}

// Neutral by default; `ring-inset` draws the edge inside the pill so that it still reads over a hovered row (same
// `muted-bg`) and over the current row (`primary-light`). Never shrinks, never wraps: the label next to it is what gives.
const PILL = 'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-1.5 text-xs font-medium leading-4 tabular-nums ring-1 ring-inset';
const PILL_OTHER = 'bg-muted-bg text-muted ring-border';
const PILL_CURRENT = 'bg-primary-light text-primary ring-primary/30';

/**
 * The count of a menu entry or tab.
 *
 * - `pill`: a visually hidden ", " and a small rounded figure after the label, so the link reads "Label, 3". The figure is
 *   not `aria-hidden`: it carries the number, so it is announced once. (Chrome's computed name has a space before the
 *   comma, "Label , 3", because the label and the hidden text are separate flex items; it is read the same.)
 * - `text`: the text ", 3" alone, to append to the visually hidden label of a link that shows an icon only.
 *
 * Renders nothing when the value is not a valid count; a value that is neither absent nor valid is reported once in
 * development.
 */
export function ShellBadge({ item, variant = 'pill', current = false, className = '' }: { item: { id: string; label: string; badge?: unknown }; variant?: 'pill' | 'text'; current?: boolean; className?: string }): React.ReactElement | null {
	const count = shellBadgeCount(item.badge);
	const odd = count === undefined && item.badge !== undefined && item.badge !== null;
	const badge = item.badge;
	useEffect(() => {
		if (odd) {
			const received = typeof badge === 'number' ? String(badge) : typeof badge === 'string' ? `the string "${badge}"` : `a value of type ${typeof badge}`;
			reportAuthoringMistake(`[AppShell] The badge of "${item.label}" (id "${item.id}") must be a non-negative whole number (0 is shown), received ${received}. No badge is shown for it.`);
		}
	}, [odd, badge, item.id, item.label]);
	if (count === undefined) {
		return null;
	}
	if (variant === 'text') {
		return <>{`, ${count}`}</>;
	}
	return (
		<>
			<span className="sr-only">, </span>
			<span data-menu-badge="" className={`${PILL} ${current ? PILL_CURRENT : PILL_OTHER} ${className}`}>
				{count}
			</span>
		</>
	);
}
