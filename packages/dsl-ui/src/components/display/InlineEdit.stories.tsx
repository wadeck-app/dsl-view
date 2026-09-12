import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { InlineEdit } from './InlineEdit.js';

const meta: Meta<typeof InlineEdit> = {
    title: 'Display/InlineEdit',
    component: InlineEdit,
    parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof InlineEdit>;

function Controlled(props: Partial<React.ComponentProps<typeof InlineEdit>>) {
    const [value, setValue] = useState(props.value ?? 'Editable text');
    return <InlineEdit {...props} value={value} onChange={setValue} />;
}

export const Default: Story = {
    render: () => <Controlled value="Click me to edit" />,
};

export const Multiline: Story = {
    render: () => (
        <Controlled
            value="This is a multiline value.&#10;Ctrl+Enter to commit."
            multiline
        />
    ),
};

export const WithValidation: Story = {
    name: 'With Validation (min 3 chars)',
    render: () => (
        <Controlled
            value="Valid"
            validate={(v) => (v.trim().length < 3 ? 'Must be at least 3 characters' : null)}
        />
    ),
};

export const Disabled: Story = {
    render: () => <InlineEdit value="Read-only value" onChange={() => {}} disabled />,
};

export const CustomStyling: Story = {
    render: () => (
        <Controlled
            value="Styled"
            className="font-semibold text-primary"
            editClassName="font-semibold"
        />
    ),
};

export const TableCellUsage: Story = {
    name: 'Table Cell Usage (compact row)',
    render: () => {
        const [name, setName] = useState('Alice Johnson');
        const [role, setRole] = useState('Engineer');
        return (
            <table className="border-collapse text-sm">
                <thead>
                    <tr className="bg-muted-bg text-muted">
                        <th className="border border-border px-3 py-1 text-left font-medium">Name</th>
                        <th className="border border-border px-3 py-1 text-left font-medium">Role</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-border px-2 py-0.5">
                            <InlineEdit value={name} onChange={setName} />
                        </td>
                        <td className="border border-border px-2 py-0.5">
                            <InlineEdit value={role} onChange={setRole} />
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    },
};
