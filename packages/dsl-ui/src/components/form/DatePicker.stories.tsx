import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { subDays, addDays } from 'date-fns';

import { DatePicker } from './DatePicker.js';
import { FieldDate } from './FieldDate.js';
import { Form } from './Form.js';

const meta: Meta<typeof DatePicker> = {
	title: 'Form/DatePicker',
	component: DatePicker,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof DatePicker>;

/**
 * Wrapper component to demonstrate DatePicker with internal state
 */
function Controlled(args: React.ComponentProps<typeof DatePicker>) {
	const [value, setValue] = useState<Date | null>(args.value ?? null);
	return (
		<div style={{ width: 320 }}>
			<DatePicker {...args} value={value} onChange={setValue} />
			<div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
				Selected: {value ? value.toLocaleDateString() : 'None'}
			</div>
		</div>
	);
}

/**
 * Default state - today's date
 */
export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		placeholder: 'Select a date...',
	},
};

/**
 * With initial value pre-selected
 */
export const WithInitialValue: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: new Date(2024, 0, 15),
	},
};

/**
 * Disabled state
 */
export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: new Date(2024, 0, 15),
		disabled: true,
	},
};

/**
 * With disabled dates - weekends disabled
 */
export const WithDisabledWeekends: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: new Date(2024, 0, 15),
		isDisabled: (date: Date) => {
			const day = date.getDay();
			return day === 0 || day === 6; // Sunday or Saturday
		},
		placeholder: 'Weekdays only',
	},
};

/**
 * With date range constraints - last 7 days
 */
export const WithDateRange: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: new Date(),
		minDate: subDays(new Date(), 7),
		maxDate: new Date(),
		placeholder: 'Last 7 days only',
	},
};

/**
 * With both min/max and disabled predicate
 */
export const WithComplexConstraints: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: new Date(),
		minDate: subDays(new Date(), 30),
		maxDate: addDays(new Date(), 30),
		isDisabled: (date: Date) => {
			// Disable Sundays even within the range
			return date.getDay() === 0;
		},
		placeholder: '±30 days, no Sundays',
	},
};

/**
 * Only future dates allowed
 */
export const FutureDatesOnly: Story = {
	render: args => <Controlled {...args} />,
	args: {
		minDate: new Date(),
		placeholder: 'Select a future date',
	},
};

/**
 * Only past dates allowed
 */
export const PastDatesOnly: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: new Date(2023, 11, 15),
		maxDate: new Date(new Date().setHours(0, 0, 0, 0)),
		placeholder: 'Select a past date',
	},
};

/**
 * FieldDate - Form integration example
 */
export const FormIntegration: Story = {
	render: () => {
		const [submitted, setSubmitted] = useState(false);
		return (
			<Form
				initialData={{
					birthDate: new Date(2000, 0, 1),
					appointmentDate: null,
				}}
				fields={
					<div className="space-y-4">
						<FieldDate
							name="birthDate"
							label="Birth Date"
							description="Select your date of birth"
							maxDate={new Date()}
						/>
						<FieldDate
							name="appointmentDate"
							label="Appointment Date"
							description="Select an appointment date (future dates only)"
							required
							minDate={new Date()}
						/>
					</div>
				}
				actions={
					<button
						type="submit"
						className="px-4 py-2 bg-primary text-white rounded"
						onClick={() => setSubmitted(true)}
					>
						Submit
					</button>
				}
				onSubmit={async () => {
					setSubmitted(true);
				}}
			/>
		);
	},
};

/**
 * Multiple dates with different constraints
 */
export const ComparisonView: Story = {
	render: () => {
		const [date1, setDate1] = useState<Date | null>(null);
		const [date2, setDate2] = useState<Date | null>(null);

		return (
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: 700 }}>
				<div>
					<h3 style={{ marginBottom: 16, fontWeight: 600 }}>Start Date</h3>
					<DatePicker
						value={date1}
						onChange={setDate1}
						maxDate={date2 ?? undefined}
						placeholder="Select start date"
					/>
					<p style={{ marginTop: 12, fontSize: 14, color: '#666' }}>
						{date1 ? date1.toLocaleDateString() : 'Not selected'}
					</p>
				</div>
				<div>
					<h3 style={{ marginBottom: 16, fontWeight: 600 }}>End Date</h3>
					<DatePicker
						value={date2}
						onChange={setDate2}
						minDate={date1 ?? undefined}
						placeholder="Select end date"
					/>
					<p style={{ marginTop: 12, fontSize: 14, color: '#666' }}>
						{date2 ? date2.toLocaleDateString() : 'Not selected'}
					</p>
				</div>
			</div>
		);
	},
};

/**
 * Custom disabled pattern - disable specific dates
 */
export const BlackoutDates: Story = {
	render: args => {
		const blackoutDates = [
			new Date(2024, 0, 1), // Jan 1
			new Date(2024, 0, 15), // Jan 15
			new Date(2024, 0, 25), // Jan 25
		];

		return (
			<Controlled
				{...args}
				isDisabled={(date: Date) => {
					return blackoutDates.some(
						bd => bd.toDateString() === date.toDateString(),
					);
				}}
				placeholder="Jan 1, 15, 25 are unavailable"
			/>
		);
	},
	args: {
		value: new Date(2024, 0, 10),
	},
};

/**
 * Custom placeholder text
 */
export const CustomPlaceholder: Story = {
	render: args => <Controlled {...args} />,
	args: {
		placeholder: 'Click to choose your preferred date',
	},
};
