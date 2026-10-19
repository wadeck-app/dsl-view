import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeScope } from '../layout/ThemeScope.js';
import { Chart } from './Chart.js';

const meta: Meta<typeof Chart> = {
	title: 'Display/Chart',
	component: Chart,
	parameters: { layout: 'padded' },
	argTypes: {
		variant: { control: 'radio', options: ['default', 'sparkline'] },
		yFormat: { control: 'radio', options: ['bytes', 'number'] },
		xFormat: { control: 'radio', options: ['date', 'time', 'datetime'] },
	},
};
export default meta;
type Story = StoryObj<typeof Chart>;

const hour = 3600_000;
const start = new Date(2026, 9, 19, 0, 0, 0).getTime();
const perHour = Array.from({ length: 24 }, (_, i) => ({ ts: start + i * hour, events: 800 + ((i * 397) % 1900), errors: (i * 53) % 90 }));
const wrap = (width: number, node: React.ReactNode) => <div style={{ width }}>{node}</div>;

export const EventsPerHour: Story = {
	render: (args) => wrap(560, <Chart {...args} />),
	args: {
		data: perHour,
		xAxisKey: 'ts',
		xAxisType: 'time',
		xFormat: 'time',
		yFormat: 'number',
		series: [{ key: 'events', name: 'Events', type: 'bar', yAxisId: 'left' }],
	},
};

export const SeveralSeriesDefaultColors: Story = {
	render: (args) => wrap(560, <Chart {...args} />),
	args: {
		...EventsPerHour.args,
		series: [
			{ key: 'events', name: 'Events', type: 'area', yAxisId: 'left' },
			{ key: 'errors', name: 'Errors', type: 'line', yAxisId: 'left' },
		],
	},
};

export const SparklineIn270pxCard: Story = {
	render: (args) => wrap(270, <Chart {...args} />),
	args: { ...EventsPerHour.args, variant: 'sparkline', height: 80 },
};

export const OnDarkPanel: Story = {
	render: (args) => (
		<ThemeScope theme="dark" surface="panel">
			<div className="flex flex-col gap-4 p-4" style={{ width: 600 }}>
				<Chart {...args} />
				<div style={{ width: 270 }}>
					<Chart {...args} variant="sparkline" height={80} />
				</div>
			</div>
		</ThemeScope>
	),
	args: {
		...SeveralSeriesDefaultColors.args,
	},
};

export const BytesDefault: Story = {
	render: (args) => wrap(560, <Chart {...args} />),
	args: {
		data: perHour.map(p => ({ ts: p.ts, total_bytes: p.events * 4096 })),
		xAxisKey: 'ts',
		xAxisType: 'time',
		series: [{ key: 'total_bytes', name: 'Total', type: 'area', yAxisId: 'left' }],
	},
};
