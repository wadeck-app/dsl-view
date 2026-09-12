import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../controls/_Button.js';
import { DialogFooter } from './DialogFooter.js';

const meta: Meta<typeof DialogFooter> = {
	title: 'Layout/DialogFooter',
	component: DialogFooter,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof DialogFooter>;

export const Default: Story = {
	render: () => (
		<DialogFooter>
			<Button variant="ghost">Cancel</Button>
			<Button variant="primary">Confirm</Button>
		</DialogFooter>
	),
};
