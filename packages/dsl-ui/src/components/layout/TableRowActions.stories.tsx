import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../controls/_Button.js';
import { DeleteButton } from '../controls/DeleteButton.js';
import { TableRowActions } from './TableRowActions.js';

const meta: Meta<typeof TableRowActions> = {
	title: 'Layout/TableRowActions',
	component: TableRowActions,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof TableRowActions>;

export const Default: Story = {
	render: () => (
		<TableRowActions>
			<Button>Edit</Button>
			<DeleteButton />
		</TableRowActions>
	),
};
