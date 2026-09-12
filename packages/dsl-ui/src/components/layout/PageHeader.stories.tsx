import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../controls/_Button.js';
import { PageSection } from './PageHeader.js';

const meta: Meta<typeof PageSection> = {
	title: 'Layout/PageSection',
	component: PageSection,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof PageSection>;

export const Default: Story = {
	args: {
		title: 'Projects',
	},
};

export const WithActions: Story = {
	render: () => (
		<PageSection
			title="Projects"
			actions={<Button variant="primary" size="sm">New Project</Button>}
		/>
	),
};

export const WithChildren: Story = {
	render: () => (
		<PageSection
			title="Projects"
			actions={<Button variant="primary" size="sm">New Project</Button>}
		>
			<p className="text-muted text-sm mt-1">Manage your active projects and track progress.</p>
		</PageSection>
	),
};
