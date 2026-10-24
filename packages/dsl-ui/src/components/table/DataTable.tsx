/**
 * DataTable - generic, domain-agnostic tabular data component.
 *
 * IN SCOPE:
 *   - Rendering rows, columns, sorting, pagination state
 *   - Generic column formats: datetime, date, time, bytes, ms, httpMethod, httpStatus
 *   - Filter context (DataTableFilterCtx) for generic filter components
 *   - Selection and batch actions
 *   - Expansion rows
 *
 * OUT OF SCOPE - do NOT add these here:
 *   - App-specific column formats (e.g. "expiry countdown", "revoked badge") -> put in the
 *     app's own ColumnHelpers (e.g. WdriveColumnHelpers in dsl-ui-wdrive)
 *   - Business logic or domain knowledge (HTTP status conventions are an accepted exception
 *     because they are a universal web standard, not app-specific)
 *   - Formatting that encodes app state (e.g. "Auto-deletes in N days" is wdrive-specific)
 */
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Loader2 } from 'lucide-react';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { Button } from '../controls/_Button.js';
import { IconButton } from '../controls/IconButton.js';
import { Checkbox } from '../controls/Checkbox.js';
import { HttpMethodBadge } from '../display/HttpMethodBadge.js';
import { Badge } from '../display/Badge.js';
import { Skeleton } from '../display/Skeleton.js';
import type { BadgeVariant } from '../display/Badge.js';
import { HttpStatusBadge } from '../display/HttpStatusBadge.js';
import { iconByName } from '../display/iconByName.js';
import { AppLink } from '../navigation/AppLink.js';
import { formatBytes } from '@dsl-ui/utils/formatBytes.js';
import { buildLinkPath } from '@dsl-ui/utils/linkTarget.js';
import { RouterContext } from '@dsl-ui/RouterContext.js';
import { fillTemplate, fillTextTemplate } from '@dsl-ui/utils/templatedPath.js';

// Local alias matching dsl-engine's DslRawNode = Record<string, unknown>
type DslRawNode = Record<string, unknown>;

export type SortDir = 'asc' | 'desc';

// Column value formats with a dedicated render path (formatValue) or a custom swatch (httpMethod/httpStatus)
export type ColumnValueFormat = 'datetime' | 'date' | 'time' | 'bytes' | 'ms';
export type ColumnFormat = ColumnValueFormat | 'httpMethod' | 'httpStatus';

// --- Filter context -----------------------------------------------------------

// A custom filter predicate, registered by a filter component that needs row-shape-specific
// logic (e.g. HideMetaToggle's `path.startsWith('/admin/logs')` check) that DataTable itself
// must not know about (see the header comment's OUT OF SCOPE list).
export type DataTableFilterPredicate = (row: Record<string, unknown>, value: unknown) => boolean;

interface DataTableFilterState {
	filters: Record<string, unknown>;
	setFilter: (key: string, value: unknown) => void;
	/** Registers a custom predicate for one filter key, consulted before the generic branches. */
	registerFilterPredicate?: (key: string, predicate: DataTableFilterPredicate) => void;
	/** This DataTable's own `id` prop - lets a filter component namespace its own URL persistence. */
	tableId?: string;
}

export const DataTableFilterCtx = createContext<DataTableFilterState | null>(null);

export function useDataTableFilter() {
	return useContext(DataTableFilterCtx);
}

// --- Selection context --------------------------------------------------------

interface DataTableSelectionState {
	selectedIds: string[];
	toggleRow: (id: string) => void;
	toggleAll: (allIds: string[]) => void;
	clearSelection: () => void;
}

export const DataTableSelectionCtx = createContext<DataTableSelectionState | null>(null);

export function useDataTableSelection(): DataTableSelectionState | null {
	return useContext(DataTableSelectionCtx);
}

// --- Formatting helpers -------------------------------------------------------


// Intl.DateTimeFormat#format throws a RangeError on an invalid date, which would take the whole table down for one
// bad cell: such a value is shown as it came (visible, not hidden) instead.
function formatDate(val: unknown, options: Intl.DateTimeFormatOptions): string {
	const date = new Date(String(val));
	return Number.isNaN(date.getTime()) ? String(val) : new Intl.DateTimeFormat(undefined, options).format(date);
}

function formatValue(val: unknown, format: ColumnValueFormat | undefined): string {
	if (val === null || val === undefined) {
		return '';
	}
	switch (format) {
		case 'datetime':
			return formatDate(val, { dateStyle: 'short', timeStyle: 'short' });
		case 'date':
			return formatDate(val, { dateStyle: 'short' });
		case 'time':
			return formatDate(val, { timeStyle: 'short' });
		case 'bytes':
			return formatBytes(Number(val));
		case 'ms':
			return `${val}ms`;
		// violations-suppress: ts/no-switch-default-break explicit fallback stringify - not a silent no-op
		default:
			return String(val);
	}
}

function applyFilters<T extends Record<string, unknown>>(
	row: T,
	filterState: Record<string, unknown>,
	predicates: Record<string, DataTableFilterPredicate>
): boolean {
	for (const [key, value] of Object.entries(filterState)) {
		if (value === 'all' || value === undefined || value === null) {
			continue;
		}
		// A registered custom predicate (e.g. HideMetaToggle's path-based rule) takes priority
		// over the generic branches below - it owns row-shape knowledge DataTable itself must not.
		const customPredicate = predicates[key];
		if (customPredicate) {
			if (!customPredicate(row, value)) {
				return false;
			}
			continue;
		}
		if (Array.isArray(value)) {
			if (value.length > 0 && !value.includes(row[key])) {
				return false;
			}
		} else if (typeof value === 'string' && /^[1-5]xx$/.test(value)) {
			const code = Number(row[key]);
			const prefix = parseInt(value[0]!, 10) * 100;
			if (code < prefix || code >= prefix + 100) {
				return false;
			}
		} else if (typeof value === 'string') {
			// Exact-match filter for non-status-family string values (e.g. action type filter)
			if (String(row[key] ?? '') !== value) {
				return false;
			}
		}
	}
	return true;
}

