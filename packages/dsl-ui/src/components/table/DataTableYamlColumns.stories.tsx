import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

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

// Rows stay non-clickable; an icon-only `type: link` column right after the expansion chevron opens the detail page, and a
// data column with `href` turns its value into a link. MemoryRouter keeps the clicks inside the story.
export const LinkColumns: Story = {
	render: () => (
		<MemoryRouter>
			<Narrow>
				<DataTable
					rows={ROWS}
					columns={yamlColumns([
						{ type: 'link', to: '/modules/flow/executions/{id}', icon: 'external-link', label: 'Open details', position: 'start' },
						{ field: 'event', label: 'Event', mono: true, truncate: true, href: '/modules/queue/history?event={event}' },
						{ field: 'state', label: 'State', nowrap: true, badge: { completed: 'success', failed: 'danger', pending: 'warning' } },
					])}
				/>
			</Narrow>
		</MemoryRouter>
	),
};

// Icon-only row actions authored in YAML (`icon: <name>` on an `actions` item, the label stays the accessible name and
// tooltip) next to a `title` tooltip template on a data column (hover the "At" cells).
export const IconActionsAndTooltips: Story = {
	render: () => (
		<Narrow>
			<DataTable
				rows={ROWS.map(row => ({ ...row, retryable: row['state'] === 'failed' }))}
				columns={yamlColumns([
					{ field: 'event', label: 'Event', mono: true, truncate: true },
					{ field: 'at', label: 'At', format: 'time', title: 'Received {at} after {attempts} attempt(s)' },
					{
						type: 'actions',
						items: [
							{ label: 'Push test event', action: 'push', icon: 'rocket' },
							{ label: 'Retry now', action: 'retry', icon: 'rotate-ccw', condition: 'retryable' },
							{ label: 'Clear', action: 'clear', icon: 'trash', variant: 'danger-outline' },
						],
					},
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
