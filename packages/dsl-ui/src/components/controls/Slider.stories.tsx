import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './Slider.js';

const meta: Meta<typeof Slider> = {
    title: 'Controls/Slider',
    component: Slider,
    parameters: { layout: 'centered' },
    decorators: [(Story) => <div style={{ width: 300 }}><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = { args: { value: 50, onChange: () => {} } };
export const WithLabel: Story = { args: { value: 50, onChange: () => {}, label: 'Volume' } };
export const WithValue: Story = { args: { value: 75, onChange: () => {}, label: 'Brightness', showValue: true } };
export const Stepped: Story = { args: { value: 50, onChange: () => {}, step: 10, label: 'Step 10', showValue: true } };
export const Disabled: Story = { args: { value: 30, onChange: () => {}, disabled: true, label: 'Disabled' } };
