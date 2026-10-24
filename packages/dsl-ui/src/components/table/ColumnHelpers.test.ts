import { describe, expect, it } from 'vitest';

import { ColumnHelpers } from './DataTable.js';

/*
 * A type alias, not an interface. `ColumnHelpers.*` is generic over `T extends Record<string,
 * unknown>`, and only an object type literal gets the implicit index signature that satisfies it --
 * an interface does not, so every call here was an error the moment the tests were type-checked.
 * Row types passed to DataTable have to be declared this way.
 */
type LogEntry = {
	ts: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	path: string;
	status: number;
	duration_ms: number;
};

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

	describe('text edge cases', () => {
		it('renders a missing or null field as an empty string, and 0 / false as text', () => {
			type Loose = { a?: string | null; n?: number; b?: boolean };
			const a = ColumnHelpers.text<Loose>('a', 'A');
			const n = ColumnHelpers.text<Loose>('n', 'N');
			const b = ColumnHelpers.text<Loose>('b', 'B');
			expect(a.render({})).toBe('');
			expect(a.render({ a: null })).toBe('');
			expect(n.render({ n: 0 })).toBe('0');
			expect(b.render({ b: false })).toBe('false');
		});

		it('keeps muted without turning on mono or truncate', () => {
			const col = ColumnHelpers.text<LogEntry>('path', 'Path', { muted: true });
			expect(col.muted).toBe(true);
			expect(col.mono).toBeUndefined();
			expect(col.truncate).toBeUndefined();
		});
	});

	describe('date', () => {
		// Built from local components: the expectations hold in any time zone and locale.
		const local = new Date(2026, 0, 5, 14, 5);
		const entry = { ts: local.toISOString() };
		const render = (format?: 'date' | 'time' | 'datetime') =>
			ColumnHelpers.date<{ ts: string }>('ts', 'Time', format ? { format } : {}).render(entry) as string;

		it('formats datetime by default: both the date part and the time part appear', () => {
			expect(ColumnHelpers.date<{ ts: string }>('ts', 'Time').format).toBe('datetime');
			const rendered = render();
			expect(rendered).toContain(render('date'));
			expect(rendered).toContain(render('time'));
		});

		it('formats date when specified: no clock in it', () => {
			const col = ColumnHelpers.date<{ ts: string }>('ts', 'Time', { format: 'date' });
			expect(col.format).toBe('date');
			expect(render('date')).not.toContain(':');
			expect(render('date')).toMatch(/26/);
		});

		it('formats time when specified: the clock only', () => {
			expect(render('time')).toMatch(/05/);
			expect(render('time')).not.toMatch(/26/);
		});

		it('shows an unparsable date as it came and a missing one as empty, instead of throwing', () => {
			const col = ColumnHelpers.date<{ ts?: string | null }>('ts', 'Time');
			expect(col.render({ ts: 'not a date' })).toBe('not a date');
			expect(col.render({ ts: null })).toBe('');
			expect(col.render({})).toBe('');
		});
	});

	describe('bytes', () => {
		it('formats bytes value', () => {
			// A type alias for the same reason as LogEntry above.
			type FileEntry = {
				size: number;
				name: string;
			};
			const col = ColumnHelpers.bytes<FileEntry>('size', 'Size');
			expect(col.format).toBe('bytes');
			expect(col.render({ size: 1024, name: 'test' })).toBe('1.0 KB');
			expect(col.render({ size: 512, name: 'test' })).toBe('512 B');
		});

		it('keeps a missing size empty instead of printing "0 B"', () => {
			const col = ColumnHelpers.bytes<{ size?: number | null }>('size', 'Size');
			expect(col.render({})).toBe('');
			expect(col.render({ size: null })).toBe('');
			expect(col.render({ size: 0 })).toBe('0 B');
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

		it('renders zero with its unit and a missing value as empty (no "undefinedms")', () => {
			const col = ColumnHelpers.number<{ n?: number | null }>('n', 'N', { format: 'ms' });
			expect(col.render({ n: 0 })).toBe('0ms');
			expect(col.render({})).toBe('');
			expect(col.render({ n: null })).toBe('');
		});
	});

	describe('actions', () => {
		it('creates an actions column', () => {
			const col = ColumnHelpers.actions<LogEntry>([{ label: 'Delete', icon: null, action: 'delete', variant: 'danger' }]);
			expect(col.key).toBe('_actions');
			expect(col.isActions).toBe(true);
			expect(col.actions).toHaveLength(1);
			expect(col.actions![0].action).toBe('delete');
		});
	});
});
