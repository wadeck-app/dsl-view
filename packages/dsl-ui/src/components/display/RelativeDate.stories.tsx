import type { Meta, StoryObj } from '@storybook/react';

import { RelativeDate } from './RelativeDate.js';

const meta: Meta<typeof RelativeDate> = {
	title: 'Display/RelativeDate',
	component: RelativeDate,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof RelativeDate>;

export const JustNow: Story = {
	args: {
		date: new Date(Date.now() - 5000),
		tooltip: true,
	},
};

export const TwoHoursAgo: Story = {
	args: {
		date: new Date(Date.now() - 2 * 60 * 60 * 1000),
		tooltip: true,
	},
};

export const ThreeDaysAgo: Story = {
	args: {
		date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
		tooltip: true,
	},
};

export const AYearAgo: Story = {
	args: {
		date: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
		tooltip: true,
	},
};
