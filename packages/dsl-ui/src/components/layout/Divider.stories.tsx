import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from './Divider.js';

const meta: Meta<typeof Divider> = {
    title: 'Layout/Divider',
    component: Divider,
    parameters: { layout: 'padded' },
    decorators: [(Story) => <div style={{ width: 300, padding: 16 }}><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Divider>;

export const Horizontal: Story = { args: {} };
export const HorizontalWithLabel: Story = { args: { label: 'OR' } };
export const Vertical: Story = {
    args: { orientation: 'vertical' },
    decorators: [(Story) => <div style={{ display: 'flex', height: 40, alignItems: 'center', gap: 8 }}><span>Left</span><Story /><span>Right</span></div>],
};
