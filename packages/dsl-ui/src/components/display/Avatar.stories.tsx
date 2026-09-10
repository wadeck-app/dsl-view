import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar.js';

const meta: Meta<typeof Avatar> = {
    title: 'Display/Avatar',
    component: Avatar,
    parameters: { layout: 'centered' },
    argTypes: {
        size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithFallback: Story = { args: { fallback: 'JD', size: 'md' } };
export const WithImage: Story = { args: { src: 'https://i.pravatar.cc/150?img=3', alt: 'User', size: 'md' } };
export const SmallSize: Story = { args: { fallback: 'AB', size: 'sm' } };
export const LargeSize: Story = { args: { fallback: 'CD', size: 'lg' } };

export const AllSizes: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Avatar fallback="SM" size="sm" />
            <Avatar fallback="MD" size="md" />
            <Avatar fallback="LG" size="lg" />
        </div>
    ),
};
