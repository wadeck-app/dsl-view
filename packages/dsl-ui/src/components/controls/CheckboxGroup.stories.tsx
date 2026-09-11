import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CheckboxGroup } from './CheckboxGroup.js';

const meta: Meta<typeof CheckboxGroup> = {
	title: 'Controls/CheckboxGroup',
	component: CheckboxGroup,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof CheckboxGroup>;

const options = [
	{ value: 'read', label: 'Read' },
	{ value: 'write', label: 'Write' },
	{ value: 'delete', label: 'Delete', disabled: true },
];

export const Default: Story = {
	render: (args) => {
		const [value, setValue] = useState<string[]>([]);
		return <div className="w-48"><CheckboxGroup {...args} value={value} onChange={setValue} /></div>;
	},
	args: { options, orientation: 'vertical' },
};

export const Horizontal: Story = {
	render: (args) => {
		const [value, setValue] = useState<string[]>([]);
		return <div className="w-48"><CheckboxGroup {...args} value={value} onChange={setValue} /></div>;
	},
	args: { options, orientation: 'horizontal' },
};

export const WithGroupLabel: Story = {
	render: (args) => {
		const [value, setValue] = useState<string[]>([]);
		return <div className="w-48"><CheckboxGroup {...args} value={value} onChange={setValue} /></div>;
	},
	args: { options, label: 'Permissions', orientation: 'vertical' },
};

export const PartiallyChecked: Story = {
	render: (args) => {
		const [value, setValue] = useState<string[]>(['read']);
		return <div className="w-48"><CheckboxGroup {...args} value={value} onChange={setValue} /></div>;
	},
	args: { options, label: 'Permissions' },
};
