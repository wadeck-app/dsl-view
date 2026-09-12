import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../controls/_Button.js';
import { NavBar } from './NavBar.js';

const meta: Meta<typeof NavBar> = {
	title: 'Layout/NavBar',
	component: NavBar,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof NavBar>;

export const Default: Story = {
	render: () => (
		<NavBar>
			<Button>Dashboard</Button>
			<Button>Projects</Button>
			<Button>Settings</Button>
			<Button>Profile</Button>
		</NavBar>
	),
};
