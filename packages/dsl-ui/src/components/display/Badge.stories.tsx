import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { Badge } from './Badge.js';

const meta: Meta<typeof Badge> = {
    title: 'Display/Badge',
    component: Badge,
    parameters: { layout: 'centered' },
    argTypes: {
        variant: { control: 'select', options: ['default', 'primary', 'success', 'warning', 'danger', 'info'] },
        size: { control: 'radio', options: ['sm', 'md'] },
    },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { label: 'Default', variant: 'default' } };
export const Primary: Story = { args: { label: 'Primary', variant: 'primary' } };
export const Success: Story = { args: { label: 'Active', variant: 'success' } };
export const Warning: Story = { args: { label: 'Pending', variant: 'warning' } };
export const Danger: Story = { args: { label: 'Error', variant: 'danger' } };
export const Info: Story = { args: { label: 'Info', variant: 'info' } };
export const SizeMd: Story = { args: { label: 'Medium', variant: 'primary', size: 'md' } };

// The whole badge is the link, with the same look plus hover and focus states. MemoryRouter keeps the click inside the story.
export const AsLink: Story = {
    decorators: [
        (Story) => (
            <MemoryRouter>
                <Story />
            </MemoryRouter>
        ),
    ],
    args: { label: 'Relay connected', variant: 'success', tone: 'subtle', href: '/modules/queue/webhooks' },
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Badge label="Default" variant="default" />
            <Badge label="Primary" variant="primary" />
            <Badge label="Success" variant="success" />
            <Badge label="Warning" variant="warning" />
            <Badge label="Danger" variant="danger" />
            <Badge label="Info" variant="info" />
        </div>
    ),
};
