import type { Meta, StoryObj } from '@storybook/react';
import { Pencil, Trash2, Settings } from 'lucide-react';
import { IconButton } from './IconButton.js';

const meta: Meta<typeof IconButton> = {
	title: 'Controls/IconButton',
	component: IconButton,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
	args: { icon: <Pencil className="h-4 w-4" />, label: 'Edit', variant: 'secondary' },
};

export const Danger: Story = {
	args: { icon: <Trash2 className="h-4 w-4" />, label: 'Delete', variant: 'danger' },
};

export const Ghost: Story = {
	args: { icon: <Settings className="h-4 w-4" />, label: 'Settings', variant: 'ghost' },
};

export const Disabled: Story = {
	args: {
		icon: <Pencil className="h-4 w-4" />,
		label: 'Edit',
		disabled: true,
		disabledReason: 'You do not have permission',
	},
};

export const Loading: Story = {
	args: { icon: <Pencil className="h-4 w-4" />, label: 'Saving', loading: true },
};
