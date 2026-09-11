import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { addDays, isSaturday, isSunday, subMonths } from 'date-fns';

import { DatePicker } from './DatePicker.js';

const meta: Meta<typeof DatePicker> = {
	title: 'Form/DatePicker',
	component: DatePicker,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof DatePicker>;

function Controlled(args: React.ComponentProps<typeof DatePicker>) {
	const [value, setValue] = useState(args.value ?? null);
	return (
		<div style={{ width: 320 }}>
			<DatePicker {...args} value={value} onChange={setValue} />
			{value && <p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>Selected: {value.toDateString()}</p>}
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: null,
		placeholder: 'Select a date...',
	},
};

export const WithTodaysDate: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: new Date(),
		placeholder: 'Select a date...',
	},
};

export const WithDescription: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: null,
		placeholder: 'Select a date...',
	},
};

export const DisabledWeekends: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: null,
		placeholder: 'Weekdays only...',
		isDateDisabled: date => isSaturday(date) || isSunday(date),
	},
};

export const MinMaxDateRange: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: null,
		placeholder: 'Select within range...',
		minDate: new Date(),
		maxDate: addDays(new Date(), 30),
	},
};

export const PastDatesOnly: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: null,
		placeholder: 'Select a past date...',
		maxDate: subMonths(new Date(), 1),
	},
};

export const CustomDateFormat: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: null,
		placeholder: 'Select a date...',
		dateFormat: 'yyyy-MM-dd',
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: new Date(),
		placeholder: 'Disabled',
		disabled: true,
	},
};

export const DisabledSpecificDates: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: null,
		placeholder: 'Holidays disabled...',
		isDateDisabled: date => {
			// Disable Dec 25 and Jan 1
			const month = date.getMonth();
			const day = date.getDate();
			return (month === 11 && day === 25) || (month === 0 && day === 1);
		},
	},
};

export const Uncontrolled: Story = {
	render: () => {
		const [value, setValue] = useState<Date | null>(null);
		return (
			<div style={{ width: 320 }}>
				<DatePicker
					value={value}
					onChange={setValue}
					onSelect={selected => console.log('Selected:', selected)}
					placeholder="Uncontrolled with onSelect..."
				/>
				{value && <p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>Selected: {value.toDateString()}</p>}
			</div>
		);
	},
};
