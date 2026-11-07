import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { FieldTime } from './FieldTime.js';

const meta: Meta<typeof FieldTime> = {
	title: 'Form/FieldTime',
	component: FieldTime,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FieldTime>;

function Controlled(args: React.ComponentProps<typeof FieldTime>) {
	const [value, setValue] = useState<string | null>(args.value ?? null);
	return (
		<div className="w-72">
			<FieldTime {...args} value={value} onChange={setValue} />
			<p className="mt-4 text-sm text-muted-foreground">
				{value ? `Selected: ${value}` : 'Nothing selected'}
			</p>
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start time',
		description: 'Pick the hour and minute.',
		value: null,
		placeholder: 'Select a time...',
	},
};

export const WithValue: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start time',
		value: '14:30',
	},
};

export const Required: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start time',
		value: null,
		required: true,
		error: 'A time is required',
	},
};

export const TwelveHour: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start time',
		value: '14:30',
		is12Hour: true,
	},
};

export const MinuteStep: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start time',
		description: 'Minutes advance by 15.',
		value: '09:15',
		minuteStep: 15,
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start time',
		value: '14:30',
		disabled: true,
	},
};
