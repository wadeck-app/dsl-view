import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { FieldDateTime } from './FieldDateTime.js';

const meta: Meta<typeof FieldDateTime> = {
	title: 'Form/FieldDateTime',
	component: FieldDateTime,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FieldDateTime>;

function Controlled(args: React.ComponentProps<typeof FieldDateTime>) {
	const [value, setValue] = useState<Date | null>(args.value ?? null);
	return (
		<div style={{ width: 420 }}>
			<FieldDateTime {...args} value={value} onChange={setValue} />
			<p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
				{value ? `Selected: ${value.toISOString()}` : 'Nothing selected'}
			</p>
		</div>
	);
}

export const Empty: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Run at',
		description: 'Pick the day, then the time.',
		value: null,
	},
};

export const WithValue: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Run at',
		value: new Date(2026, 8, 19, 9, 30),
	},
};

/** The interesting case: choosing the time first holds it until a date arrives. */
export const TimeBeforeDate: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Run at',
		description: 'Set the time first -- it is kept, and applied once you pick a day.',
		value: null,
	},
};

export const Required: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Run at',
		value: null,
		required: true,
		error: 'A moment is required',
	},
};

export const Bounded: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Run at',
		description: 'Only within September 2026.',
		value: new Date(2026, 8, 19, 9, 30),
		minDate: new Date(2026, 8, 1),
		maxDate: new Date(2026, 8, 30),
	},
};

export const TwelveHour: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Run at',
		value: new Date(2026, 8, 19, 14, 30),
		is12Hour: true,
		minuteStep: 15,
	},
};

export const Disabled: Story = {
	render: args => <Controlled {...args} />,
	args: {
		label: 'Run at',
		value: new Date(2026, 8, 19, 9, 30),
		disabled: true,
	},
};
