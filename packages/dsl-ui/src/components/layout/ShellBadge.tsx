import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import type { ShellBadgeIcon, ShellBadgeTone, ShellItem } from './AppShell.js';

// `process` is not typed in this package and is replaced statically by every bundler (and defined by Node).
declare const process: { env: { NODE_ENV?: string } };

/**
 * The figure to show for `ShellItem.badge`, or `undefined` for none. Only a non-negative safe integer counts (`0`
 * included). Anything else (a string, `NaN`, `Infinity`, a negative or fractional number) gives `undefined`.
 */
export function shellBadgeCount(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

const TONES: readonly ShellBadgeTone[] = ['neutral', 'info', 'success', 'warning', 'danger'];
const ICONS: readonly ShellBadgeIcon[] = ['info', 'success', 'warning', 'error'];
const KEYS = ['count', 'tone', 'icon', 'label'];
// The default tone of an icon, and the text read (and shown as a tooltip) when the author gave no label.
const ICON_TONE: Record<ShellBadgeIcon, ShellBadgeTone> = { info: 'info', success: 'success', warning: 'warning', error: 'danger' };
const ICON_LABEL: Record<ShellBadgeIcon, string> = { info: 'Information', success: 'OK', warning: 'Warning', error: 'Error' };
const ICON_COMPONENT: Record<ShellBadgeIcon, typeof Info> = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle };

/** A badge as it is drawn: every field checked, the tone and the text decided. */
export interface ResolvedShellBadge {
	count: number | undefined;
	tone: ShellBadgeTone;
	icon: ShellBadgeIcon | undefined;
	label: string | undefined;
	/** What assistive technology reads after the item's label, and the tooltip: the label, else the icon's default label, else the count. */
	text: string;
}

