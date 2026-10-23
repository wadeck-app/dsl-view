import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { RefreshButton } from '../controls/RefreshButton.js';
import { ThemeScope } from '../layout/ThemeScope.js';
import { DataTable } from './DataTable.js';
import type { TableColumn } from './DataTable.js';

type Row = Record<string, unknown>;

const yamlColumns = (cols: Array<Record<string, unknown>>) => cols as unknown as TableColumn<Row>[];

const COLUMNS = yamlColumns([
	{ field: 'event', label: 'Event' },
	{ field: 'state', label: 'State' },
	{ field: 'at', label: 'At' },
]);

const ROWS: Row[] = [
	{ id: '1', event: 'order.completed', state: 'completed', at: '2026-10-19 10:30' },
	{ id: '2', event: 'order.failed', state: 'failed', at: '2026-10-19 09:12' },
	{ id: '3', event: 'invoice.requested', state: 'pending', at: '2026-10-18 22:05' },
];

const meta: Meta = {
	title: 'Table/DataTable loading',
	parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

// First load: skeleton rows with the table's own columns, never the empty message.
export const Loading: Story = {
	render: () => <DataTable rows={[]} columns={COLUMNS} loading emptyMessage="No events" />,
};

// Loaded and really empty: the empty message.
export const LoadedAndEmpty: Story = {
	render: () => <DataTable rows={[]} columns={COLUMNS} emptyMessage="No events" />,
};

// A refetch (filter, page, poll, refresh): the rows stay, dimmed slightly after a short delay.
export const RefreshingKeepsRows: Story = {
	render: () => <DataTable rows={ROWS} columns={COLUMNS} refreshing emptyMessage="No events" />,
};

export const LoadingOnDarkPanel: Story = {
	render: () => (
		<ThemeScope theme="dark" surface="panel">
			<div className="p-4">
				<DataTable rows={[]} columns={COLUMNS} loading emptyMessage="No events" />
			</div>
		</ThemeScope>
	),
};

// The button disables itself and spins until the promise settles; the table keeps its rows meanwhile.
export const WithRefreshButton: Story = {
	render: () => {
		const [refreshing, setRefreshing] = React.useState(false);
		return (
			<div className="flex flex-col gap-3">
				<RefreshButton
					onRefresh={async () => {
						setRefreshing(true);
						await new Promise(resolve => setTimeout(resolve, 1500));
						setRefreshing(false);
					}}
				/>
				<DataTable rows={ROWS} columns={COLUMNS} refreshing={refreshing} emptyMessage="No events" />
			</div>
		);
	},
};

// While `clearEntry` runs, its row buttons are disabled and busy on every row (per action name); `keepEntry` stays usable.
export const RowActionPending: Story = {
	render: () => (
		<DataTable
			rows={ROWS}
			columns={yamlColumns([
				{ field: 'event', label: 'Event' },
				{
					type: 'actions',
					items: [
						{ label: 'Clear', action: 'clearEntry' },
						{ label: 'Keep', action: 'keepEntry' },
					],
				},
			])}
			actionPending={{ clearEntry: true }}
		/>
	),
};
