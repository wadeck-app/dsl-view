import { describe, expect, it } from 'vitest';

import { ColumnHelpers } from './DataTable.js';

interface LogEntry {
	ts: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	path: string;
	status: number;
	duration_ms: number;
}

describe('ColumnHelpers', () => {
	const row: LogEntry = {
		ts: '2026-06-13T10:23:01Z',
		method: 'GET',
		path: '/api/files',
		status: 200,
		duration_ms: 45,
	};

	describe('text', () => {
		it('renders a string field', () => {
			const col = ColumnHelpers.text<LogEntry>('method', 'Method');
			expect(col.key).toBe('method');
			expect(col.label).toBe('Method');
			expect(col.render(row)).toBe('GET');
		});

		it('supports mono and truncate options', () => {
			const col = ColumnHelpers.text<LogEntry>('path', 'Path', { mono: true, truncate: true });
			expect(col.mono).toBe(true);
			expect(col.truncate).toBe(true);
		});

		it('supports width option', () => {
			const col = ColumnHelpers.text<LogEntry>('method', 'Method', { width: 20 });
			expect(col.width).toBe(20);
		});
	});

	describe('date', () => {
		it('formats datetime by default', () => {
			const col = ColumnHelpers.date<LogEntry>('ts', 'Time');
			expect(col.format).toBe('datetime');
			const rendered = col.render(row);
			expect(typeof rendered).toBe('string');
			expect(String(rendered).length).toBeGreaterThan(0);
		});

		it('formats date when specified', () => {
			const col = ColumnHelpers.date<LogEntry>('ts', 'Time', { format: 'date' });
			expect(col.format).toBe('date');
		});
	});

	describe('bytes', () => {
		it('formats bytes value', () => {
			interface FileEntry {
				size: number;
				name: string;
			}
			const col = ColumnHelpers.bytes<FileEntry>('size', 'Size');
			expect(col.format).toBe('bytes');
			expect(col.render({ size: 1024, name: 'test' })).toBe('1.0 KB');
			expect(col.render({ size: 512, name: 'test' })).toBe('512 B');
		});
	});

	describe('number', () => {
		it('renders numeric field', () => {
			const col = ColumnHelpers.number<LogEntry>('duration_ms', 'Duration', { format: 'ms' });
			expect(col.format).toBe('ms');
			expect(col.render(row)).toBe('45ms');
		});

		it('renders plain number without format', () => {
			const col = ColumnHelpers.number<LogEntry>('status', 'Status');
			expect(col.render(row)).toBe('200');
		});
	});

	describe('actions', () => {
		it('creates an actions column', () => {
			const col = ColumnHelpers.actions<LogEntry>([{ label: 'Delete', action: 'delete', variant: 'danger' }]);
			expect(col.key).toBe('_actions');
			expect(col.isActions).toBe(true);
			expect(col.actions).toHaveLength(1);
			expect(col.actions![0].action).toBe('delete');
		});
	});
});
