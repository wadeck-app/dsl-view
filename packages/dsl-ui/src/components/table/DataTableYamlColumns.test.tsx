import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	DATA_TABLE_ACTION_ITEM_KEYS,
	DATA_TABLE_ACTIONS_COLUMN_KEYS,
	DATA_TABLE_COLUMN_KEYS,
	DATA_TABLE_LINK_COLUMN_KEYS,
	DataTable,
} from './DataTable.js';
import type { TableColumn } from './DataTable.js';

type Row = Record<string, unknown>;

// What GenericPageRunner hands to DataTable: the raw YAML maps, not ColumnHelpers objects.
const yamlColumns = (cols: Array<Record<string, unknown>>) => cols as unknown as TableColumn<Row>[];

function cell(text: string): HTMLElement {
	return screen.getByText(text).closest('td') as HTMLElement;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('DataTable YAML column options', () => {
	const rows: Row[] = [{ id: '1', state: 'completed', note: 'a long value', at: '2026-10-19T10:30:00Z', size: 2048 }];

	it('passes width through as a fixed width and never wraps such a column', () => {
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'state', label: 'State', width: 24 }])} />);
		const td = cell('completed');
		expect(td.style.width).toBe('96px');
		expect(td.className).toContain('whitespace-nowrap');
		expect(td.className).not.toContain('break-all');
	});

	it('nowrap keeps the cell on one line instead of breaking mid-word', () => {
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'state', label: 'State', nowrap: true }])} />);
		const td = cell('completed');
		expect(td.className).toContain('whitespace-nowrap');
		expect(td.className).not.toContain('break-all');
	});

	it('keeps the existing wrapping for a plain column (default look unchanged)', () => {
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'state', label: 'State' }])} />);
		expect(cell('completed').className).toContain('break-all');
	});

	it('truncate adds an ellipsis and the full text as tooltip', () => {
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'note', label: 'Note', truncate: true }])} />);
		const td = cell('a long value');
		expect(td.className).toContain('truncate');
		expect(td.getAttribute('title')).toBe('a long value');
	});

	it('mono and muted reach the cell', () => {
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'state', label: 'State', mono: true, muted: true }])} />);
		const td = cell('completed');
		expect(td.className).toContain('font-mono');
		expect(td.className).toContain('text-muted');
	});

	it('format renders the value instead of the raw string', () => {
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'size', label: 'Size', format: 'bytes' }])} />);
		expect(screen.getByText('2.0 KB')).toBeInTheDocument();
		expect(screen.queryByText('2048')).not.toBeInTheDocument();
	});

	it('sortable shows the sort control', () => {
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'state', label: 'State', sortable: true }])} />);
		fireEvent.click(screen.getByRole('button', { name: 'Sort by State' }));
		expect(screen.getByRole('button', { name: 'Sort by State' })).toBeInTheDocument();
	});

	it('an unknown format is reported and the raw value stays visible', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={rows} columns={yamlColumns([{ field: 'state', label: 'State', format: 'bogus-format' }])} />);
		expect(screen.getByText('completed')).toBeInTheDocument();
		expect(error).toHaveBeenCalledWith(expect.stringContaining('unknown format "bogus-format"'));
	});
});

describe('DataTable YAML badge columns', () => {
	const rows: Row[] = [
		{ id: '1', state: 'completed' },
		{ id: '2', state: 'failed' },
		{ id: '3', state: 'mystery' },
	];
	const column = { field: 'state', label: 'State', badge: { completed: 'success', failed: 'danger' } };

	it('renders mapped values as badges and unmapped values as plain text', () => {
		render(<DataTable rows={rows} columns={yamlColumns([column])} />);
		const completed = screen.getByText('completed');
		expect(completed.tagName).toBe('SPAN');
		expect(completed.className).toContain('rounded-full');
		expect(screen.getByText('failed').className).toContain('rounded-full');
		const mystery = screen.getByText('mystery');
		expect(mystery.tagName).toBe('TD');
		expect(mystery.className).not.toContain('rounded-full');
	});

	it('maps different values to different variants', () => {
		render(<DataTable rows={rows} columns={yamlColumns([column])} />);
		expect(screen.getByText('completed').className).not.toBe(screen.getByText('failed').className);
	});

	it('reports a variant Badge does not know and falls back to the neutral one', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={[{ id: '1', state: 'completed' }]} columns={yamlColumns([{ ...column, badge: { completed: 'greeen' } }])} />);
		expect(screen.getByText('completed').className).toContain('rounded-full');
		expect(error).toHaveBeenCalledWith(expect.stringContaining('badge variant "greeen" is not one of'));
	});
});

describe('DataTable unsupported YAML column keys', () => {
	it('names the column, the key and the supported keys instead of ignoring it silently', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={[{ id: '1', state: 'x' }]} columns={yamlColumns([{ field: 'state', label: 'State', widht: 12 }])} />);
		expect(error).toHaveBeenCalledWith(expect.stringMatching(/column "state": unknown key "widht" is ignored\..*Supported keys for a data column: .*width/));
	});

	it('explains `$type: actions` columns (the key is `type`)', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={[{ id: '1' }]} columns={yamlColumns([{ $type: 'actions', label: 'Actions', items: [] }])} />);
		expect(error).toHaveBeenCalledWith(expect.stringContaining('Actions columns are written `type: actions`'));
	});

	it('checks the items of an actions column too', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={[{ id: '1' }]} columns={yamlColumns([{ type: 'actions', items: [{ label: 'Go', action: 'go', colour: 'red' }] }])} />);
		expect(error).toHaveBeenCalledWith(expect.stringContaining('item #0: unknown key "colour" is ignored'));
	});

	it('stays quiet for supported keys', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(
			<DataTable
				rows={[{ id: '1', state: 'x' }]}
				columns={yamlColumns([
					{ field: 'state', label: 'State', width: 8, mono: true },
					{ type: 'actions', items: [{ label: 'Go', action: 'go', variant: 'ghost', condition: 'id' }] },
				])}
			/>
		);
		expect(error).not.toHaveBeenCalled();
	});
});

describe('DATA_TABLE_*_KEYS vs the build tooling', () => {
	const here = path.dirname(fileURLToPath(import.meta.url));
	const generatorPath = path.resolve(here, '../../../../dsl-renderer/dist/build/entriesGenerator.js');

	it('list exactly the keys the unknown-key check extracts from the column interfaces', async () => {
		if (!fs.existsSync(generatorPath)) {
			throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { generateKnownKeysManifest } = await import(/* @vite-ignore */ generatorPath);
		const manifest = generateKnownKeysManifest([path.resolve(here, '..')]);
		const spec = manifest['DataTable'].itemKeys.columns;
		expect([...spec.keys].sort()).toEqual([...DATA_TABLE_COLUMN_KEYS].sort());
		expect([...spec.byType.actions.keys].sort()).toEqual([...DATA_TABLE_ACTIONS_COLUMN_KEYS].sort());
		expect([...spec.byType.link.keys].sort()).toEqual([...DATA_TABLE_LINK_COLUMN_KEYS].sort());
		expect([...spec.byType.actions.arrays.items.keys].sort()).toEqual([...DATA_TABLE_ACTION_ITEM_KEYS].sort());
		// ts-morph parses every component under ../ : give slower CI machines room.
	}, 120_000);
});
