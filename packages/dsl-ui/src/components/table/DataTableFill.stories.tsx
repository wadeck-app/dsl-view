import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { DataTable } from './DataTable.js';
import type { TableColumn } from './DataTable.js';

type Row = Record<string, unknown>;

const yamlColumns = (cols: Array<Record<string, unknown>>) => cols as unknown as TableColumn<Row>[];

const COLUMNS = yamlColumns([
	{ field: 'event', label: 'Event' },
	{ field: 'count', label: 'Count' },
]);

const rowsOf = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), event: `order.event-${i + 1}`, count: (i + 1) * 7 }));

// A dashboard tile: a box with a definite height. Its size is the host's job, the table fills it.
const Tile = ({ height = 216, width = 300, children }: { height?: number; width?: number; children: React.ReactNode }) => (
	<div data-testid="tile" style={{ width, height, outline: '1px dashed var(--color-border)' }}>{children}</div>
);

const meta: Meta = {
	title: 'Table/DataTable fill',
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

// Fewer rows than the tile can show: the table keeps the height of its rows, the rest of the tile stays blank.
export const ShortTable: Story = {
	render: () => (
		<Tile>
			<DataTable fill rows={rowsOf(3)} columns={COLUMNS} />
		</Tile>
	),
};

// More rows than the tile can show: the rows scroll under a header that stays, and the box joins the tab order.
export const LongTableScrolls: Story = {
	render: () => (
		<Tile>
			<DataTable fill rows={rowsOf(30)} columns={COLUMNS} />
		</Tile>
	),
};

export const WithFilters: Story = {
	render: () => (
		<Tile>
			<DataTable fill rows={rowsOf(30)} columns={COLUMNS} filtersTop={<span className="text-sm text-muted">Filters stay at their height</span>} />
		</Tile>
	),
};

export const WithExpansion: Story = {
	render: () => (
		<Tile>
			<DataTable
				fill
				rows={rowsOf(8)}
				columns={COLUMNS}
				expansion={{ $type: 'detail' }}
				renderNode={(_node, ctx) => <div className="text-sm">Details of {String((ctx['row'] as Row).event)}</div>}
			/>
		</Tile>
	),
};

export const Loading: Story = {
	render: () => (
		<Tile>
			<DataTable fill loading rows={[]} columns={COLUMNS} />
		</Tile>
	),
};

// The empty message sits in the middle of the room under the header.
export const Empty: Story = {
	render: () => (
		<Tile>
			<DataTable fill rows={[]} columns={COLUMNS} emptyMessage="No events" />
		</Tile>
	),
};

export const WideTableScrollsBothWays: Story = {
	render: () => (
		<Tile width={240}>
			<DataTable
				fill
				rows={rowsOf(30)}
				columns={yamlColumns([
					{ field: 'event', label: 'Event', nowrap: true },
					{ field: 'event', label: 'Same event again', nowrap: true },
					{ field: 'count', label: 'Count' },
				])}
			/>
		</Tile>
	),
};
