import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../controls/_Button.js';
import { CardActions } from './CardActions.js';

const meta: Meta<typeof CardActions> = {
	title: 'Layout/CardActions',
	component: CardActions,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof CardActions>;

export const Default: Story = {
	render: () => (
		<CardActions>
			<Button variant="secondary">View Details</Button>
			<Button variant="ghost">Dismiss</Button>
		</CardActions>
	),
};
