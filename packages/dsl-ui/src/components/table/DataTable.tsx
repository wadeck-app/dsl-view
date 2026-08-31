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
 *   - App-specific column formats (e.g. "expiry countdown", "revoked badge") → put in the
 *     app's own ColumnHelpers (e.g. WdriveColumnHelpers in dsl-ui-wdrive)
 *   - Business logic or domain knowledge (HTTP status conventions are an accepted exception
 *     because they are a universal web standard, not app-specific)
 *   - Formatting that encodes app state (e.g. "Auto-deletes in N days" is wdrive-specific)
 */
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown } from 'lucide-react';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { Button } from '../controls/_Button.js';
import { Checkbox } from '../controls/Checkbox.js';
import { HttpMethodBadge } from '../display/HttpMethodBadge.js';
import { HttpStatusBadge } from '../display/HttpStatusBadge.js';
import { formatBytes } from '../../utils/formatBytes.js';
import { RouterContext } from '../../RouterContext.js';
import { buildTemplatedPath } from '../../utils/templatedPath.js';

// Local alias matching dsl-engine's DslRawNode = Record<string, unknown>
type DslRawNode = Record<string, unknown>;

export type SortDir = 'asc' | 'desc';

// Column value formats with a dedicated render path (formatValue) or a custom swatch (httpMethod/httpStatus)
export type ColumnValueFormat = 'datetime' | 'date' | 'time' | 'bytes' | 'ms';
export type ColumnFormat = ColumnValueFormat | 'httpMethod' | 'httpStatus';

// ─── Filter context ───────────────────────────────────────────────────────────

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

// ─── Selection context ────────────────────────────────────────────────────────

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

// ─── Formatting helpers ───────────────────────────────────────────────────────


function formatValue(val: unknown, format: ColumnValueFormat | undefined): string {
	if (val === null || val === undefined) {
		return '';
	}
	switch (format) {
		case 'datetime':
			return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(String(val)));
		case 'date':
			return new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(new Date(String(val)));
		case 'time':
			return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(String(val)));
		case 'bytes':
			return formatBytes(Number(val));
		case 'ms':
			return `${val}ms`;
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
			if (!customPredicate(row, value)) return false;
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

// ─── YAML column normalization ────────────────────────────────────────────────
// Converts raw YAML column defs (from DSL entries) to proper TableColumn objects.
// A raw YAML column may look like: { field: 'title', label: 'Title' }
// or an actions column: { type: 'actions', items: [{ label: 'Edit', action: 'openEdit' }] }

interface RawYamlColumn {
	field?: string;
	label?: string;
	type?: string;
	items?: Array<{ label: string; action: string; variant?: string; condition?: string }>;
	render?: (row: Record<string, unknown>) => React.ReactNode;
	key?: string;
	isActions?: boolean;
	actions?: unknown[];
}

function normalizeColumn<T extends Record<string, unknown>>(col: RawYamlColumn): TableColumn<T> {
	// Already a proper TableColumn (has render function)
	if (typeof col.render === 'function') return col as unknown as TableColumn<T>;
	// Actions column
	if (col.type === 'actions' || col.isActions) {
		return {
			key: '_actions',
			label: '',
			isActions: true,
			actions: (col.items ?? col.actions ?? []) as ActionDef<T>[],
			render: () => null,
		};
	}
	// Plain field column
	const field = col.field ?? col.key ?? '';
	return {
		key: field,
		label: col.label ?? field,
		render: (row: T) => String(row[field] ?? ''),
	};
}

// ─── TableColumn<T> and ColumnHelpers<T> ──────────────────────────────────────

