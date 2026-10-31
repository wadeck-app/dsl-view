import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeScope } from '../layout/ThemeScope.js';
import { TimeBrush } from './TimeBrush.js';
import { TimeSeriesChart } from './TimeSeriesChart.js';
import type { TimeSeriesChartProps } from './TimeSeriesChart.js';
import { TimeSeriesSyncProvider } from './timeSeriesSync.js';

const meta: Meta<typeof TimeSeriesChart> = {
	title: 'Display/TimeSeriesChart',
	component: TimeSeriesChart,
	parameters: { layout: 'padded' },
	argTypes: {
		xFormat: { control: 'radio', options: ['date', 'time', 'datetime'] },
		yFormat: { control: 'radio', options: ['number', 'clock'] },
	},
};
export default meta;
type Story = StoryObj<typeof TimeSeriesChart>;

const DAY = 86_400_000;
const HOUR = 3_600_000;
const start = Date.UTC(2026, 8, 1);

// Synthetic and deterministic: a slow wave plus a ripple, so every story looks the same on every run.
const daily = Array.from({ length: 90 }, (_, i) => ({
	t: start + i * DAY,
	a: Math.round((20 + 4 * Math.sin(i / 9) + 1.5 * Math.sin(i * 1.7)) * 10) / 10,
	average: Math.round((20 + 4 * Math.sin(i / 9)) * 10) / 10,
	b: Math.round((55 + 12 * Math.cos(i / 14)) * 10) / 10,
	events: i % 3 === 0 ? 1 + (i % 4) : null,
	from: 8 + (i % 5) * 0.25,
	to: 16 + (i % 7) * 0.25,
	low: 18 + 2 * Math.sin(i / 9),
	high: 22 + 2 * Math.sin(i / 9),
	zone: i % 4 === 0 ? 'var(--color-success)' : 'var(--color-warning)',
	note: i % 10 === 0 ? 'Checked twice' : '',
}));
// The same days with a hole in the middle: the bridge over it is dashed.
const withGap = daily.filter((_, i) => i < 30 || i > 41);
const wrap = (width: number, node: React.ReactNode) => <div style={{ width }}>{node}</div>;
const frame = (args: TimeSeriesChartProps, width = 760) => wrap(width, <TimeSeriesChart {...args} />);

export const Lines: Story = {
	render: args => frame(args),
	args: {
		data: daily,
		title: 'Temperature (deg)',
		yUnit: 'deg',
		series: [
			{ key: 'a', name: 'Series A', color: 'var(--color-primary-solid)', width: 1.5, dots: 2 },
			{ key: 'average', name: '7-day average', color: 'var(--color-warning)', width: 2.5 },
		],
	},
};

export const GapsAreDashed: Story = {
	render: args => frame(args),
	args: {
		data: withGap,
		title: 'Series A with a hole',
		gapDashAfterDays: 2,
		series: [{ key: 'a', name: 'Series A', color: 'var(--color-primary-solid)', dots: 2 }],
	},
};

export const Area: Story = {
	render: args => frame(args),
	args: {
		data: withGap,
		gapDashAfterDays: 2,
		series: [{ key: 'b', name: 'Series B', color: 'var(--color-success)', kind: 'area' }],
	},
};

export const RightAxis: Story = {
	render: args => frame(args),
	args: {
		data: daily,
		title: 'Two scales',
		// A right axis is drawn inside marginRight: at least yRightAxisWidth.
		marginRight: 64,
		yRightAxisWidth: 56,
		yUnit: 'deg',
		yRightUnit: 'units',
		yRightDecimals: 0,
		series: [
			{ key: 'a', name: 'Series A (left)', color: 'var(--color-primary-solid)' },
			{ key: 'b', name: 'Series B (right)', color: 'var(--color-danger)', kind: 'area', axis: 'right' },
		],
	},
};

export const Bars: Story = {
	render: args => frame(args),
	args: {
		data: daily,
		title: 'Events per day, with their span',
		yFormat: 'clock',
		series: [
			{ key: 'to', fromKey: 'from', name: 'Span (hours of the day)', color: 'var(--color-hue-purple-text)', kind: 'bar' },
			{ key: 'events', name: 'Events', color: 'var(--color-success)', kind: 'bar', showValue: true, decimals: 0 },
		],
	},
};

