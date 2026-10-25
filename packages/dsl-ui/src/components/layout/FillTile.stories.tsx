import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Chart } from '../display/Chart.js';
import { Card } from './Card.js';
import { ScrollArea } from './ScrollArea.js';
import { StatTile } from './StatTile.js';
import { VerticalStack } from './VerticalStack.js';

const meta: Meta = {
	title: 'Layout/Fill a dashboard tile',
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

const data = [
	{ hour: '08', events: 12 },
	{ hour: '09', events: 31 },
	{ hour: '10', events: 22 },
	{ hour: '11', events: 40 },
	{ hour: '12', events: 18 },
];
const series = [{ key: 'events', name: 'Events', type: 'bar' as const, yAxisId: 'left' as const }];

// A dashboard tile: a box with a definite height that the widget has to fill. Its size is the parent's job.
const Tile = ({ width, height, children }: { width: number; height: number; children: React.ReactNode }) => (
	<div data-testid="tile" style={{ width, height, outline: '1px dashed var(--color-border)' }}>{children}</div>
);

export const CardWithChartFillsTheTile: Story = {
	render: () => (
		<Tile width={300} height={250}>
			<Card fill>
				<VerticalStack fill gap="gap-2">
					<StatTile label="Last hour" value="18" compact />
					<Chart fill data={data} xAxisKey="hour" xAxisType="category" yFormat="number" series={series} />
				</VerticalStack>
			</Card>
		</Tile>
	),
};

export const TallerTile: Story = {
	render: () => (
		<Tile width={300} height={420}>
			<Card fill header={<h3 className="font-semibold text-content">Events per hour</h3>}>
				<VerticalStack fill gap="gap-2">
					<StatTile label="Last hour" value="18" compact />
					<Chart fill data={data} xAxisKey="hour" xAxisType="category" yFormat="number" series={series} />
				</VerticalStack>
			</Card>
		</Tile>
	),
};

// Shorter than the chart's floor (64px by default, `height` changes it): the chart keeps the floor and the card clips it
// rather than drawing a 0px chart.
export const TileShorterThanTheChartFloor: Story = {
	render: () => (
		<Tile width={300} height={80}>
			<VerticalStack fill gap="gap-2">
				<Chart fill data={data} xAxisKey="hour" xAxisType="category" yFormat="number" series={series} />
			</VerticalStack>
		</Tile>
	),
};

export const ScrollingListInsideTheTile: Story = {
	render: () => (
		<Tile width={300} height={200}>
			<Card fill header={<h3 className="font-semibold text-content">Top events</h3>}>
				<ScrollArea fill>
					{Array.from({ length: 20 }, (_, i) => <p key={i} className="py-1 text-content">Event number {i + 1}</p>)}
				</ScrollArea>
			</Card>
		</Tile>
	),
};

export const NarrowStatTileWraps: Story = {
	name: 'StatTile 120px: default wraps the unit',
	render: () => (
		<Tile width={120} height={100}>
			<StatTile label="Weight" value="68.6 kg" />
		</Tile>
	),
};

export const NarrowStatTileNowrap: Story = {
	name: 'StatTile 120px: nowrap and compact keep "68.6 kg" on one line',
	render: () => (
		<Tile width={120} height={100}>
			<StatTile label="Weight" value="68.6 kg" nowrap compact fill />
		</Tile>
	),
};
