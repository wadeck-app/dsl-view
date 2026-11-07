import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { FieldDate } from './FieldDate.js';

const meta: Meta<typeof FieldDate> = {
	title: 'Form/FieldDate',
	component: FieldDate,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FieldDate>;

function Controlled(args: React.ComponentProps<typeof FieldDate>) {
	const [value, setValue] = useState<Date | null>(args.value ?? null);
	return (
		<div className="w-96">
			<FieldDate {...args} value={value} onChange={setValue} />
			<p className="mt-4 text-sm text-muted-foreground">
				{value ? `Selected: ${value.toDateString()}` : 'Nothing selected'}
			</p>
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start date',
		description: 'Pick the first day.',
		value: null,
		placeholder: 'Select a date...',
	},
};

export const WithValue: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start date',
		value: new Date(2026, 8, 19),
	},
};

export const Required: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start date',
		value: null,
		required: true,
		error: 'A date is required',
	},
};

export const Bounded: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start date',
		description: 'Only within September 2026.',
		value: new Date(2026, 8, 19),
		minDate: new Date(2026, 8, 1),
		maxDate: new Date(2026, 8, 30),
	},
};

export const WeekdaysOnly: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start date',
		description: 'Weekends are disabled.',
		value: null,
		isDateDisabled: (date: Date) => {
			const day = date.getDay();
			return day === 0 || day === 6;
		},
	},
};

export const CustomDateFormat: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start date',
		value: new Date(2026, 8, 19),
		dateFormat: 'yyyy-MM-dd',
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Start date',
		value: new Date(2026, 8, 19),
		disabled: true,
	},
};
