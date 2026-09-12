import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../controls/_Button.js';
import { ActionBar } from './ActionBar.js';

const meta: Meta<typeof ActionBar> = {
	title: 'Layout/ActionBar',
	component: ActionBar,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof ActionBar>;

export const Default: Story = {
	render: () => (
		<ActionBar>
			<Button variant="primary">Save</Button>
			<Button variant="secondary">Save &amp; Continue</Button>
			<Button variant="ghost">Cancel</Button>
		</ActionBar>
	),
};
