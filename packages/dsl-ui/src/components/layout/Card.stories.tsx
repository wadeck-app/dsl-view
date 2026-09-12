import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Badge } from '../display/Badge.js';
import { Card } from './Card.js';

const meta: Meta<typeof Card> = {
    title: 'Layout/Card',
    component: Card,
    parameters: { layout: 'padded' },
    decorators: [(Story) => <div style={{ maxWidth: 400, padding: 24 }}><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    args: {
        children: <p className="text-content">This is the default card with medium padding, shadow, and border.</p>,
    },
};

export const WithHeaderAndFooter: Story = {
    args: {
        header: <h3 className="font-semibold text-content">Card Title</h3>,
        footer: <p className="text-sm text-muted">Last updated: today</p>,
        children: <p className="text-content">Card body content goes here.</p>,
    },
};

export const Clickable: Story = {
    args: {
        onClick: () => alert('Card clicked!'),
        header: <h3 className="font-semibold text-content">Clickable Card</h3>,
        children: <p className="text-content">Click anywhere on this card.</p>,
    },
};

export const NoShadowNoBorder: Story = {
    args: {
        shadow: false,
        border: false,
        children: <p className="text-content">A flat card with no shadow or border.</p>,
    },
};

export const NestedContent: Story = {
    args: {
        header: <h3 className="font-semibold text-content">Status Overview</h3>,
        children: (
            <div className="space-y-2">
                <p className="text-content">All systems are operational.</p>
                <div className="flex gap-2 flex-wrap">
                    <Badge label="Production" variant="success" />
                    <Badge label="Staging" variant="info" />
                    <Badge label="Review" variant="warning" />
                </div>
            </div>
        ),
    },
};
