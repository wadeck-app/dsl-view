import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton.js';

const meta: Meta<typeof Skeleton> = {
    title: 'Display/Skeleton',
    component: Skeleton,
    parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Line: Story = { args: { variant: 'line', width: '300px', height: '1rem' } };
export const Circle: Story = { args: { variant: 'circle', width: '48px' } };
export const Block: Story = { args: { variant: 'block', width: '300px', height: '120px' } };
export const MultiLine: Story = { args: { variant: 'line', width: '100%', count: 3 } };

export const CardPlaceholder: Story = {
    render: () => (
        <div className="flex flex-col gap-3 w-64 p-4 border border-border rounded-lg">
            <Skeleton variant="line" width="60%" height="1.25rem" />
            <Skeleton variant="line" width="100%" count={3} />
            <div className="flex gap-2 items-center">
                <Skeleton variant="circle" width="32px" />
                <Skeleton variant="line" width="120px" height="0.75rem" />
            </div>
        </div>
    ),
};
