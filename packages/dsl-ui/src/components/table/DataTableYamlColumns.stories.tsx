import type { Meta, StoryObj } from '@storybook/react';

import { ThemeScope } from '../layout/ThemeScope.js';
import { DataTable } from './DataTable.js';
import type { TableColumn } from './DataTable.js';

type Row = Record<string, unknown>;

// What a YAML page passes: raw column maps, not ColumnHelpers objects.
const yamlColumns = (cols: Array<Record<string, unknown>>) => cols as unknown as TableColumn<Row>[];

const ROWS: Row[] = [
	{ id: '1', event: 'order.completed', state: 'completed', at: '2026-10-19T10:30:00Z', attempts: 1 },
	{ id: '2', event: 'order.failed', state: 'failed', at: '2026-10-19T09:12:00Z', attempts: 5 },
	{ id: '3', event: 'invoice.requested', state: 'pending', at: '2026-10-18T22:05:00Z', attempts: 0 },
];

// ~510px of content: the width flow-owner reported inside a narrow shell.
function Narrow({ children, width = 510 }: { children: React.ReactNode; width?: number }) {
	return <div style={{ width, border: '1px dashed currentColor', padding: 4 }}>{children}</div>;
}

const meta: Meta = {
	title: 'Table/DataTable YAML columns',
	parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

// Default: plain columns wrap anywhere (break-all), so words can split mid-word in a narrow container.
export const DefaultWrapsAnywhere: Story = {
	render: () => (
		<Narrow width={260}>
			<DataTable
				rows={ROWS}
				columns={yamlColumns([
					{ field: 'event', label: 'Event' },
					{ field: 'state', label: 'State' },
					{ field: 'at', label: 'At' },
				])}
			/>
		</Narrow>
	),
};

// nowrap / truncate / width / mono / format / badge: the same data without mid-word breaks.
export const NoMidWordBreaks: Story = {
	render: () => (
		<Narrow>
			<DataTable
				rows={ROWS}
				columns={yamlColumns([
					{ field: 'event', label: 'Event', mono: true, truncate: true },
					{
						field: 'state',
						label: 'State',
						nowrap: true,
						badge: { completed: 'success', failed: 'danger', pending: 'warning' },
					},
					{ field: 'at', label: 'At', format: 'datetime' },
					{ field: 'attempts', label: 'Tries', width: 12, sortable: true },
				])}
			/>
		</Narrow>
	),
};

// The same table on a dark panel: badges, muted text and borders must follow the theme.
export const NoMidWordBreaksOnDarkPanel: Story = {
	render: () => (
		<ThemeScope theme="dark" surface="panel">
			<div style={{ padding: 8 }}>{NoMidWordBreaks.render?.({}, {} as never)}</div>
		</ThemeScope>
	),
};
