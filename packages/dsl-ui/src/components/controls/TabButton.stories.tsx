import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TabButton } from './TabButton.js';

const meta: Meta<typeof TabButton> = {
	title: 'Controls/TabButton',
	component: TabButton,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof TabButton>;

export const Default: Story = {
	render: () => (
		<div className="flex items-center gap-1">
			<TabButton active={true}>Overview</TabButton>
			<TabButton>Details</TabButton>
			<TabButton>History</TabButton>
		</div>
	),
};

export const States: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<TabButton active={false}>Inactive</TabButton>
			<TabButton active={true}>Active</TabButton>
		</div>
	),
};