// --- YAML column normalization ------------------------------------------------
// Converts raw YAML column defs (from DSL entries) to proper TableColumn objects.
// A raw YAML column may look like: { field: 'title', label: 'Title' }
// or an actions column: { type: 'actions', items: [{ label: 'Edit', action: 'openEdit' }] }
//
// The interfaces below are the SOURCE OF TRUTH for the keys a YAML column may carry: the build tooling
// derives the unknown-key check from them (@itemKeys on DataTableProps.columns), so a key added here is
// accepted by the compiler and a key not listed here is an error instead of a silent no-op.

const BADGE_VARIANTS: readonly BadgeVariant[] = ['default', 'primary', 'success', 'warning', 'danger', 'info'];
const COLUMN_FORMATS: readonly ColumnFormat[] = ['datetime', 'date', 'time', 'bytes', 'ms', 'httpMethod', 'httpStatus'];

/** A data column authored in YAML. */
export interface DataTableColumnSpec {
	/** Row field shown in this column. `key` is an accepted alias. */
	field?: string;
	key?: string;
	label?: string;
	/** Fixed width in Tailwind spacing units (48 = 12rem). Implies no wrapping. */
	width?: number;
	/** Single line cut with an ellipsis; the full text is the cell's tooltip. */
	truncate?: boolean;
	/** Single line, never wrapped (a long value widens the column instead of breaking mid-word). */
	nowrap?: boolean;
	mono?: boolean;
	muted?: boolean;
	/** Click-to-sort header. */
	sortable?: boolean;
	/** datetime | date | time | bytes | ms | httpMethod | httpStatus. */
	format?: string;
	/** Shows the value as a Badge: map of cell value to badge variant (default | primary | success | warning | danger | info). Values not in the map stay plain text. */
	badge?: Record<string, string>;
	/**
	 * Makes the cell value a link to this template, `{field}` filled from the row and percent-encoded
	 * (`/modules/queue/history?event={event}`). A row whose placeholder has no value shows the plain value and an error is logged once.
	 */
	href?: string;
	/** `href` is a full http(s)/mailto URL opened in a new tab (placeholders are still encoded). */
	external?: boolean;
	/**
	 * Tooltip (the cell's `title` attribute) from a text template, `{field}` filled from the row without encoding
	 * (`{lastSeenAt}`, `Last seen {lastSeenAt} by {worker}`). A placeholder with no usable value means no tooltip, silently:
	 * it is cosmetic. An explicit title wins over the one `truncate` derives from the cell text. A `title` is not reachable
	 * from the keyboard: never put essential information only there.
	 */
	title?: string;
}

/**
 * An icon-only link column authored in YAML (`type: link`): the way to open a detail page without making the whole row
 * clickable. It stays a real anchor (middle-click, new tab, copy link) and goes through the router without a page load.
 */
export interface DataTableLinkColumnSpec {
	type: 'link';
	/** Target template, `{field}` filled from the row and percent-encoded (`/modules/flow/executions/{executionId}`). */
	to: string;
	/** Accessible name and tooltip of the icon-only link. */
	label?: string;
	/** Icon name from the vocabulary of display/iconByName (external-link by default). */
	icon?: string;
	/** `start` puts the link right after the expansion chevron (before the data columns), `end` (default) keeps its place in the list. */
	position?: 'start' | 'end';
	/** `to` is a full http(s)/mailto URL opened in a new tab. */
	external?: boolean;
	width?: number;
}

/** One button of an actions column authored in YAML. */
export interface DataTableActionItemSpec {
	label: string;
	action: string;
	variant?: string;
	/** Row field: shown when truthy; `!field`: shown when falsy. */
	condition?: string;
	/**
	 * Icon name (rocket, rotate-ccw, play, trash, archive, send, pencil, ...: the vocabulary of display/iconByName).
	 * The button becomes icon-only; `label` stays its accessible name and tooltip.
	 */
	icon?: string;
}

/** A row-actions column authored in YAML (`type: actions`). */
export interface DataTableActionsColumnSpec {
	type: 'actions';
	items?: DataTableActionItemSpec[];
	width?: number;
}

// Keys normalizeColumn also accepts on a hand-built column object (not authored in YAML).
const NON_YAML_COLUMN_KEYS = ['render', 'isActions', 'actions'];

// MUST list the same keys as DataTableColumnSpec / DataTableActionsColumnSpec / DataTableActionItemSpec: a test
// compares them with what the build tooling extracts from those interfaces.
export const DATA_TABLE_COLUMN_KEYS = ['field', 'key', 'label', 'width', 'truncate', 'nowrap', 'mono', 'muted', 'sortable', 'format', 'badge', 'href', 'external', 'title'] as const;
export const DATA_TABLE_ACTIONS_COLUMN_KEYS = ['type', 'items', 'width'] as const;
export const DATA_TABLE_LINK_COLUMN_KEYS = ['type', 'to', 'label', 'icon', 'position', 'external', 'width'] as const;
export const DATA_TABLE_ACTION_ITEM_KEYS = ['label', 'action', 'variant', 'condition', 'icon'] as const;

type RawYamlColumn = Partial<DataTableColumnSpec> &
	Partial<Omit<DataTableActionsColumnSpec, 'type'>> &
	Partial<Omit<DataTableLinkColumnSpec, 'type'>> & {
		type?: string;
		render?: (row: Record<string, unknown>) => React.ReactNode;
		isActions?: boolean;
		actions?: unknown[];
	};

// The memoised normalisation can re-run when the page re-resolves its props: report each distinct problem once.
const reported = new Set<string>();
// A row button is busy when its own row (or a batch call, `*`) is in flight for that action. Without per-row
// information for the action (e.g. a host that only passes `actionPending`), every row of the action is busy.
function isRowActionPending(
	action: string,
	row: Record<string, unknown>,
	actionPending: Record<string, boolean> | undefined,
	actionPendingRows: Record<string, string[]> | undefined
): boolean {
	const pendingRowIds = actionPendingRows?.[action];
	if (pendingRowIds) {
		return pendingRowIds.includes('*') || pendingRowIds.includes(String(row['id'] ?? ''));
	}
	return actionPending?.[action] === true;
}

