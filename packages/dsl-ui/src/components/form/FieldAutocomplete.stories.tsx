import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { FieldAutocomplete } from './FieldAutocomplete.js';

const meta: Meta<typeof FieldAutocomplete> = {
	title: 'Form/FieldAutocomplete',
	component: FieldAutocomplete,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FieldAutocomplete>;

const countries = [
	{ value: 'fr', label: 'France' },
	{ value: 'de', label: 'Germany' },
	{ value: 'es', label: 'Spain' },
	{ value: 'it', label: 'Italy' },
	{ value: 'pt', label: 'Portugal' },
	{ value: 'nl', label: 'Netherlands' },
	{ value: 'be', label: 'Belgium' },
	{ value: 'ch', label: 'Switzerland' },
];

function Controlled(args: React.ComponentProps<typeof FieldAutocomplete>) {
	const [value, setValue] = useState(args.value ?? '');
	return <div style={{ width: 320 }}><FieldAutocomplete {...args} value={value} onChange={setValue} /></div>;
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Country',
		options: countries,
		placeholder: 'Type to search...',
	},
};

export const WithDescription: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Country',
		description: 'Start typing to filter countries',
		options: countries,
		placeholder: 'Type to search...',
	},
};

export const Preselected: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Country',
		options: countries,
		value: 'de',
		placeholder: 'Type to search...',
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Country',
		options: countries,
		disabled: true,
		placeholder: 'Disabled',
	},
};
