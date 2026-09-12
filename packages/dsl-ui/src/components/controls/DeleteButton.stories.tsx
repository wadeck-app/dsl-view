import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DeleteButton } from './DeleteButton.js';

const meta: Meta<typeof DeleteButton> = {
	title: 'Controls/DeleteButton',
	component: DeleteButton,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof DeleteButton>;

export const Default: Story = {};

export const CustomLabel: Story = {
	args: { children: 'Remove' },
};

export const Loading: Story = {
	args: { loading: true },
};
