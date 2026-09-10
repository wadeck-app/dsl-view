import type { Meta, StoryObj } from '@storybook/react';
import { Collapsible } from './Collapsible.js';

const meta: Meta<typeof Collapsible> = {
    title: 'Layout/Collapsible',
    component: Collapsible,
    parameters: { layout: 'padded' },
    decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Collapsible>;

export const DefaultClosed: Story = {
    args: { title: 'Advanced settings', children: <p style={{ margin: 0, fontSize: 14 }}>Hidden until expanded.</p> },
};

export const DefaultOpen: Story = {
    args: { title: 'Advanced settings', defaultOpen: true, children: <p style={{ margin: 0, fontSize: 14 }}>Visible by default.</p> },
};

export const WithContent: Story = {
    args: {
        title: 'More details',
        defaultOpen: true,
        children: (
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 14 }}>
                <li>Item one</li>
                <li>Item two</li>
                <li>Item three</li>
            </ul>
        ),
    },
};
