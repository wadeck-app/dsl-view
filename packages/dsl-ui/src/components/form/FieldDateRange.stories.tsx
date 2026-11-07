import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { FieldDateRange } from './FieldDateRange.js';
import type { DateRange } from './DateRangePicker.js';

const meta: Meta<typeof FieldDateRange> = {
	title: 'Form/FieldDateRange',
	component: FieldDateRange,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FieldDateRange>;

function Controlled(args: React.ComponentProps<typeof FieldDateRange>) {
	const [value, setValue] = useState<DateRange>(args.value ?? { from: null, to: null });
	return (
		<div className="w-96">
			<FieldDateRange {...args} value={value} onChange={setValue} />
			<p className="mt-4 text-sm text-muted-foreground">
				From: {value.from?.toDateString() ?? 'none'} | To: {value.to?.toDateString() ?? 'none'}
			</p>
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Period',
		description: 'Select the first and last day.',
		value: { from: null, to: null },
		placeholder: 'Select a date range...',
	},
};

export const WithValue: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Period',
		value: { from: new Date(2026, 8, 10), to: new Date(2026, 8, 25) },
	},
};

export const Required: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Period',
		value: { from: null, to: null },
		required: true,
		error: 'A period is required',
	},
};

export const Bounded: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Period',
		description: 'Only within September 2026.',
		value: { from: null, to: null },
		minDate: new Date(2026, 8, 1),
		maxDate: new Date(2026, 8, 30),
	},
};

export const WeekdaysOnly: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Period',
		description: 'Weekends are disabled.',
		value: { from: null, to: null },
		isDisabled: (date: Date) => {
			const day = date.getDay();
			return day === 0 || day === 6;
		},
	},
};

export const CustomDateFormat: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Period',
		value: { from: new Date(2026, 8, 10), to: new Date(2026, 8, 25) },
		dateFormat: 'yyyy-MM-dd',
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Period',
		value: { from: new Date(2026, 8, 10), to: new Date(2026, 8, 25) },
		disabled: true,
	},
};
