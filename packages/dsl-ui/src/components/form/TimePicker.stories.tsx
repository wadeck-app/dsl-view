import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { TimePicker } from './TimePicker.js';
import { FieldTime } from './FieldTime.js';

const meta: Meta<typeof TimePicker> = {
	title: 'Form/TimePicker',
	component: TimePicker,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof TimePicker>;

function Controlled(args: React.ComponentProps<typeof TimePicker>) {
	const [value, setValue] = useState(args.value ?? null);
	return (
		<div style={{ width: 280 }}>
			<TimePicker {...args} value={value} onChange={setValue} />
			{value && (
				<p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>Selected: {value}</p>
			)}
		</div>
	);
}

export const Default: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: null,
		placeholder: 'Select a time...',
	},
};

export const With24hValue: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: '14:30',
		placeholder: 'Select a time...',
	},
};

export const Mode12h: Story = {
	name: '12h mode with AM/PM',
	render: args => <Controlled {...args} />,
	args: {
		value: '09:15',
		is12Hour: true,
		placeholder: 'Select a time...',
	},
};

export const Mode12hPM: Story = {
	name: '12h mode PM example',
	render: args => <Controlled {...args} />,
	args: {
		value: '15:45',
		is12Hour: true,
		placeholder: 'Select a time...',
	},
};

export const Step15Minutes: Story = {
	name: '15-minute step increments',
	render: args => <Controlled {...args} />,
	args: {
		value: '10:00',
		minuteStep: 15,
		placeholder: 'Select a time...',
	},
};

export const Step30Minutes: Story = {
	name: '30-minute step increments',
	render: args => <Controlled {...args} />,
	args: {
		value: '10:00',
		minuteStep: 30,
		placeholder: 'Select a time...',
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		value: '09:00',
		disabled: true,
	},
};

export const FormIntegration: Story = {
	name: 'FieldTime form wrapper',
	render: () => {
		const [value, setValue] = useState<string | null>('10:00');
		return (
			<div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
				<FieldTime
					label="Meeting time"
					description="Pick the start time for your meeting"
					value={value}
					onChange={setValue}
				/>
				<FieldTime
					label="Departure time (15-min slots)"
					description="Schedules run every 15 minutes"
					value={value}
					onChange={setValue}
					minuteStep={15}
				/>
				<FieldTime
					label="Time (12h format)"
					value={value}
					onChange={setValue}
					is12Hour
				/>
				{value && (
					<p style={{ fontSize: 14, color: '#666' }}>Raw value: {value}</p>
				)}
			</div>
		);
	},
};
