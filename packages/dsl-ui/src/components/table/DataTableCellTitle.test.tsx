import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable.js';
import type { TableColumn } from './DataTable.js';

type Row = Record<string, unknown>;

const yamlColumns = (cols: Array<Record<string, unknown>>) => cols as unknown as TableColumn<Row>[];
const cell = (text: string): HTMLElement => screen.getByText(text).closest('td') as HTMLElement;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('DataTable column `title` (cell tooltip from a row template)', () => {
	const rows: Row[] = [
		{ id: '1', seen: '3m ago', lastSeenAt: '2026-10-24T10:30:00Z', description: 'Handles refunds' },
		{ id: '2', seen: '1h ago', lastSeenAt: '', description: null },
	];

	it('sets the title attribute of the cell from the row, unencoded', () => {
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'seen', label: 'Seen', title: 'Last seen {lastSeenAt} / {description}' }])} />);
		expect(cell('3m ago').getAttribute('title')).toBe('Last seen 2026-10-24T10:30:00Z / Handles refunds');
	});

	it('leaves the attribute out, and logs nothing, when the row has no usable value', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'seen', label: 'Seen', title: '{lastSeenAt}' }])} />);
		expect(cell('1h ago').hasAttribute('title')).toBe(false);
		// the other row of the same column still has its tooltip
		expect(cell('3m ago').getAttribute('title')).toBe('2026-10-24T10:30:00Z');
		expect(error).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
	});

	it('does not leak a prototype member into the tooltip', () => {
		render(<DataTable rows={[rows[0]!]} columns={yamlColumns([{ field: 'seen', label: 'Seen', title: '{constructor}' }])} />);
		expect(cell('3m ago').hasAttribute('title')).toBe(false);
	});

	it('wins over the title that truncate derives from the cell text', () => {
		render(<DataTable rows={[rows[0]!]} columns={yamlColumns([{ field: 'seen', label: 'Seen', truncate: true, title: '{description}' }])} />);
		expect(cell('3m ago').getAttribute('title')).toBe('Handles refunds');
	});

	it('falls back to the truncate title for a row whose explicit title is missing', () => {
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'seen', label: 'Seen', truncate: true, title: '{lastSeenAt}' }])} />);
		expect(cell('1h ago').getAttribute('title')).toBe('1h ago');
		expect(cell('3m ago').getAttribute('title')).toBe('2026-10-24T10:30:00Z');
	});

	it('combines with href: the cell keeps its link and carries the tooltip', () => {
		render(<DataTable rows={[rows[0]!]} columns={yamlColumns([{ field: 'seen', label: 'Seen', href: '/runs/{id}', title: 'Run {id}: {description}' }])} />);
		const link = screen.getByRole('link', { name: '3m ago' });
		expect(link.getAttribute('href')).toBe('/runs/1');
		expect(link.closest('td')!.getAttribute('title')).toBe('Run 1: Handles refunds');
	});

	it('combines with format: the formatted value is shown and the tooltip is the template', () => {
		render(<DataTable rows={[rows[0]!]} columns={yamlColumns([{ field: 'lastSeenAt', label: 'At', format: 'date', title: 'raw {lastSeenAt}' }])} />);
		const td = screen.getAllByRole('cell')[0]!;
		expect(td.getAttribute('title')).toBe('raw 2026-10-24T10:30:00Z');
		expect(td.textContent).not.toBe('2026-10-24T10:30:00Z');
		expect(td.textContent).not.toBe('');
	});

	it('says so, once, when `title` is not a text template, and shows no tooltip', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={[rows[0]!]} columns={yamlColumns([{ field: 'seen', label: 'Seen', title: 12 }])} />);
		expect(cell('3m ago').hasAttribute('title')).toBe(false);
		expect(error).toHaveBeenCalledWith(expect.stringContaining('column "seen": `title` must be a text template'));
	});

	it('accepts `title` as a column key (no unknown-key error)', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={[rows[0]!]} columns={yamlColumns([{ field: 'seen', label: 'Seen', title: '{seen}' }])} />);
		expect(error).not.toHaveBeenCalled();
	});

	it('does not make the cell focusable: a title is a hover hint, not essential information', () => {
		render(<DataTable rows={[rows[0]!]} columns={yamlColumns([{ field: 'seen', label: 'Seen', title: '{description}' }])} />);
		expect(cell('3m ago').hasAttribute('tabindex')).toBe(false);
	});
});
