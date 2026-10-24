import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { ActionButton } from './ActionButton.js';

// Stands for the page's `ctx.onAction`: in a page, `onAction` and `actionPending` come from the GenericPageRunner.
const slowAction = (action: string, params: Record<string, unknown>) =>
	new Promise<void>(resolve => {
		console.log('action', action, params);
		setTimeout(resolve, 1500);
	});

const meta: Meta<typeof ActionButton> = {
	title: 'Controls/ActionButton',
	component: ActionButton,
	parameters: { layout: 'centered' },
	args: { action: 'pushTest', label: 'Push test event', params: { name: 'ping' }, onAction: slowAction },
};
export default meta;
type Story = StoryObj<typeof ActionButton>;

export const Default: Story = {};

export const WithIcon: Story = { args: { icon: 'rocket' } };

export const IconOnly: Story = { args: { icon: 'rocket', iconOnly: true } };

export const Danger: Story = { args: { action: 'giveUp', label: 'Give up all', variant: 'danger-outline', icon: 'archive', params: {} } };

export const Busy: Story = { args: { icon: 'rocket', actionPending: { pushTest: true } } };

export const Disabled: Story = { args: { disabled: true, disabledReason: 'Select an event first' } };

export const NotInAPage: Story = { args: { onAction: undefined } };
