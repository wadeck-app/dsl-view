import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { StatTile } from './StatTile.js';

const meta: Meta<typeof StatTile> = {
    title: 'Layout/StatTile',
    component: StatTile,
    parameters: { layout: 'padded' },
    decorators: [(Story) => <div style={{ maxWidth: 220, padding: 24 }}><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof StatTile>;

export const Default: Story = {
    args: {
        label: 'Total Revenue',
        value: '$48,295',
    },
};

export const WithTrendUp: Story = {
    args: {
        label: 'Monthly Sales',
        value: '$12,400',
        trend: { value: 14, direction: 'up', label: 'vs last month' },
    },
};

export const WithTrendDown: Story = {
    args: {
        label: 'Refund Rate',
        value: '3.2%',
        trend: { value: 8, direction: 'down', label: 'vs last month' },
    },
};

export const LoadingState: Story = {
    args: {
        label: 'Total Revenue',
        value: '$48,295',
        loading: true,
    },
};

export const DashboardRow: Story = {
    decorators: [
        () => (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: 24, maxWidth: 960 }}>
                <StatTile
                    label="Total Revenue"
                    value="$48,295"
                    trend={{ value: 14, direction: 'up', label: 'vs last month' }}
                    icon={<span>💰</span>}
                />
                <StatTile
                    label="Active Users"
                    value="3,842"
                    trend={{ value: 6, direction: 'up', label: 'vs last week' }}
                    icon={<span>👥</span>}
                />
                <StatTile
                    label="Refund Rate"
                    value="3.2%"
                    trend={{ value: 2, direction: 'down', label: 'vs last month' }}
                    icon={<span>↩</span>}
                />
                <StatTile
                    label="Avg. Order Value"
                    value="$128"
                    trend={{ value: 0, direction: 'neutral', label: 'no change' }}
                    icon={<span>🛒</span>}
                />
            </div>
        ),
    ],
};
