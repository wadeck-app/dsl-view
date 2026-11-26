import type { Meta, StoryObj } from '@storybook/react';

import { SplitLayout } from './SplitLayout.js';

const meta: Meta<typeof SplitLayout> = {
	title: 'Layout/SplitLayout',
	component: SplitLayout,
	parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof SplitLayout>;

const doc = <div className="h-[120vh] rounded border border-border p-4 text-sm">The document: it takes the remaining width.</div>;
const facts = <div className="rounded border border-border p-4 text-sm">Facts and properties.</div>;

export const SideOnTheRight: Story = { args: { main: doc, side: facts } };
export const SideFirstWhenStacked: Story = { args: { main: doc, side: facts, sideFirstWhenStacked: true, sidePosition: 'left', stickyTop: 'top-16' } };
