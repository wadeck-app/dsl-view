import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../controls/_Button.js';
import { HoverCard } from './HoverCard.js';

const meta: Meta<typeof HoverCard> = {
	title: 'Overlay/HoverCard',
	component: HoverCard,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof HoverCard>;

const ROWS = [
	{ label: 'Model', value: 'opus' },
	{ label: 'Type', value: 'general-purpose' },
	{ label: 'Status', value: 'running' },
	{ label: 'Tokens in/out', value: '12,400 / 3,100' },
	{ label: 'Cost', value: '$0.42' },
];

export const Rows: Story = {
	render: () => (
		<HoverCard rows={ROWS}>
			<Button>Hover or focus me</Button>
		</HoverCard>
	),
};

export const RowsAndContent: Story = {
	render: () => (
		<HoverCard rows={ROWS.slice(0, 3)} content={<p className="text-muted">Started 2 minutes ago.</p>}>
			<Button>With a note</Button>
		</HoverCard>
	),
};

// Near the viewport edge the card flips and shifts instead of being cut.
export const NearTheEdge: Story = {
	parameters: { layout: 'fullscreen' },
	render: () => (
		<div className="flex h-screen items-start justify-end p-2">
			<HoverCard rows={ROWS}>
				<Button>Top right corner</Button>
			</HoverCard>
		</div>
	),
};
