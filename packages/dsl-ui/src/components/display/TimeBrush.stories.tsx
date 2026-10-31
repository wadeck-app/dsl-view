import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeScope } from '../layout/ThemeScope.js';
import { TimeBrush } from './TimeBrush.js';
import { TimeSeriesChart } from './TimeSeriesChart.js';
import { TimeSeriesSyncProvider } from './timeSeriesSync.js';

const meta: Meta<typeof TimeBrush> = {
	title: 'Display/TimeBrush',
	component: TimeBrush,
	parameters: { layout: 'padded' },
	argTypes: { kind: { control: 'radio', options: ['line', 'bars'] } },
};
export default meta;
type Story = StoryObj<typeof TimeBrush>;

const DAY = 86_400_000;
const start = Date.UTC(2026, 8, 1);
// Synthetic and deterministic.
const daily = Array.from({ length: 120 }, (_, i) => ({
	t: start + i * DAY,
	a: Math.round((20 + 4 * Math.sin(i / 9) + 1.5 * Math.sin(i * 1.7)) * 10) / 10,
	events: i % 3 === 0 ? 1 + (i % 4) : null,
}));

export const Line: Story = {
	render: args => (
		<TimeSeriesSyncProvider>
			<div style={{ width: 760 }}>
				<TimeBrush {...args} />
			</div>
		</TimeSeriesSyncProvider>
	),
	args: { data: daily, valueKey: 'a' },
};

export const BarsForSparseData: Story = {
	render: args => (
		<TimeSeriesSyncProvider>
			<div style={{ width: 760 }}>
				<TimeBrush {...args} />
			</div>
		</TimeSeriesSyncProvider>
	),
	args: { data: daily, valueKey: 'events', kind: 'bars' },
};

/** The strip lines up with the plot areas of the charts when it gets their yAxisWidth and marginRight. */
export const TwoChartsAndABrush: Story = {
	render: () => (
		<TimeSeriesSyncProvider>
			<div className="flex flex-col gap-3" style={{ width: 760 }}>
				<TimeSeriesChart data={daily} syncGroup="pair" height={170} title="Series A" yAxisWidth={64} marginRight={24} series={[{ key: 'a', name: 'Series A', dots: 2 }]} />
				<TimeSeriesChart data={daily} syncGroup="pair" height={170} title="Events" yAxisWidth={64} marginRight={24} yIncludeZero series={[{ key: 'events', name: 'Events', kind: 'bar' }]} />
				<TimeBrush data={daily} syncGroup="pair" valueKey="a" yAxisWidth={64} marginRight={24} />
			</div>
		</TimeSeriesSyncProvider>
	),
};

export const InvalidProps: Story = {
	render: args => (
		<div style={{ width: 760 }}>
			<TimeBrush {...args} />
		</div>
	),
	// No valueKey: the brush says what to add instead of drawing nothing.
	args: { data: daily, valueKey: '' },
};

export const OnDarkPanel: Story = {
	render: args => (
		<ThemeScope theme="dark" surface="panel">
			<TimeSeriesSyncProvider>
				<div className="p-4" style={{ width: 760 }}>
					<TimeBrush {...args} />
				</div>
			</TimeSeriesSyncProvider>
		</ThemeScope>
	),
	args: { data: daily, valueKey: 'a' },
};