function warnOnce(message: string): void {
	if (reported.has(message)) {
		return;
	}
	reported.add(message);
	console.error(message);
}

function describeKeys(keys: readonly string[]): string {
	return [...keys].sort().join(', ');
}

// A key DataTable ignores is an authoring mistake: say so once per column definition, naming the column.
function warnUnsupportedColumnKeys(col: Record<string, unknown>, index: number): void {
	const isActions = col['type'] === 'actions' || col['isActions'];
	const isLink = col['type'] === 'link';
	const allowed: readonly string[] = isLink ? DATA_TABLE_LINK_COLUMN_KEYS : isActions ? DATA_TABLE_ACTIONS_COLUMN_KEYS : DATA_TABLE_COLUMN_KEYS;
	const where = typeof col['field'] === 'string' ? `"${col['field']}"` : `#${index}`;
	for (const key of Object.keys(col)) {
		if (allowed.includes(key) || NON_YAML_COLUMN_KEYS.includes(key)) {
			continue;
		}
		const hint = key === '$type' && col[key] === 'actions' ? ' Actions columns are written `type: actions` (no `$`).' : '';
		warnOnce(
			`[DataTable] column ${where}: unknown key "${key}" is ignored.${hint} Supported keys for ${isLink ? 'a link' : isActions ? 'an actions' : 'a data'} column: ${describeKeys(allowed)}.`
		);
	}
	if (isActions && Array.isArray(col['items'])) {
		(col['items'] as unknown[]).forEach((item, i) => {
			if (!item || typeof item !== 'object') {
				return;
			}
			for (const key of Object.keys(item)) {
				if (!(DATA_TABLE_ACTION_ITEM_KEYS as readonly string[]).includes(key)) {
					warnOnce(
						`[DataTable] actions column ${where}, item #${i}: unknown key "${key}" is ignored. Supported keys: ${describeKeys(DATA_TABLE_ACTION_ITEM_KEYS)}.`
					);
				}
			}
		});
	}
}

function badgeVariantFor(value: unknown, map: Record<string, string>, where: string): BadgeVariant | undefined {
	const variant = map[String(value ?? '')];
	if (variant === undefined) {
		return undefined;
	}
	if (!(BADGE_VARIANTS as readonly string[]).includes(variant)) {
		warnOnce(`[DataTable] column ${where}: badge variant "${variant}" is not one of ${BADGE_VARIANTS.join(', ')}; showing the neutral variant.`);
		return 'default';
	}
	return variant as BadgeVariant;
}

// A data cell that is a link reads as one without shouting in a dense table.
const DATA_LINK_CLASSES =
	'text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-solid)] rounded-sm';
const ICON_LINK_CLASSES =
	'inline-flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-bg-secondary hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-solid)]';

// `type: link` column: an icon-only anchor per row. The accessible name is the label (also the tooltip).
function normalizeLinkColumn<T extends Record<string, unknown>>(col: RawYamlColumn, index: number): TableColumn<T> {
	const where = `link column #${index}`;
	const template = col.to;
	if (typeof template !== 'string' || template === '') {
		warnOnce(`[DataTable] ${where}: a link column needs \`to\` (a path template such as /modules/flow/executions/{executionId}).`);
	}
	if (col.label === undefined || col.label === '') {
		warnOnce(`[DataTable] ${where}: a link column needs a \`label\`, it is the accessible name of the icon-only link. Using "Open".`);
	}
	const label = col.label || 'Open';
	const external = col.external === true;
	const icon = iconByName(col.icon, `DataTable ${where}`);
	return {
		key: `_link_${index}`,
		label,
		width: col.width,
		isLink: true,
		linkPosition: col.position === 'start' ? 'start' : 'end',
		render: row => {
			if (typeof template !== 'string' || template === '') {
				return null;
			}
			const link = buildLinkPath(template, row, external);
			if (!link.href) {
				warnOnce(`[DataTable] ${where}: link not rendered: ${link.problem}.`);
				return null;
			}
			return (
				<AppLink
					href={link.href}
					external={external}
					aria-label={label}
					title={label}
					className={ICON_LINK_CLASSES}
					onClick={e => e.stopPropagation()}
				>
					{icon}
				</AppLink>
			);
		},
	};
}

