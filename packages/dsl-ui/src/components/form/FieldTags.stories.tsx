import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { FieldTags } from './FieldTags.js';

const meta: Meta<typeof FieldTags> = {
	title: 'Form/FieldTags',
	component: FieldTags,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FieldTags>;

function Controlled(args: React.ComponentProps<typeof FieldTags>) {
	const [value, setValue] = useState<string[]>(args.value ?? []);
	return (
		<div style={{ width: 360 }}>
			<FieldTags {...args} value={value} onChange={setValue} />
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Keywords',
		description: 'Press Enter or comma to add a tag.',
		placeholder: 'Add keyword...',
	},
};

export const WithInitialTags: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Technologies',
		value: ['React', 'TypeScript', 'Tailwind'],
		placeholder: 'Add technology...',
	},
};

export const MaxTagsLimit: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Top Skills (max 5)',
		description: 'You can add at most 5 skills.',
		value: ['React', 'TypeScript'],
		maxTags: 5,
		placeholder: 'Add skill...',
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Tags',
		value: ['read-only', 'locked'],
		disabled: true,
	},
};
