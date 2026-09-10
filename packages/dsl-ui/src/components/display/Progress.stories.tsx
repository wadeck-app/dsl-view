import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './Progress.js';

const meta: Meta<typeof Progress> = {
    title: 'Display/Progress',
    component: Progress,
    parameters: { layout: 'padded' },
    argTypes: {
        variant: { control: 'select', options: ['default', 'success', 'danger'] },
        size: { control: 'radio', options: ['sm', 'md'] },
        value: { control: { type: 'range', min: 0, max: 100 } },
    },
};
export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = { args: { value: 60 } };
export const WithLabel: Story = { args: { value: 45, label: 'Upload progress', showValue: true } };
export const Success: Story = { args: { value: 100, variant: 'success', label: 'Complete', showValue: true } };
export const Danger: Story = { args: { value: 80, variant: 'danger', label: 'Disk usage', showValue: true } };
export const SmSize: Story = { args: { value: 60, size: 'sm' } };

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-4 w-80">
            <Progress value={60} label="Default" showValue />
            <Progress value={100} variant="success" label="Success" showValue />
            <Progress value={80} variant="danger" label="Danger" showValue />
        </div>
    ),
};
