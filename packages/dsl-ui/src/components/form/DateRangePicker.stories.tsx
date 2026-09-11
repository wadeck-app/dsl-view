import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { addDays, subDays } from 'date-fns';

import { DateRangePicker, type DateRange } from './DateRangePicker.js';
import { FieldDateRange } from './FieldDateRange.js';

const meta: Meta<typeof DateRangePicker> = {
	title: 'Form/DateRangePicker',
	component: DateRangePicker,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof DateRangePicker>;

function Controlled(args: React.ComponentProps<typeof DateRangePicker>) {
	const [value, setValue] = useState<DateRange>(args.value ?? { from: null, to: null });
	return (
		<div style={{ width: 400 }}>
			<DateRangePicker {...args} value={value} onChange={setValue} />
			{(value.from || value.to) && (
				<p style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
					From: {value.from?.toDateString() ?? '—'} &nbsp;|&nbsp; To: {value.to?.toDateString() ?? '—'}
				</p>
			)}
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: { from: null, to: null },
		placeholder: 'Select a date range...',
	},
};

export const WithInitialRange: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: {
			from: new Date(2024, 0, 10),
			to: new Date(2024, 0, 25),
		},
	},
};

export const SingleDayRange: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: {
			from: new Date(2024, 0, 15),
			to: new Date(2024, 0, 15),
		},
	},
};

export const WithMinMaxConstraints: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: { from: null, to: null },
		minDate: new Date(),
		maxDate: addDays(new Date(), 30),
		placeholder: 'Next 30 days only...',
	},
};

export const WithDisabledDates: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: { from: null, to: null },
		isDisabled: (date: Date) => {
			// Disable weekends
			const day = date.getDay();
			return day === 0 || day === 6;
		},
		placeholder: 'Weekdays only...',
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: {
			from: new Date(2024, 0, 10),
			to: new Date(2024, 0, 20),
		},
		disabled: true,
	},
};

export const CustomDateFormat: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: { from: null, to: null },
		dateFormat: 'yyyy-MM-dd',
		placeholder: 'YYYY-MM-DD format...',
	},
};

export const FormIntegration: StoryObj = {
	render: () => {
		const [value, setValue] = useState<DateRange>({ from: null, to: null });
		return (
			<div style={{ width: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
				<FieldDateRange
					label="Project Timeline"
					description="Select the start and end date for this project."
					value={value}
					onChange={setValue}
					placeholder="Select project dates..."
				/>
				{value.from && value.to && (
					<p style={{ fontSize: 13, color: '#666' }}>
						Duration: {Math.round((value.to.getTime() - value.from.getTime()) / 86400000) + 1} days
					</p>
				)}
			</div>
		);
	},
};

export const PastRangeOnly: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: { from: null, to: null },
		maxDate: new Date(),
		placeholder: 'Past dates only...',
	},
};