function normalizeColumn<T extends Record<string, unknown>>(col: RawYamlColumn, index = 0): TableColumn<T> {
	// Already a proper TableColumn (has render function)
	if (typeof col.render === 'function') {
		return col as unknown as TableColumn<T>;
	}
	warnUnsupportedColumnKeys(col, index);
	// Actions column
	if (col.type === 'actions' || col.isActions) {
		// An item that is not an object (`items: [null]`) cannot be rendered: drop it and say so, rather than crash the table.
		const actions = ((col.items ?? col.actions ?? []) as unknown[])
			.filter((item, i) => {
				const valid = item !== null && typeof item === 'object';
				if (!valid) {
					warnOnce(`[DataTable] actions column #${index}, item #${i}: ignored, an action item must be an object with a label and an action (got ${JSON.stringify(item)}).`);
				}
				return valid;
			})
			.map((item, i) => {
				const def = item as ActionDef<T>;
				// YAML can only name an icon: resolve it here. A hand-built ActionDef already carries a React node.
				return typeof def.icon === 'string' ? { ...def, icon: iconByName(def.icon, `DataTable actions column #${index}, item #${i}`, 'h-3 w-3') } : def;
			});
		return {
			key: '_actions',
			label: '',
			isActions: true,
			width: col.width,
			actions,
			render: () => null,
		};
	}
	// Icon-only link column
	if (col.type === 'link') {
		return normalizeLinkColumn<T>(col, index);
	}
	// Plain field column
	const field = col.field ?? col.key ?? '';
	const where = `"${field || index}"`;
	let format: ColumnFormat | undefined;
	if (col.format !== undefined) {
		if ((COLUMN_FORMATS as readonly string[]).includes(col.format)) {
			format = col.format as ColumnFormat;
		} else {
			warnOnce(`[DataTable] column ${where}: unknown format "${col.format}" is ignored. Supported formats: ${COLUMN_FORMATS.join(', ')}.`);
		}
	}
	const badge = col.badge;
	const renderValue = (row: T): React.ReactNode => {
		const value = row[field];
		if (badge) {
			const variant = badgeVariantFor(value, badge, where);
			// Unmapped values stay plain text: a badge would claim a status the page never declared.
			if (variant) {
				return <Badge label={String(value)} variant={variant} tone="subtle" />;
			}
		}
		if (format === 'httpMethod') {
			return <HttpMethodBadge method={String(value ?? '')} />;
		}
		if (format === 'httpStatus') {
			return <HttpStatusBadge status={Number(value)} />;
		}
		if (format) {
			return formatValue(value, format as ColumnValueFormat);
		}
		return String(value ?? '');
	};
	const hrefTemplate = col.href;
	const external = col.external === true;
	const render = (row: T): React.ReactNode => {
		const content = renderValue(row);
		if (hrefTemplate === undefined) {
			return content;
		}
		const link = buildLinkPath(hrefTemplate, row, external);
		if (!link.href) {
			// A link that cannot be built shows the plain value: a dead anchor would hide the authoring mistake.
			warnOnce(`[DataTable] column ${where}: href ignored: ${link.problem}.`);
			return content;
		}
		return (
			<AppLink href={link.href} external={external} className={DATA_LINK_CLASSES} onClick={e => e.stopPropagation()}>
				{content}
			</AppLink>
		);
	};
	const titleTemplate = col.title;
	if (titleTemplate !== undefined && typeof titleTemplate !== 'string') {
		warnOnce(`[DataTable] column ${where}: \`title\` must be a text template such as "{lastSeenAt}", got ${JSON.stringify(titleTemplate)}; no tooltip.`);
	}
	return {
		key: field,
		label: col.label ?? field,
		width: col.width,
		cellTitle: typeof titleTemplate === 'string' ? (row: T) => fillTextTemplate(titleTemplate, row) : undefined,
		truncate: col.truncate,
		nowrap: col.nowrap,
		mono: col.mono,
		muted: col.muted,
		sortable: col.sortable,
		format,
		render,
	};
}

// --- TableColumn<T> and ColumnHelpers<T> --------------------------------------

export interface ActionDef<T extends Record<string, unknown>> {
	label: string;
	/** Row actions render icon-only (via IconButton) when given. Without one, falls back to a
	 * labelled text Button and logs a warning - YAML authoring has no way to express a ReactNode yet. */
	icon?: React.ReactNode;
	variant?: 'primary' | 'danger' | 'danger-outline' | 'ghost' | 'success';
	action: string;
	onClick?: (row: T) => void;
	/** Row-level condition. "field" = show when row[field] truthy. "!field" = show when falsy. */
	condition?: string;
}

export interface TableColumn<T extends Record<string, unknown>> {
	key: string;
	label: string;
	render: (row: T) => React.ReactNode;
	mono?: boolean;
	/** When true, renders in muted text (text-muted) regardless of format. */
	muted?: boolean;
	format?: 'datetime' | 'date' | 'time' | 'bytes' | 'ms' | 'httpMethod' | 'httpStatus';
	width?: number;
	truncate?: boolean;
	/** When true, the cell never wraps (a long value widens the column instead of breaking mid-word). */
	nowrap?: boolean;
	sortable?: boolean;
	isActions?: boolean;
	actions?: ActionDef<T>[];
	/** Tooltip of a cell, from the column's `title` template. Undefined: no explicit tooltip for this row. */
	cellTitle?: (row: T) => string | undefined;
	/** An icon-only link column (`type: link`): no header text, narrow cell. */
	isLink?: boolean;
	/** Where a link column sits: `start` moves it right after the expansion chevron. */
	linkPosition?: 'start' | 'end';
}

interface TextOptions {
	mono?: boolean;
	muted?: boolean;
	truncate?: boolean;
	width?: number;
}

interface DateOptions {
	format?: 'datetime' | 'date' | 'time';
	width?: number;
}

interface ByteOptions {
	width?: number;
}

interface NumberOptions {
	format?: 'ms';
	width?: number;
}

// @formatter:off
const filtersTopRowClass = 'flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2';
const batchToolbarClass = 'flex items-center gap-3 border-b border-primary bg-primary-light px-3 py-2';
const floatingBatchToolbarClass =
	'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border border-primary bg-primary-light px-4 py-2.5 shadow-lg';
const theadRowClass = 'border-b border-border text-left text-sm text-muted';
// @formatter:on

export class ColumnHelpers {
	static text<T extends Record<string, unknown>>(key: keyof T & string, label: string, options: TextOptions = {}): TableColumn<T> {
		return {
			key,
			label,
			mono: options.mono,
			muted: options.muted,
			truncate: options.truncate,
			width: options.width,
			render: row => String(row[key] ?? ''),
		};
	}

	static date<T extends Record<string, unknown>>(key: keyof T & string, label: string, options: DateOptions = {}): TableColumn<T> {
		const fmt = options.format ?? 'datetime';
		return {
			key,
			label,
			format: fmt,
			width: options.width,
			render: row => formatValue(row[key], fmt),
		};
	}

	static bytes<T extends Record<string, unknown>>(key: keyof T & string, label: string, options: ByteOptions = {}): TableColumn<T> {
		return {
			key,
			label,
			format: 'bytes',
			width: options.width,
			// formatValue keeps a missing size empty instead of printing "0 B", like a YAML `format: bytes` column.
			render: row => formatValue(row[key], 'bytes'),
		};
	}

	static number<T extends Record<string, unknown>>(key: keyof T & string, label: string, options: NumberOptions = {}): TableColumn<T> {
		return {
			key,
			label,
			format: options.format,
			width: options.width,
			render: row => formatValue(row[key], options.format),
		};
	}

