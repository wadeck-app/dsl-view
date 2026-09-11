import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RadioGroup } from './RadioGroup.js';

const meta: Meta<typeof RadioGroup> = {
	title: 'Controls/RadioGroup',
	component: RadioGroup,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof RadioGroup>;

const options = [
	{ value: 'small', label: 'Small' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'large', label: 'Large', disabled: true },
];

export const Default: Story = {
	render: (args) => {
		const [value, setValue] = useState('small');
		return <div className="w-48"><RadioGroup {...args} value={value} onChange={setValue} /></div>;
	},
	args: { options },
};

export const Horizontal: Story = {
	render: (args) => {
		const [value, setValue] = useState('');
		return <div className="w-72"><RadioGroup {...args} value={value} onChange={setValue} /></div>;
	},
	args: { options, orientation: 'horizontal' },
};

export const WithLabel: Story = {
	render: (args) => {
		const [value, setValue] = useState('medium');
		return <div className="w-48"><RadioGroup {...args} value={value} onChange={setValue} /></div>;
	},
	args: { options, label: 'Size' },
};
