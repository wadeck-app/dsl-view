import type { Meta, StoryObj } from '@storybook/react';
import { Link } from './Link.js';

const meta: Meta<typeof Link> = {
	title: 'Navigation/Link',
	component: Link,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Link>;

export const Default: Story = {
	args: { href: '/dashboard', label: 'Dashboard' },
};

export const External: Story = {
	args: { href: 'https://example.com', label: 'Visit site', external: true },
};

export const Muted: Story = {
	args: { href: '/secondary', label: 'Secondary link', variant: 'muted' },
};

export const Danger: Story = {
	args: { href: '/delete', label: 'Delete account', variant: 'danger' },
};