	static httpMethod<T extends Record<string, unknown>>(key: keyof T & string, label: string, options: TextOptions = {}): TableColumn<T> {
		return {
			...ColumnHelpers.text<T>(key, label, options),
			format: 'httpMethod' as const,
			render: row => <HttpMethodBadge method={String(row[key] ?? '')} />,
		};
	}

	static httpStatus<T extends Record<string, unknown>>(key: keyof T & string, label: string, options: TextOptions = {}): TableColumn<T> {
		return {
			...ColumnHelpers.text<T>(key, label, options),
			format: 'httpStatus' as const,
			render: row => <HttpStatusBadge status={Number(row[key])} />,
		};
	}

	static actions<T extends Record<string, unknown>>(items: ActionDef<T>[]): TableColumn<T> {
		return {
			key: '_actions',
			label: 'Actions',
			isActions: true,
			actions: items,
			render: () => null,
		};
	}
}

// --- DataTable<T> -------------------------------------------------------------

// Placeholder rows shown while the first load is pending; widths vary so the bars read as text rather than a block.
const SKELETON_ROWS = [0, 1, 2, 3, 4];
const SKELETON_WIDTHS = ['70%', '45%', '85%', '60%', '35%'];

export interface DataTableProps<T extends Record<string, unknown>> {
	rows: T[];
	/**
	 * Columns: proper TableColumn objects (ColumnHelpers) or YAML column maps.
	 * @itemKeys DataTableColumnSpec, DataTableActionsColumnSpec, DataTableLinkColumnSpec
	 */
	columns: TableColumn<T>[];
	/**
	 * Shows a loading skeleton instead of the rows and the empty message. Unset, it follows the page: true until the
	 * page's first load of `$sources` has finished, so the table never says "empty" before its data has arrived.
	 * A refetch (filter, page, poll, action reload) keeps the previous rows on screen.
	 * @ctxDefault $initialLoading
	 */
	loading?: boolean;
	/**
	 * A refetch is in flight while the rows are already shown (filter, page, poll, refresh button): they stay, and
	 * after a short delay (so a fast poll never flashes) they dim slightly. Unset, it follows the page.
	 * @ctxDefault $refreshing
	 */
	refreshing?: boolean;
	emptyMessage?: string;
	/**
	 * Called with the action name and the row when a row-action button (`type: actions` column) is clicked.
	 * Defaults to the page's `$actions` handler (ctx.onAction), so `action: <name>` items work without wiring.
	 * @ctxDefault
	 */
	onAction?: (action: string, row: T) => void;
	/** Path template (e.g. `/files/{id}`) interpolated from the clicked row - navigated to via RouterContext. */
	navigateTo?: string;
	/**
	 * Called with the clicked row. Takes precedence over `navigateTo`.
	 *
	 * For a consumer that owns its own navigation and so cannot express the destination as a path
	 * template - a react-router `useNavigate`, or a callback the page passes down. Without it such a
	 * consumer had to give up row clicks altogether.
	 */
	onRowClick?: (row: T) => void;
	/** @slot tag:filter */
	filtersTop?: React.ReactNode;
	/** @slot tag:filter */
	filters?: React.ReactNode;
	id?: string;
	/**
	 * Row field that identifies a row for selection (and the batch action's rows). Default `id`. A row without a value
	 * falls back to its position in `rows` and a warning explains it; two rows with the same value warn too (selecting
	 * one would select both).
	 */
	rowKey?: string;
	/** Sort column key. Empty string means unsorted. */
	sortCol?: string;
	onSortColChange?: (col: string) => void;
	/** 'asc'/'desc' - any other value falls back to 'desc' with a console.warn. */
	sortDir?: SortDir;
	onSortDirChange?: (dir: SortDir) => void;
	/** Static default filter values, merged into filter state on mount. */
	defaultFilters?: Record<string, unknown>;
	expansion?: DslRawNode;
	renderNode?: (node: DslRawNode, ctx: Record<string, unknown>) => React.ReactNode;
	/** Enable row multi-selection. */
	selectable?: boolean;
	/** Actions available when rows are selected. */
	batchActions?: Array<{ label: string; action: string; variant?: 'primary' | 'danger' | 'ghost' | 'success' }>;
	/**
	 * Called when a batch action is triggered with the selected rows.
	 * Defaults to the page's `$actions` batch handler (ctx.onBatchAction).
	 * @ctxDefault
	 */
	onBatchAction?: (actionName: string, rows: T[]) => void;
	/**
	 * Actions currently running, by action name. Defaults to the page's `$ctx.$actionPending`: while an action runs,
	 * its batch button is disabled and busy. Row buttons follow `actionPendingRows` when it lists the action, and fall
	 * back to this flag (every row) when it does not.
	 * @ctxDefault $actionPending
	 */
	actionPending?: Record<string, boolean>;
	/**
	 * Row ids with a call in flight, by action name (`*` = a batch call, which covers every row). Defaults to the page's
	 * `$ctx.$actionPendingRows`: only the button of the row being processed is disabled and busy, the other rows stay usable.
	 * @ctxDefault $actionPendingRows
	 */
	actionPendingRows?: Record<string, string[]>;
	/**
	 * Where the batch-actions bar renders when rows are selected.
	 * 'floating' (default): a fixed pill at the bottom of the viewport - never shifts the table.
	 * 'bottom': static, below the table - rows above it never move either way.
	 */
	batchActionsPosition?: 'floating' | 'bottom';
	expansionCondition?: string;
	/** When true, applies font-mono to the entire table area. */
	fontMono?: boolean;
}

/**
 * @registryCategory composite
 * @registryTags table
 */
