import type { Meta, StoryObj } from '@storybook/react';

import { Notice } from './Notice.js';

const meta: Meta<typeof Notice> = {
	title: 'Display/Notice',
	component: Notice,
	parameters: { layout: 'centered' },
	decorators: [Story => <div className="w-64"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Notice>;

export const Info: Story = { args: { label: 'Change saved.' } };
export const Danger: Story = { args: { label: 'Change saved but 1 event was not delivered.', variant: 'danger' } };
export const LongMessageIsClamped: Story = {
	args: { label: 'Replay the failed events with: queue replay --since 2026-11-20 --filter failed --include-dead-letters --dry-run=false --verbose', variant: 'warning' },
};
