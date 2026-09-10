import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './Switch.js';

const meta: Meta<typeof Switch> = {
    title: 'Controls/Switch',
    component: Switch,
    parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = { args: { checked: false, onChange: () => {} } };
export const Checked: Story = { args: { checked: true, onChange: () => {} } };
export const WithLabel: Story = { args: { checked: false, onChange: () => {}, label: 'Enable notifications' } };
export const Disabled: Story = { args: { checked: false, onChange: () => {}, disabled: true, label: 'Disabled' } };
export const Small: Story = { args: { checked: false, onChange: () => {}, size: 'sm', label: 'Small switch' } };