export const ZoneBands: Story = {
	render: args => frame(args),
	args: {
		data: daily,
		title: 'Zones',
		// Fixed bands, and a band that follows two row fields; a missing key is the edge of the axis (open ended).
		bands: [{ from: 14, to: 17, color: 'var(--color-danger)', opacity: 0.1, label: 'Low' }],
		rangeAreas: [
			{ lowKey: 'low', highKey: 'high', name: 'Target', color: 'var(--color-success)', opacity: 0.18 },
			{ lowKey: 'high', name: 'Above target', color: 'var(--color-warning)', opacity: 0.08, legend: false },
		],
		legendItems: [{ label: 'Checked', color: 'var(--color-success)' }, { label: 'Unchecked', color: 'var(--color-warning)' }],
		series: [{ key: 'a', name: 'Series A', color: 'var(--color-primary-solid)', width: 0, dots: 3, pointColorKey: 'zone', detailKey: 'note' }],
	},
};

const hourly = Array.from({ length: 36 }, (_, i) => ({ t: Date.UTC(2026, 8, 1, 6) + i * HOUR, a: Math.round((12 + 5 * Math.sin(i / 4)) * 10) / 10 }));
const twoDays: [number, number] = [Date.UTC(2026, 8, 1, 5), Date.UTC(2026, 8, 3, 19)];

export const TimeOfDay: Story = {
	render: args => frame(args),
	args: {
		data: hourly,
		domain: twoDays,
		title: 'xFormat time: the first tick and each new day carry the date',
		xFormat: 'time',
		series: [{ key: 'a', name: 'Series A', color: 'var(--color-primary-solid)', dots: 2 }],
	},
};

export const DateAndTime: Story = {
	render: args => frame(args),
	args: { ...TimeOfDay.args, title: 'xFormat datetime', xFormat: 'datetime' },
};

export const Loading: Story = {
	render: args => frame(args),
	args: { data: undefined, series: [{ key: 'a', name: 'Series A' }], height: 160 },
};

export const NoData: Story = {
	render: args => frame(args),
	args: { data: [], series: [{ key: 'a', name: 'Series A' }], height: 160, emptyMessage: 'No data in this period' },
};

export const InvalidProps: Story = {
	render: args => frame(args),
	args: {
		data: daily,
		// A right-axis setting without a series on the right axis: the chart says what to change instead of throwing.
		yRightUnit: 'units',
		series: [{ key: 'a', name: 'Series A' }],
	},
};

/** Three charts on one time window with one brush: pan or zoom any of them (drag, Ctrl + wheel, arrows) and all follow. */
export const StackedWithBrush: Story = {
	render: () => (
		<TimeSeriesSyncProvider>
			<div className="flex flex-col gap-3" style={{ width: 760 }}>
				<TimeSeriesChart data={daily} syncGroup="stack" height={170} title="Series A" series={[{ key: 'a', name: 'Series A', color: 'var(--color-primary-solid)', dots: 2 }]} />
				<TimeSeriesChart data={daily} syncGroup="stack" height={170} title="Series B" series={[{ key: 'b', name: 'Series B', color: 'var(--color-danger)', kind: 'area' }]} />
				<TimeSeriesChart data={daily} syncGroup="stack" height={170} title="Events" yIncludeZero series={[{ key: 'events', name: 'Events', color: 'var(--color-success)', kind: 'bar' }]} />
				<TimeBrush data={daily} syncGroup="stack" valueKey="a" />
			</div>
		</TimeSeriesSyncProvider>
	),
};

export const OnDarkPanel: Story = {
	render: () => (
		<ThemeScope theme="dark" surface="panel">
			<TimeSeriesSyncProvider>
				<div className="flex flex-col gap-3 p-4" style={{ width: 760 }}>
					<TimeSeriesChart
						data={daily}
						syncGroup="dark"
						height={200}
						title="Dark panel"
						gapDashAfterDays={2}
						bands={[{ from: 14, to: 17, color: 'var(--color-danger)', opacity: 0.12 }]}
						series={[
							{ key: 'a', name: 'Series A', color: 'var(--color-primary)', dots: 2 },
							{ key: 'events', name: 'Events', color: 'var(--color-success)', kind: 'bar' },
						]}
					/>
					<TimeBrush data={daily} syncGroup="dark" valueKey="a" />
				</div>
			</TimeSeriesSyncProvider>
		</ThemeScope>
	),
};
