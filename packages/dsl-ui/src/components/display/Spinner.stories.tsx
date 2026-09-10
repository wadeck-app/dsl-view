import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner.js';

const meta: Meta<typeof Spinner> = {
    title: 'Display/Spinner',
    component: Spinner,
    parameters: { layout: 'centered' },
    argTypes: {
        size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    },
};
export default meta;
type Story = StoryObj<typeof Spinner>;

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };
export const CustomLabel: Story = { args: { size: 'md', label: 'Fetching data...' } };

export const AllSizes: Story = {
    render: () => (
        <div className="flex items-center gap-6">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
        </div>
    ),
};
