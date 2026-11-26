import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../controls/_Button.js';
import { Tooltip } from './Tooltip.js';

const meta: Meta<typeof Tooltip> = {
	title: 'Overlay/Tooltip',
	component: Tooltip,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Tooltip>;

const ROWS = [
	{ label: 'Model', value: 'opus' },
	{ label: 'Type', value: 'general-purpose' },
	{ label: 'Status', value: 'running' },
	{ label: 'Tokens in/out', value: '12,400 / 3,100' },
	{ label: 'Cost', value: '$0.42' },
];

export const Rows: Story = {
	render: () => (
		<Tooltip rows={ROWS}>
			<Button>Hover or focus me</Button>
		</Tooltip>
	),
};

export const RowsAndContent: Story = {
	render: () => (
		<Tooltip rows={ROWS.slice(0, 3)} content={<p className="text-muted">Started 2 minutes ago.</p>}>
			<Button>With a note</Button>
		</Tooltip>
	),
};

// Near the viewport edge the card flips and shifts instead of being cut.
export const NearTheEdge: Story = {
	parameters: { layout: 'fullscreen' },
	render: () => (
		<div className="flex h-screen items-start justify-end p-2">
			<Tooltip rows={ROWS}>
				<Button>Top right corner</Button>
			</Tooltip>
		</div>
	),
};