export interface ActionDef<T extends Record<string, unknown>> {
	label: string;
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
	sortable?: boolean;
	isActions?: boolean;
	actions?: ActionDef<T>[];
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
const theadRowClass = 'border-b border-border text-left text-xs text-muted';
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
			render: row => formatBytes(Number(row[key])),
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

// ─── DataTable<T> ─────────────────────────────────────────────────────────────

export interface DataTableProps<T extends Record<string, unknown>> {
	rows: T[];
	columns: TableColumn<T>[];
	loading?: boolean;
	emptyMessage?: string;
	onAction?: (action: string, row: T) => void;
	/** Path template (e.g. `/files/{id}`) interpolated from the clicked row - navigated to via RouterContext. */
	navigateTo?: string;
	/** @slot tag:filter */
	filtersTop?: React.ReactNode;
	/** @slot tag:filter */
	filters?: React.ReactNode;
	id?: string;
	page?: number;
	onPageChange?: (page: number) => void;
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
	/** Called when a batch action is triggered with the selected rows. */
	onBatchAction?: (actionName: string, rows: T[]) => void;
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
	emptyMessage = 'No items',
	onAction,
	navigateTo,
	filtersTop,
	filters,
	id,
	page,
	onPageChange,
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
	expansionCondition,
	fontMono = false,
}: DataTableProps<T>) {
	// Normalize columns: accept either proper TableColumn[] (from ColumnHelpers) or raw YAML
	// column defs (from DSL entriesGenerator). This allows declarative YAML to drive DataTable
	// without requiring ColumnHelpers in every call site.
	const normalizedColumns = useMemo(
		() => (columns ?? []).map(col => normalizeColumn<T>(col as unknown as RawYamlColumn)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[columns]
	);

	const router = useContext(RouterContext);
	const handleRowClick = navigateTo
		? (row: T) => router?.navigate(buildTemplatedPath(navigateTo, row))
		: undefined;

	// Independent controlled/uncontrolled pairs (replacing the old single all-or-nothing
	// DataTableState) - each falls back to its own local useState when the matching
	// on*Change prop is absent, matching the mechanical urlBackedPair codegen's own per-pair
	// controlled/uncontrolled convention.
	const [internalPage, setInternalPage] = useState(0);
	const _activePage = page ?? internalPage;
	function handlePageChange(next: number) {
		if (onPageChange) {
			onPageChange(next);
		} else {
			setInternalPage(next);
		}
	}

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
		if (Object.keys(filterState).length === 0) return rows;
		return rows.filter(row => applyFilters(row, filterState, predicatesRef.current));
	}, [rows, filterState]);

	// Initialise from the controlled sortCol/sortDir so sort persists across page reloads
	const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(
		activeSortCol ? { key: activeSortCol, dir: activeSortDir } : null
	);

	const sortedRows = useMemo(() => {
		if (!sort) return filteredRows;
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

	// ─── Selection state ──────────────────────────────────────────────────────────
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const toggleRow = useCallback((id: string) => {
		setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
	}, []);

	const toggleAll = useCallback((allIds: string[]) => {
		setSelectedIds(prev => (prev.length === allIds.length ? [] : allIds));
	}, []);

	const clearSelection = useCallback(() => setSelectedIds([]), []);

	// Derive current page row IDs for select-all calculation
	const currentPageIds = sortedRows.map(row => String(row['id'] ?? ''));
	const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));
	const someSelected = selectedIds.length > 0 && !allSelected;

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
					{selectable && selectedIds.length > 0 && batchActions.length > 0 && (
						<div
							className={batchToolbarClass}
							role="toolbar"
							aria-label="Batch actions"
						>
							<span className="text-sm font-medium text-primary">
								{selectedIds.length} selected
							</span>
							{batchActions.map(action => (
								<Button
									key={action.action}
									type="button"
									variant={action.variant ?? 'ghost'}
									size="sm"
									onClick={() => {
										const selectedRows = rows.filter(r =>
											selectedIds.includes(String(r['id'] ?? ''))
										);
										onBatchAction?.(action.action, selectedRows);
										clearSelection();
									}}
								>
									{action.label}
								</Button>
							))}
						</div>
					)}
					<table className="w-full text-sm">
						<thead>
							<tr className={theadRowClass}>
								{selectable && (
									<th className="w-8 px-3 py-2">
										<Checkbox
											checked={allSelected}
											ref={el => {
												if (el) el.indeterminate = someSelected;
											}}
											onChange={() => toggleAll(currentPageIds)}
											aria-label="Select all rows on this page"
											className="cursor-pointer"
										/>
									</th>
								)}
								{expansion && <th className="w-8" />}
								{normalizedColumns.map(col => {
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
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="select-none"
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
												>
													{col.label}{' '}
													<SortIcon
														className={`h-3 w-3 ${!isActive ? 'opacity-30' : ''}`}
														aria-hidden="true"
													/>
												</Button>
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
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={normalizedColumns.length + (expansion ? 1 : 0) + (selectable ? 1 : 0)}>
										<div className="flex flex-col items-center justify-center py-16 text-muted">
											<span className="sr-only">Loading...</span>
											<div className="w-full max-w-xs space-y-2 animate-pulse px-8">
												{[1, 2, 3].map(i => (
													<div key={i} className="h-4 rounded bg-bg-secondary" />
												))}
											</div>
										</div>
									</td>
								</tr>
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
									const stableKey = row['id'] ?? row['key'] ?? ri;
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
												<td className="w-8 px-3 py-1.5 text-center">
													<Checkbox
														checked={selectedIds.includes(String(row['id'] ?? ''))}
														onChange={e => {
															e.stopPropagation();
															toggleRow(String(row['id'] ?? ''));
														}}
														onClick={e => e.stopPropagation()}
														aria-label={`Select row ${String(row['id'] ?? ri)}`}
														className="cursor-pointer"
													/>
												</td>
											)}
											{expansion && (
												<td className="w-8 px-1 py-1.5 text-center">
													{(!expansionCondition || Boolean(row[expansionCondition])) && (
														<Button
															type="button"
															variant="ghost"
															size="sm"
															className="p-0"
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
																	return (
																		<Button
																			key={ii}
																			type="button"
																			variant={item.variant ?? 'ghost'}
																			size="sm"
																			onClick={() => onAction?.(item.action, row)}
																			aria-label={item.label}
																		>
																			{item.label}
																		</Button>
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
												const isFlexContent = !isMuted && !col.width && !col.truncate;
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
														title={col.truncate && typeof rendered === 'string' ? rendered : undefined}
													>
														{rendered}
													</td>
												);
											})}
										</tr>
										{expansion && expandedRow === stableKey && renderNode && (
											<tr className="bg-bg-secondary">
												<td colSpan={normalizedColumns.length + 1} className="px-3 py-2">
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
				</div>
			</DataTableFilterCtx.Provider>
		</DataTableSelectionCtx.Provider>
	);
}
