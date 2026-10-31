import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { StatTile } from '../layout/StatTile.js';
import { ThemeScope } from '../layout/ThemeScope.js';
import { FigureRow, type Figure } from './FigureRow.js';
import { SparklineView } from './SparklineView.js';
import type { SparkPoint } from './sparkline.js';

// 14 points, oldest first. `measured: false` is a gap; text/detail are what the data owner wants the tooltip to say.
function series(values: Array<number | null>, unit: string): SparkPoint[] {
	return values.map((value, i) => {
		const label = `Build ${i + 1}`;
		const previous = i > 0 ? values[i - 1] : null;
		return {
			label,
			value,
			measured: value !== null,
			text: value === null ? undefined : `${label}: ${value} ${unit}`,
			detail: value !== null && previous != null ? `${value - previous >= 0 ? '+' : ''}${value - previous} ${unit} vs previous` : null,
		};
	});
}

const latency = series([118, 121, 119, 125, 130, 128, 124, 122, 127, 131, 126, 123, 120, 120], 'ms');
const errors = series([4, 3, 5, 2, null, null, 3, 4, 2, 1, 3, 2, 3, 3], 'errors');
const throughput = series([1.0, 1.1, 1.1, 1.2, 1.3, 1.2, 1.2, 1.3, 1.1, 1.2, 1.4, 1.3, 1.2, 1.2], 'k/s');

const figures: Figure[] = [
	{ label: 'Latency', value: '120', unit: 'ms', trend: { direction: 'flat', text: 'About the same as 14 builds ago', points: latency } },
	{ label: 'Errors', value: '3', trend: { direction: 'down', text: 'Down 1 since the first measured build', points: errors } },
	{ label: 'Throughput', value: '1.2', unit: 'k/s', trend: { direction: 'up', text: 'Up 0.2 k/s since the first build', points: throughput } },
];

const ROW_CLASS = 'flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-content';

const linked: Figure[] = figures.map((f, i) => ({ ...f, href: ['/reports/latency', '/reports/errors', '/reports/throughput'][i]! }));

const meta: Meta<typeof FigureRow> = {
	title: 'Display/FigureRow',
	component: FigureRow,
	parameters: { layout: 'padded' },
	// Linked figures navigate through the router: MemoryRouter keeps the click inside the story.
	decorators: [
		Story => (
			<MemoryRouter>
				<div style={{ maxWidth: 640 }}>
					<Story />
				</div>
			</MemoryRouter>
		),
	],
};
export default meta;
type Story = StoryObj<typeof FigureRow>;

export const Default: Story = { args: { items: figures } };

// The whole cell is the link; the sparkline stays a separate control above it (Tab: sparkline, then link).
export const AsLinks: Story = { args: { items: linked } };

// No sparkline: a direction mark only; and a figure with neither.
export const MarkOnly: Story = {
	args: {
		items: [
			{ label: 'Latency', value: '120', unit: 'ms', trend: { direction: 'up', text: 'Up 5 ms over the last 14 builds' } },
			{ label: 'Errors', value: '3', trend: { direction: 'none', text: 'No previous build to compare with' } },
			{ label: 'Throughput', value: '1.2', unit: 'k/s' },
		],
	},
};

// `spark` is the short form: plain values, positions stand in for labels (#1, #2...), null is a gap.
export const PlainValues: Story = {
	args: {
		items: [
			{ label: 'Latency', value: '120', unit: 'ms', trend: { direction: 'flat', text: 'Flat', spark: [118, 121, 119, 125, 130, 128, 124] } },
			{ label: 'Errors', value: '3', trend: { direction: 'down', text: 'Down', spark: [5, 4, null, null, 3, 2, 3] } },
		],
	},
};

// A narrow container: each "value unit" stays on ONE line, the label is cut with an ellipsis.
export const Narrow: Story = {
	decorators: [Story => <div style={{ maxWidth: 320 }}><Story /></div>],
	args: { items: [{ ...figures[0]!, label: 'Median response latency' }, { ...figures[1]!, label: 'Failed requests' }, { ...figures[2]!, label: 'Throughput' }] },
};

// Tokens only: inside a dark ThemeScope the tiles, the sparkline and its tooltip follow it (also in a light app).
export const OnDarkPanel: Story = {
	render: args => (
		<ThemeScope theme="dark" surface="panel">
			<div className="p-4" style={{ width: 640 }}>
				<FigureRow {...args} />
			</div>
		</ThemeScope>
	),
	args: { items: linked },
};

// Items it cannot show: an alert names the path and the fix (and development builds log one warning).
export const InvalidItems: Story = {
	args: { items: [{ label: 'Latency' }] as unknown as Figure[] },
};

// Side by side with StatTile, the sibling for ONE metric: same family of tile, so size drift is visible in review.
export const NextToStatTile: Story = {
	decorators: [Story => <div style={{ maxWidth: 720 }}><Story /></div>],
	render: args => (
		<div className="flex flex-col gap-4">
			<FigureRow {...args} />
			<div className="grid grid-cols-3 gap-2">
				<StatTile label="Latency" value="120 ms" compact nowrap />
				<StatTile label="Errors" value="3" compact nowrap />
				<StatTile label="Throughput" value="1.2 k/s" compact nowrap />
			</div>
		</div>
	),
	args: { items: figures },
};

// The sparkline alone (a registry component of its own). Hover or touch it, or Tab to it and use the arrow keys.
export const SparklineAlone: StoryObj<typeof SparklineView> = {
	render: () => (
		<div className={ROW_CLASS}>
			Latency
			<SparklineView points={latency} ariaLabel="Latency, 14 builds" />
			<SparklineView points={errors} ariaLabel="Errors, 14 builds" />
		</div>
	),
};
