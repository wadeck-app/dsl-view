import { describe, expect, it } from 'vitest';
import { resolveColumn, resolveColumns } from './columnMapping.js';

function strip(col: { render: unknown; [key: string]: unknown }) {
	const { render, ...rest } = col;
	return rest;
}

describe('resolveColumn', () => {
	it('dispatches httpMethod format, forwarding only mono/truncate/width (never muted/sortable)', () => {
		const col = resolveColumn({
			field: 'method', label: 'Method', format: 'httpMethod', mono: true, truncate: true, sortable: true, muted: true,
		});
		expect(strip(col)).toEqual({ key: 'method', label: 'Method', format: 'httpMethod', mono: true, truncate: true, width: undefined });
	});

	it('dispatches httpStatus format, forwarding only mono/truncate/width', () => {
		const col = resolveColumn({ field: 'status', label: 'Status', format: 'httpStatus', sortable: true });
		expect(strip(col)).toEqual({ key: 'status', label: 'Status', format: 'httpStatus', mono: undefined, truncate: undefined, width: undefined });
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
		expect(col.actions).toEqual([{ label: 'Delete', variant: 'danger', action: 'delete', condition: undefined }]);
	});

	it('dispatches an unrecognized format via extraFormats before falling back to generic handling', () => {
		const extraFormats = {
			custom: (key: string, label: string) => ({ key, label, render: () => null }),
		};
		const col = resolveColumn({ field: 'x', label: 'X', format: 'custom' }, extraFormats);
		expect(col.key).toBe('x');
		expect(col.label).toBe('X');
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
