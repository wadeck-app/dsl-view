import type { Meta, StoryObj } from '@storybook/react';
import { Settings } from 'lucide-react';
import React from 'react';
import { IconButton } from './IconButton.js';

const meta: Meta<typeof IconButton> = {
	title: 'Controls/IconButton',
	component: IconButton,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<IconButton icon={<Settings className="h-5 w-5" />} aria-label="Settings large" size="icon" />
			<IconButton icon={<Settings className="h-4 w-4" />} aria-label="Settings medium" size="icon-sm" />
			<IconButton icon={<Settings className="h-3 w-3" />} aria-label="Settings small" size="icon-xs" />
		</div>
	),
};

export const Variants: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<IconButton icon={<Settings className="h-4 w-4" />} aria-label="Ghost" variant="ghost" />
			<IconButton icon={<Settings className="h-4 w-4" />} aria-label="Secondary" variant="secondary" />
			<IconButton icon={<Settings className="h-4 w-4" />} aria-label="Danger" variant="danger" />
		</div>
	),
};