/** One thing wrong in a badge, kept as data: the message is written where it is reported, so it stays out of a production bundle. */
export type BadgeProblem = { kind: 'value' | 'count' | 'tone' | 'icon' | 'label' | 'key' | 'empty'; received: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const present = (value: unknown): boolean => value !== undefined && value !== null;

function receivedText(value: unknown): string {
	if (typeof value === 'number') {
		return String(value);
	}
	if (typeof value === 'string') {
		return `the string "${value}"`;
	}
	return Array.isArray(value) ? 'an array' : `a value of type ${typeof value}`;
}

/**
 * Reads `ShellItem.badge` without reporting anything (it also runs where only the width is needed). `badge` is `undefined`
 * when there is nothing to draw; `problems` lists every mistake (an absent or `null` badge, or `null` field, is not one).
 * A bad `tone` falls back to the default tone (the icon's, else neutral): the count or the icon is still worth showing and
 * the mistake is only about its colour. A bad `count`, `icon` or `label` is dropped on its own.
 */
export function resolveShellBadge(value: unknown): { badge: ResolvedShellBadge | undefined; problems: BadgeProblem[] } {
	if (!present(value)) {
		return { badge: undefined, problems: [] };
	}
	if (typeof value === 'number') {
		const count = shellBadgeCount(value);
		return count === undefined ? { badge: undefined, problems: [{ kind: 'value', received: receivedText(value) }] } : { badge: { count, tone: 'neutral', icon: undefined, label: undefined, text: String(count) }, problems: [] };
	}
	if (!isRecord(value)) {
		return { badge: undefined, problems: [{ kind: 'value', received: receivedText(value) }] };
	}
	const problems: BadgeProblem[] = [];
	for (const key of Object.keys(value)) {
		if (!KEYS.includes(key)) {
			problems.push({ kind: 'key', received: key });
		}
	}
	let count: number | undefined;
	if (present(value['count'])) {
		count = shellBadgeCount(value['count']);
		if (count === undefined) {
			problems.push({ kind: 'count', received: receivedText(value['count']) });
		}
	}
	let icon: ShellBadgeIcon | undefined;
	if (present(value['icon'])) {
		icon = ICONS.find((candidate) => candidate === value['icon']);
		if (icon === undefined) {
			problems.push({ kind: 'icon', received: receivedText(value['icon']) });
		}
	}
	let tone: ShellBadgeTone | undefined;
	if (present(value['tone'])) {
		tone = TONES.find((candidate) => candidate === value['tone']);
		if (tone === undefined) {
			problems.push({ kind: 'tone', received: receivedText(value['tone']) });
		}
	}
	let label: string | undefined;
	if (present(value['label'])) {
		if (typeof value['label'] === 'string' && value['label'].trim() !== '') {
			label = value['label'];
		} else {
			problems.push({ kind: 'label', received: receivedText(value['label']) });
		}
	}
	if (count === undefined && icon === undefined) {
		problems.push({ kind: 'empty', received: '' });
		return { badge: undefined, problems };
	}
	const text = label ?? (icon === undefined ? String(count) : ICON_LABEL[icon]);
	return { badge: { count, tone: tone ?? (icon === undefined ? 'neutral' : ICON_TONE[icon]), icon, label, text }, problems };
}

/** The text of an item's tooltip when it has a badge: "Jobs (3)", "Jobs (3 failures)". Without a badge to show, the label alone. */
export function labelWithBadge(item: Pick<ShellItem, 'label' | 'badge'>): string {
	const { badge } = resolveShellBadge(item.badge);
	return badge === undefined ? item.label : `${item.label} (${badge.text})`;
}

/**
 * What a measured width depends on for a badge: nothing, the count (its digits set the width) or an icon (all the same
 * size). The tone and the label do not change the width.
 */
export function shellBadgeFitKey(value: unknown): string {
	const { badge } = resolveShellBadge(value);
	return badge === undefined ? '' : badge.icon === undefined ? String(badge.count) : 'icon';
}

// The sentences are written here and reached only from the development-guarded report in `ItemBadge`.
function describeProblems(label: string, id: string, problems: readonly BadgeProblem[]): string {
	const item = `The badge of "${label}" (id "${id}")`;
	const first = problems[0];
	if (problems.length === 1 && first?.kind === 'value') {
		return `[AppShell] ${item} must be a non-negative whole number (0 is shown) or an object { count?, tone?, icon?, label? }, received ${first.received}. No badge is shown for it.`;
	}
	const parts = problems.map(({ kind, received }) => {
		switch (kind) {
			case 'count':
				return `count must be a non-negative whole number, received ${received} (no count is shown)`;
			case 'tone':
				return `tone must be one of ${TONES.join(', ')}, received ${received} (the default tone is used instead)`;
			case 'icon':
				return `icon must be one of ${ICONS.join(', ')}, received ${received} (no icon is shown)`;
			case 'label':
				return `label must be a non-empty text, received ${received} (it is ignored)`;
			case 'key':
				return `"${received}" is not a badge key (allowed: ${KEYS.join(', ')}; it is ignored)`;
			case 'empty':
				return 'it has no valid count and no icon, so there is nothing to show (no badge is drawn)';
			case 'value':
				return `it must be a number or an object, received ${received}`;
		}
	});
	return `[AppShell] ${item} is not usable as written: ${parts.join('; ')}.`;
}

// Neutral by default; `ring-inset` draws the edge inside the pill so that it still reads over a hovered row (same
// `muted-bg`). Never shrinks, never wraps: the label next to it is what gives.
const PILL = 'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-1.5 text-xs font-medium leading-4 tabular-nums ring-1 ring-inset';
// Whole class names, written out: Tailwind reads source text. The toned edge is the ink at 30%: on the current row
// (`muted-bg`) the light tints are 1.00 to 1.06:1 against it, so the edge is what keeps the pill from vanishing.
const PILL_TONE: Record<ShellBadgeTone, string> = {
	neutral: 'bg-muted-bg text-muted ring-border',
	info: 'bg-info-bg text-info-text ring-info-text/30',
	success: 'bg-success-bg text-success-text ring-success-text/30',
	warning: 'bg-warning-bg text-warning-text ring-warning-text/30',
	danger: 'bg-danger-bg text-danger-text ring-danger-text/30',
};
// The current entry is `muted-bg` too (rail look), so a neutral pill is on the `surface`: a fill that differs from the
// entry (1.1:1 light, 1.4:1 dark), the content ink on it (14.6:1 light, 13.4:1 dark) and the border edge. The accent
// belongs to the bar, not to the pill.
const PILL_NEUTRAL_CURRENT = 'bg-surface text-content ring-border';
const ICON_BOX = 'inline-flex shrink-0 items-center';
const ICON_TONE_CLASS: Record<ShellBadgeTone, string> = {
	neutral: 'text-muted',
	info: 'text-info-text',
	success: 'text-success-text',
	warning: 'text-warning-text',
	danger: 'text-danger-text',
};

/**
 * The badge of a menu entry or tab.
 *
 * - `pill`: a visually hidden ", <text>" and the mark after the label, so the link reads "Label, 3". A plain count is
 *   not `aria-hidden` and carries the number itself, so it is announced once. When there is a label or an icon, the
 *   hidden text carries the words and the mark is `aria-hidden`, with the same words as its tooltip. The mark is a
 *   pill with the count, or, with an icon, the bare icon in its tone (no pill).
 * - `text`: the text ", <text>" alone, to append to the visually hidden label of a link that shows an icon only.
 *
 * Renders nothing when there is nothing valid to show; a mistake is reported once in development (one report for the
 * whole badge, naming the item).
 */
export function ItemBadge({ item, variant = 'pill', current = false, className = '' }: { item: { id: string; label: string; badge?: unknown }; variant?: 'pill' | 'text'; current?: boolean; className?: string }): React.ReactElement | null {
	const { badge, problems } = resolveShellBadge(item.badge);
	const reportKey = problems.map((problem) => `${problem.kind}:${problem.received}`).join('\u0000');
	useEffect(() => {
		// The guard is written here, not only inside `reportAuthoringMistake`: a bundler folds it while parsing, which drops
		// `describeProblems` and its sentences from a production bundle. Through the helper alone they would stay as an unused function.
		if (process.env.NODE_ENV !== 'production' && reportKey !== '') {
			reportAuthoringMistake(describeProblems(item.label, item.id, problems));
		}
		// `problems` is rebuilt on each render; `reportKey` says when its content changed.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [reportKey, item.id, item.label]);
	if (badge === undefined) {
		return null;
	}
	if (variant === 'text') {
		return <>{`, ${badge.text}`}</>;
	}
	const { icon, tone, count, label } = badge;
	if (icon !== undefined) {
		const Icon = ICON_COMPONENT[icon];
		const iconTone = tone === 'neutral' && current ? 'text-content' : ICON_TONE_CLASS[tone];
		return (
			<>
				<span className="sr-only">{`, ${badge.text}`}</span>
				<span data-menu-badge="" data-badge-icon={icon} aria-hidden="true" title={badge.text} className={`${ICON_BOX} ${iconTone} ${className}`}>
					<Icon aria-hidden="true" className="h-4 w-4" />
				</span>
			</>
		);
	}
	const colours = tone === 'neutral' && current ? PILL_NEUTRAL_CURRENT : PILL_TONE[tone];
	if (label !== undefined) {
		return (
			<>
				<span className="sr-only">{`, ${label}`}</span>
				<span data-menu-badge="" aria-hidden="true" title={label} className={`${PILL} ${colours} ${className}`}>
					{count}
				</span>
			</>
		);
	}
	return (
		<>
			<span className="sr-only">, </span>
			<span data-menu-badge="" title={`${item.label}: ${count}`} className={`${PILL} ${colours} ${className}`}>
				{count}
			</span>
		</>
	);
}