export function DataTable<T extends Record<string, unknown>>({
	rows = [] as unknown as T[],
	columns,
	loading = false,
	refreshing = false,
	emptyMessage = 'No items',
	onAction,
	navigateTo,
	onRowClick,
	filtersTop,
	filters,
	id,
	rowKey = 'id',
	sortCol,
	onSortColChange,
	sortDir,
	onSortDirChange,
	defaultFilters,
	expansion,
	renderNode,
	selectable = false,
	batchActions = [],
	onBatchAction,
	actionPending,
	actionPendingRows,
	batchActionsPosition = 'floating',
	expansionCondition,
	fontMono = false,
}: DataTableProps<T>) {
	// Normalize columns: accept either proper TableColumn[] (from ColumnHelpers) or raw YAML
	// column defs (from DSL entriesGenerator). This allows declarative YAML to drive DataTable
	// without requiring ColumnHelpers in every call site.
	const normalizedColumns = useMemo(
		() => {
			const normalized = (columns ?? []).map((col, index) => normalizeColumn<T>(col as unknown as RawYamlColumn, index));
			// `position: start` links come first (right after the expansion chevron); the order of the others is kept.
			return [...normalized.filter(c => c.linkPosition === 'start'), ...normalized.filter(c => c.linkPosition !== 'start')];
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[columns]
	);

	const router = useContext(RouterContext);
	/*
	 * `onRowClick` wins over `navigateTo`, and is checked first on purpose.
	 *
	 * `navigateTo` needs a RouterContext. An app that has not mounted one gets `router?.navigate` -- a
	 * silent no-op, so clicking a row does nothing at all and says nothing about why. A consumer that
	 * already owns its own navigation (react-router's useNavigate, or a callback the page supplies)
	 * has no way to express that through `navigateTo`, and had to drop row clicks entirely.
	 */
	const handleRowClick = onRowClick
		? onRowClick
		: navigateTo
		? (row: T) => {
				if (!router) {
					// Loud, because the alternative is a dead click. See onRowClick.
					console.error(
						'[DataTable] navigateTo="%s" needs a RouterContext, and none is mounted: the row click does nothing. Wrap the app in RouterProvider, or pass onRowClick instead.',
						navigateTo
					);
					return;
				}
				const { text, missing } = fillTemplate(navigateTo, row);
				if (missing !== undefined) {
					// Loud, because navigating to "/files/" would open another page than the clicked row's.
					warnOnce(`[DataTable] navigateTo="${navigateTo}": the clicked row has no value for {${missing}}, so the row click does nothing (row keys: ${Object.keys(row).sort().join(', ') || 'none'}).`);
					return;
				}
				router.navigate(text);
		  }
		: undefined;

	// Independent controlled/uncontrolled pairs (replacing the old single all-or-nothing
	// DataTableState) - each falls back to its own local useState when the matching
	// on*Change prop is absent, matching the mechanical urlBackedPair codegen's own per-pair
	// controlled/uncontrolled convention.
	const [internalSortCol, setInternalSortCol] = useState('');
	const activeSortCol = sortCol ?? internalSortCol;
	function handleSortColChange(next: string) {
		if (onSortColChange) {
			onSortColChange(next);
		} else {
			setInternalSortCol(next);
		}
	}

	const [internalSortDir, setInternalSortDir] = useState<SortDir>('desc');
	const activeSortDir: SortDir = sortDir ?? internalSortDir;
	function handleSortDirChange(next: SortDir) {
		if (onSortDirChange) {
			onSortDirChange(next);
		} else {
			setInternalSortDir(next);
		}
	}

	const [filterState, setFilterState] = useState<Record<string, unknown>>(defaultFilters ?? {});

	const setFilter = useCallback((key: string, value: unknown) => {
		setFilterState(prev => ({ ...prev, [key]: value }));
	}, []);

	// Custom filter predicates registered by filter components with row-shape-specific
	// knowledge DataTable itself must not have (see the header comment's OUT OF SCOPE list,
	// and HideMetaToggle's own registerFilterPredicate call).
	const predicatesRef = useRef<Record<string, DataTableFilterPredicate>>({});
	const registerFilterPredicate = useCallback((key: string, predicate: DataTableFilterPredicate) => {
		predicatesRef.current[key] = predicate;
	}, []);

	const filteredRows = useMemo(() => {
		if (Object.keys(filterState).length === 0) {
			return rows;
		}
		return rows.filter(row => applyFilters(row, filterState, predicatesRef.current));
	}, [rows, filterState]);

	// Initialise from the controlled sortCol/sortDir so sort persists across page reloads
	const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(
		activeSortCol ? { key: activeSortCol, dir: activeSortDir } : null
	);

	const sortedRows = useMemo(() => {
		if (!sort) {
			return filteredRows;
		}
		const { key, dir } = sort;
		return [...filteredRows].sort((a, b) => {
			const av = a[key];
			const bv = b[key];
			if (typeof av === 'number' && typeof bv === 'number') {
				return dir === 'asc' ? av - bv : bv - av;
			}
			const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
			return dir === 'asc' ? cmp : -cmp;
		});
	}, [filteredRows, sort]);

	// Track expanded row by stable identity (id > key > fallback index)
	const [expandedRow, setExpandedRow] = useState<unknown>(null);

	// --- Selection state ----------------------------------------------------------
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// A row's selection identity: its `rowKey` value, else its position in `rows` (stable while `rows` is the same array,
	// across sorting and filtering). Rows used to be keyed by `row.id ?? ''`, so every row without an id shared one
	// key and toggled together.
	const rowIds = useMemo(() => {
		const ids = new Map<T, string>();
		const seen = new Map<string, number>();
		let missing = 0;
		rows.forEach((row, index) => {
			const raw = row[rowKey];
			let rowId: string;
			if (raw === undefined || raw === null || raw === '') {
				missing += 1;
				rowId = `#${index}`;
			} else {
				rowId = String(raw);
			}
			seen.set(rowId, (seen.get(rowId) ?? 0) + 1);
			ids.set(row, rowId);
		});
		if (selectable) {
			if (missing > 0) {
				warnOnce(
					`[DataTable] ${missing} row(s) have no "${rowKey}" value: their selection falls back to their position in the rows, ` +
						`which changes when the rows are reloaded in another order. Give the rows a "${rowKey}" or set rowKey to a unique column.`
				);
			}
			const duplicated = [...seen.entries()].filter(([, count]) => count > 1).map(([value]) => value);
			if (duplicated.length > 0) {
				warnOnce(
					`[DataTable] rows share the same "${rowKey}" (${duplicated.slice(0, 5).join(', ')}): selecting one row selects all rows ` +
						`with the same value. Use a unique column (rowKey).`
				);
			}
		}
		return ids;
	}, [rows, rowKey, selectable]);
	const idOf = (row: T): string => rowIds.get(row) ?? String(row[rowKey] ?? '');

	const toggleRow = useCallback((id: string) => {
		setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
	}, []);

	const toggleAll = useCallback((allIds: string[]) => {
		setSelectedIds(prev => (prev.length === allIds.length ? [] : allIds));
	}, []);

	const clearSelection = useCallback(() => setSelectedIds([]), []);

	// Derive current page row IDs for select-all calculation
	const currentPageIds = sortedRows.map(idOf);
	const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));
	const someSelected = selectedIds.length > 0 && !allSelected;

	// position:fixed for 'floating' escapes layout entirely, so it never shifts the table
	// regardless of where in the DOM it renders - 'bottom' stays in flow, after </table>.
	const batchToolbar = selectable && selectedIds.length > 0 && batchActions.length > 0 && (
		<div
			className={batchActionsPosition === 'floating' ? floatingBatchToolbarClass : batchToolbarClass}
			role="toolbar"
			aria-label="Batch actions"
		>
			<span className="text-xs font-medium text-primary">
				{selectedIds.length} selected
			</span>
			{batchActions.map(action => (
				<Button
					key={action.action}
					type="button"
					variant={action.variant ?? 'secondary'}
					size="sm"
					loading={actionPending?.[action.action] === true}
					aria-busy={actionPending?.[action.action] === true || undefined}
					onClick={() => {
						const selectedRows = rows.filter(r => selectedIds.includes(idOf(r)));
						onBatchAction?.(action.action, selectedRows);
						clearSelection();
					}}
				>
					{action.label}
				</Button>
			))}
		</div>
	);

	return (
		<DataTableSelectionCtx.Provider value={{ selectedIds, toggleRow, toggleAll, clearSelection }}>
			<DataTableFilterCtx.Provider value={{ filters: filterState, setFilter, registerFilterPredicate, tableId: id }}>
				<div
					className={[
						'overflow-x-auto rounded border border-border bg-surface',
						fontMono ? 'font-mono' : '',
					]
						.filter(Boolean)
						.join(' ')}
				>
					{filtersTop && (
						<div className={filtersTopRowClass}>
							{filtersTop}
						</div>
					)}
					{filters && (
						<div className="flex flex-wrap gap-2 border-b border-border px-3 py-2">
							{filters}
						</div>
					)}
					<table className="w-full text-sm" aria-busy={loading || refreshing || undefined}>
						<thead>
							<tr className={theadRowClass}>
								{selectable && (
									<th className="w-8 px-3 py-2">
										<div className="flex items-center justify-center">
											<Checkbox
												checked={allSelected}
												ref={el => {
													if (el) {
														el.indeterminate = someSelected;
													}
												}}
												onChange={() => toggleAll(currentPageIds)}
												aria-label="Select all rows on this page"
												className="cursor-pointer"
											/>
										</div>
									</th>
								)}
								{expansion && <th className="w-8" />}
								{normalizedColumns.map(col => {
									if (col.isLink) {
										// Icon-only column: no visible header, but the name stays available to assistive tech.
										return (
											<th key={col.key} className="w-8 px-1 py-2" style={col.width ? { width: `${col.width * 4}px` } : undefined}>
												<span className="sr-only">{col.label}</span>
											</th>
										);
									}
									if (col.sortable) {
										const isActive = sort?.key === col.key;
										const SortIcon = isActive
											? sort!.dir === 'asc'
												? ChevronUp
												: ChevronDown
											: ChevronsUpDown;
										return (
											<th
												key={col.key}
												className="px-3 py-2 font-normal whitespace-nowrap"
												style={col.width ? { width: `${col.width * 4}px` } : undefined}
											>
												<span className="inline-flex items-center gap-1 select-none">
													{col.label}
													<IconButton
														icon={<SortIcon className={`h-3 w-3 ${!isActive ? 'opacity-30' : ''}`} aria-hidden="true" />}
														aria-label={`Sort by ${col.label}`}
														size="icon-xs"
														variant="ghost"
														onClick={() => {
															let newSort: { key: string; dir: SortDir } | null;
															if (!isActive) {
																newSort = { key: col.key, dir: 'asc' };
															} else if (sort!.dir === 'asc') {
																newSort = { key: col.key, dir: 'desc' };
															} else {
																newSort = null;
															}
															setSort(newSort);
															handleSortColChange(newSort?.key ?? '');
															handleSortDirChange(newSort?.dir ?? 'asc');
														}}
													/>
												</span>
											</th>
										);
									}
									return (
										<th
											key={col.key}
											className="px-3 py-2 font-normal whitespace-nowrap"
											style={col.width ? { width: `${col.width * 4}px` } : undefined}
										>
											{col.label}
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody
							className={
								refreshing && !loading
									? 'opacity-60 transition-opacity duration-200 delay-300 motion-reduce:transition-none'
									: 'transition-opacity duration-200'
							}
						>
							{loading ? (
								// Skeleton rows laid out like the real ones (same columns, header stays): nothing jumps when the data arrives.
								// One status for assistive tech; the bars themselves are decorative.
								SKELETON_ROWS.map(ri => (
									<tr key={ri} className="border-b border-border">
										{selectable && <td className="px-3 py-3" />}
										{expansion && <td className="w-8" />}
										{normalizedColumns.map((col, ci) => (
											<td key={col.key} className="px-3 py-3">
												{ri === 0 && ci === 0 && (
													<span role="status" className="sr-only">
														Loading...
													</span>
												)}
												<Skeleton decorative width={SKELETON_WIDTHS[(ri + ci) % SKELETON_WIDTHS.length]} height="0.875rem" />
											</td>
										))}
									</tr>
								))
							) : sortedRows.length === 0 ? (
								<tr>
									<td colSpan={normalizedColumns.length + (expansion ? 1 : 0) + (selectable ? 1 : 0)}>
										<div className="flex flex-col items-center justify-center py-16 text-muted">
											{emptyMessage}
										</div>
									</td>
								</tr>
							) : (
								sortedRows.map((row, ri) => {
									const stableKey = row[rowKey] ?? row['key'] ?? ri;
									return (
									<React.Fragment key={ri}>
										<tr
											className={[
												'border-b border-border group',
												'hover:bg-bg-secondary',
												handleRowClick ? 'cursor-pointer' : '',
											]
												.filter(Boolean)
												.join(' ')}
											onClick={handleRowClick ? () => handleRowClick(row) : undefined}
										>
											{selectable && (
												<td className="w-8 px-3 py-1.5">
													<div className="flex items-center justify-center">
														<Checkbox
															checked={selectedIds.includes(idOf(row))}
															onChange={e => {
																e.stopPropagation();
																toggleRow(idOf(row));
															}}
															onClick={e => e.stopPropagation()}
															aria-label={`Select row ${String(row[rowKey] ?? ri)}`}
															className="cursor-pointer"
														/>
													</div>
												</td>
											)}
											{expansion && (
												<td className="w-8 px-1 py-1.5 text-center">
													{(!expansionCondition || Boolean(row[expansionCondition])) && (
														<Button
															type="button"
															variant="ghost"
															size="icon-xs"
															onClick={e => {
																e.stopPropagation();
																setExpandedRow(expandedRow === stableKey ? null : stableKey);
															}}
														>
															{expandedRow === stableKey ? (
																<ChevronDown className="h-3 w-3" aria-hidden="true" />
															) : (
																<ChevronRight className="h-3 w-3" aria-hidden="true" />
															)}
														</Button>
													)}
												</td>
											)}
											{normalizedColumns.map(col => {
												if (col.isLink) {
													return (
														<td
															key={col.key}
															className="w-8 px-1 py-1.5 text-center"
															style={col.width ? { width: `${col.width * 4}px` } : undefined}
														>
															{col.render(row)}
														</td>
													);
												}
												if (col.isActions && col.actions) {
													return (
														<td
															key={col.key}
															className="px-3 py-1.5"
															style={col.width ? { width: `${col.width * 4}px` } : undefined}
														>
															<div className="flex items-center gap-1">
																{col.actions.map((item, ii) => {
																	if (item.condition) {
																		const negate = item.condition.startsWith('!');
																		const field = negate
																			? item.condition.slice(1)
																			: item.condition;
																		const val = Boolean(row[field]);
																		if (negate ? val : !val) {
																			return null;
																		}
																	}
																	if (!item.icon) {
																		// Loud, because the alternative is an invisible icon-only
																		// button - see IconButton's required `icon` prop below.
																		console.warn(
																			'[DataTable] action "%s" has no icon: falling back to a text button. Row actions render icon-only; pass an `icon` to use that.',
																			item.action
																		);
																		return (
																			<Button
																				key={ii}
																				type="button"
																				variant={item.variant ?? 'ghost'}
																				size="sm"
																				loading={isRowActionPending(item.action, row, actionPending, actionPendingRows)}
																				aria-busy={isRowActionPending(item.action, row, actionPending, actionPendingRows) || undefined}
																				onClick={() => onAction?.(item.action, row)}
																				aria-label={item.label}
																			>
																				{item.label}
																			</Button>
																		);
																	}
																	return (
																		<IconButton
																			key={ii}
																			icon={isRowActionPending(item.action, row, actionPending, actionPendingRows) ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : item.icon}
																			aria-label={item.label}
																			variant={item.variant ?? 'ghost'}
																			size="icon-xs"
																			disabled={isRowActionPending(item.action, row, actionPending, actionPendingRows)}
																			aria-busy={isRowActionPending(item.action, row, actionPending, actionPendingRows) || undefined}
																			onClick={() => onAction?.(item.action, row)}
																		/>
																	);
																})}
															</div>
														</td>
													);
												}
												const rendered = col.render(row);
												// Muted for metadata formats or explicit muted:true columns
												const isMuted =
													col.muted === true ||
													col.format === 'time' ||
													col.format === 'ms' ||
													col.format === 'datetime' ||
													col.format === 'date';
												// Content columns (no fixed width, not metadata) allow wrapping; others are nowrap
												const isFlexContent = !isMuted && !col.width && !col.truncate && !col.nowrap;
												return (
													<td
														key={col.key}
														className={[
															'px-3 py-1.5',
															isMuted
																? 'text-muted whitespace-nowrap'
																: 'text-content',
															col.mono ? 'font-mono text-sm' : '',
															isFlexContent ? 'break-all' : 'whitespace-nowrap',
															col.truncate ? 'max-w-xs truncate' : '',
														]
															.filter(Boolean)
															.join(' ')}
														style={col.width ? { width: `${col.width * 4}px` } : undefined}
														title={col.cellTitle?.(row) ?? (col.truncate && typeof rendered === 'string' ? rendered : undefined)}
													>
														{rendered}
													</td>
												);
											})}
										</tr>
										{expansion && expandedRow === stableKey && renderNode && (
											<tr className="bg-bg-secondary">
												{/* Spans the expansion toggle column (always present here) and the selection column when shown. */}
												<td colSpan={normalizedColumns.length + 1 + (selectable ? 1 : 0)} className="px-3 py-2">
													{renderNode(expansion, { row })}
												</td>
											</tr>
										)}
									</React.Fragment>
									);
								})
							)}
						</tbody>
					</table>
					{/* In flow but after the rows: selecting a row must never push the rows down under the pointer. */}
					{batchActionsPosition === 'bottom' && batchToolbar}
				</div>
				{batchActionsPosition === 'floating' && batchToolbar}
			</DataTableFilterCtx.Provider>
		</DataTableSelectionCtx.Provider>
	);
}
