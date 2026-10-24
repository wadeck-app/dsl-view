import { describe, expect, it, vi } from 'vitest';
import { resolveColumn, resolveColumns } from './columnMapping.js';
import type { TableColumn } from '../components/table/DataTable.js';

/**
 * The resolved column minus `render`, which is a function and so not worth comparing structurally.
 *
 * Typed as the `TableColumn` it is actually handed. The previous `{ render: unknown; [key: string]:
 * unknown }` demanded an index signature that `TableColumn` - an interface - does not have, so every
 * call site here was an error as soon as the tests were type-checked.
 */
function strip(col: TableColumn<Record<string, unknown>>) {
	const { render, ...rest } = col;
	return rest;
}

describe('resolveColumn', () => {
	it('treats the former httpMethod / httpStatus formats as unrecognized: a plain text column, sortable kept', () => {
		// They moved out of dsl-ui: an app that wants them registers them (registerColumnFormat) or passes extraFormats.
		const col = resolveColumn({ field: 'method', label: 'Method', format: 'httpMethod', mono: true, sortable: true });
		expect(strip(col)).toEqual({ key: 'method', label: 'Method', mono: true, muted: undefined, truncate: undefined, width: undefined, sortable: true });
	});

	it('dispatches bytes format, forwarding only width', () => {
		const col = resolveColumn({ field: 'size', label: 'Size', format: 'bytes', sortable: true, mono: true });
		expect(strip(col)).toEqual({ key: 'size', label: 'Size', format: 'bytes', width: undefined });
	});

	it('dispatches datetime/date/time formats via ColumnHelpers.date, then merges mono/muted/truncate/sortable', () => {
		const col = resolveColumn({ field: 'ts', label: 'Time', format: 'datetime', mono: true, sortable: true });
		expect(strip(col)).toEqual({ key: 'ts', label: 'Time', format: 'datetime', width: undefined, mono: true, sortable: true });
	});

	it('dispatches ms format via ColumnHelpers.number, then merges mono/muted/truncate/sortable', () => {
		const col = resolveColumn({ field: 'dur', label: 'Duration', format: 'ms', muted: true });
		expect(strip(col)).toEqual({ key: 'dur', label: 'Duration', format: 'ms', width: undefined, muted: true });
	});

	it('falls back to plain text for no/unrecognized format, forwarding mono/muted/truncate/sortable', () => {
		const col = resolveColumn({ field: 'name', label: 'Name', sortable: true, truncate: true });
		expect(strip(col)).toEqual({ key: 'name', label: 'Name', mono: undefined, muted: undefined, truncate: true, width: undefined, sortable: true });
	});

	it('resolves an actions column via ColumnHelpers.actions', () => {
		const col = resolveColumn({ type: 'actions', items: [{ label: 'Delete', action: 'delete', variant: 'danger' }] });
		expect(col.isActions).toBe(true);
		expect(col.actions).toEqual([{ label: 'Delete', icon: undefined, variant: 'danger', action: 'delete', condition: undefined }]);
	});

	it('keeps the declared width of an actions column, and leaves it unset when none is declared', () => {
		const items = [{ label: 'Delete', action: 'delete' }];
		expect(resolveColumn({ type: 'actions', items, width: 24 }).width).toBe(24);
		expect(resolveColumn({ type: 'actions', items, width: 0 }).width).toBe(0);
		expect(resolveColumn({ type: 'actions', items })).not.toHaveProperty('width');
	});

	it('dispatches an unrecognized format via extraFormats before falling back to generic handling', () => {
		const built = { key: 'x', label: 'X', render: () => null };
		const custom = vi.fn(() => built);
		const col = resolveColumn(
			{ field: 'x', label: 'X', format: 'custom', mono: true, muted: true, truncate: true, width: 12, sortable: true },
			{ custom }
		);
		expect(col).toBe(built);
		expect(custom).toHaveBeenCalledExactlyOnceWith('x', 'X', { mono: true, muted: true, truncate: true, width: 12, format: 'custom' });
	});

	it('lets an extra format take over a built-in one of the same name', () => {
		const built = { key: 'size', label: 'Size', render: () => 'custom' };
		const col = resolveColumn({ field: 'size', label: 'Size', format: 'bytes' }, { bytes: () => built });
		expect(col).toBe(built);
	});

	// `in` also sees Object.prototype: a YAML `format: constructor` must be an unknown format, not a call to Object().
	it('does not take inherited object members for extra formats: they fall back to plain text', () => {
		for (const format of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
			const col = resolveColumn({ field: 'x', label: 'X', format }, {});
			expect(col.render({ x: 'v' })).toBe('v');
		}
	});

	it('ignores the format entirely when extraFormats is empty and the format is unknown', () => {
		const col = resolveColumn({ field: 'n', label: 'N', format: 'nope', sortable: true });
		expect(col.render({ n: 3 })).toBe('3');
		expect(col.sortable).toBe(true);
	});

	it('keeps falsy flags off the column instead of writing false onto it (date and ms branches)', () => {
		const date = resolveColumn({ field: 'ts', label: 'T', format: 'date', mono: false, muted: false, truncate: false, sortable: false });
		const ms = resolveColumn({ field: 'd', label: 'D', format: 'ms', mono: false, sortable: false });
		for (const col of [date, ms]) {
			expect('mono' in col).toBe(false);
			expect('muted' in col).toBe(false);
			expect('truncate' in col).toBe(false);
			expect('sortable' in col).toBe(false);
		}
	});
});

describe('resolveColumns', () => {
	it('maps an array of YAML columns in order', () => {
		const cols = resolveColumns([
			{ field: 'a', label: 'A' },
			{ field: 'b', label: 'B', format: 'bytes' },
		]);
		expect(cols.map(c => c.key)).toEqual(['a', 'b']);
	});
});
