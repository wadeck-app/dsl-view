import { ColumnHelpers } from '../components/table/DataTable.js';
import type { TableColumn } from '../components/table/DataTable.js';

/**
 * The `format` values a DataTable YAML column can declare, dispatched here to the matching
 * `ColumnHelpers` static method - one method per format, named identically to the format value
 * itself. Domain-specific formats (e.g. wdrive's 'expiry'/'revokedBadge') are NOT resolved here;
 * callers merge their own domain-specific dispatch table on top via `resolveColumns`'s
 * `extraFormats` parameter (see `WdriveColumnHelpers` usage in dsl-wdrive-app).
 */
export interface YamlDataColumn {
	field: string;
	label: string;
	format?: string;
	mono?: boolean;
	muted?: boolean;
	truncate?: boolean;
	sortable?: boolean;
	width?: number;
}

export interface YamlActionsColumn {
	type: 'actions';
	label?: string;
	width?: number;
	items: Array<{ label: string; variant?: 'primary' | 'danger' | 'danger-outline' | 'ghost' | 'success'; action: string; condition?: string }>;
}

export type YamlColumn = YamlDataColumn | YamlActionsColumn;

type ColumnHelperFn<T extends Record<string, unknown>> = (key: keyof T & string, label: string, options: Record<string, unknown>) => TableColumn<T>;

/**
 * Resolves one YAML column definition into a real `TableColumn`, dispatching by `format` to the
 * matching `ColumnHelpers` static method (same name as the format value) when present, falling
 * back to `ColumnHelpers.text` for a plain/unrecognized format. `extraFormats` lets a caller
 * (e.g. a domain-specific package) merge additional format→helper mappings without this module
 * needing to know about domain-specific column types.
 */
export function resolveColumn<T extends Record<string, unknown>>(
	col: YamlColumn,
	extraFormats: Record<string, ColumnHelperFn<T>> = {}
): TableColumn<T> {
	if ((col as YamlActionsColumn).type === 'actions') {
		const ac = col as YamlActionsColumn;
		return ColumnHelpers.actions(
			ac.items.map(item => ({ label: item.label, variant: item.variant, action: item.action, condition: item.condition }))
		);
	}
	const dc = col as YamlDataColumn;
	const options = { mono: dc.mono, muted: dc.muted, truncate: dc.truncate, width: dc.width, format: dc.format };
	const key = dc.field as keyof T & string;

	if (dc.format && dc.format in extraFormats) {
		return extraFormats[dc.format]!(key, dc.label, options);
	}

	// `datetime`/`date`/`time`/`ms` aren't their own ColumnHelpers methods - they're sub-values
	// of `ColumnHelpers.date`'s/`.number`'s own `format` option, not a same-named static method
	// (unlike `httpMethod`/`httpStatus`/`bytes`, which ARE named identically to their format
	// value). Both branches are dispatched by format value, never by component/prop name.
	if (dc.format === 'datetime' || dc.format === 'date' || dc.format === 'time') {
		const built = ColumnHelpers.date<T>(key, dc.label, { format: dc.format, width: dc.width });
		if (dc.mono) built.mono = dc.mono;
		if (dc.muted) built.muted = dc.muted;
		if (dc.truncate) built.truncate = dc.truncate;
		if (dc.sortable) built.sortable = dc.sortable;
		return built;
	}
	if (dc.format === 'ms') {
		const built = ColumnHelpers.number<T>(key, dc.label, { format: 'ms', width: dc.width });
		if (dc.mono) built.mono = dc.mono;
		if (dc.muted) built.muted = dc.muted;
		if (dc.truncate) built.truncate = dc.truncate;
		if (dc.sortable) built.sortable = dc.sortable;
		return built;
	}
	// httpMethod/httpStatus only forward mono/truncate (never muted/sortable) as constructor
	// options, and bytes only forwards width - matching the original hand-written
	// entriesGenerator.ts logic exactly (real callers never sort by or mute those columns today).
	if (dc.format === 'httpMethod' || dc.format === 'httpStatus') {
		const helperOptions = { mono: dc.mono, truncate: dc.truncate, width: dc.width };
		return dc.format === 'httpMethod'
			? ColumnHelpers.httpMethod<T>(key, dc.label, helperOptions)
			: ColumnHelpers.httpStatus<T>(key, dc.label, helperOptions);
	}
	if (dc.format === 'bytes') {
		return ColumnHelpers.bytes<T>(key, dc.label, { width: dc.width });
	}
	const textCol = ColumnHelpers.text<T>(key, dc.label, options);
	if (dc.sortable) textCol.sortable = dc.sortable;
	return textCol;
}

export function resolveColumns<T extends Record<string, unknown>>(
	cols: YamlColumn[],
	extraFormats: Record<string, ColumnHelperFn<T>> = {}
): TableColumn<T>[] {
	return cols.map(col => resolveColumn(col, extraFormats));
}
