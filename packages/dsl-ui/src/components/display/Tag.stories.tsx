import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from './Tag.js';

const meta: Meta<typeof Tag> = {
    title: 'Display/Tag',
    component: Tag,
    parameters: { layout: 'centered' },
    argTypes: {
        color: { control: 'select', options: ['default', 'blue', 'green', 'red', 'yellow', 'purple'] },
    },
};
export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = { args: { label: 'Tag' } };
export const Blue: Story = { args: { label: 'TypeScript', color: 'blue' } };
export const Green: Story = { args: { label: 'Active', color: 'green' } };
export const Red: Story = { args: { label: 'Deprecated', color: 'red' } };
export const Removable: Story = { args: { label: 'React', color: 'blue', onRemove: () => {} } };

export const AllColors: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Tag label="Default" color="default" />
            <Tag label="Blue" color="blue" />
            <Tag label="Green" color="green" />
            <Tag label="Red" color="red" />
            <Tag label="Yellow" color="yellow" />
            <Tag label="Purple" color="purple" />
        </div>
    ),
};

export const RemovableTags: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Tag label="React" color="blue" onRemove={() => {}} />
            <Tag label="TypeScript" color="purple" onRemove={() => {}} />
            <Tag label="Tailwind" color="green" onRemove={() => {}} />
        </div>
    ),
};
