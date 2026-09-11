import type { Meta, StoryObj } from '@storybook/react';
import { Copy, Edit2, ExternalLink, Star, Trash2 } from 'lucide-react';

import { ContextMenu } from './ContextMenu.js';
import type { ContextMenuItem } from './ContextMenu.js';

const meta: Meta<typeof ContextMenu> = {
	title: 'Overlay/ContextMenu',
	component: ContextMenu,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof ContextMenu>;

const KebabTrigger = () => (
	<button
		className="rounded p-1.5 hover:bg-surface-subtle text-content-subtle hover:text-content transition-colors"
		aria-label="Open menu"
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<circle cx="8" cy="3" r="1.5" />
			<circle cx="8" cy="8" r="1.5" />
			<circle cx="8" cy="13" r="1.5" />
		</svg>
	</button>
);

export const BasicMenu: Story = {
	render: () => (
		<ContextMenu
			trigger={<KebabTrigger />}
			items={[
				{ label: 'View details', onClick: () => alert('View') },
				{ label: 'Edit', onClick: () => alert('Edit') },
				{ label: 'Duplicate', onClick: () => alert('Duplicate') },
			]}
		/>
	),
};

export const WithIcons: Story = {
	render: () => (
		<ContextMenu
			trigger={<KebabTrigger />}
			items={[
				{ label: 'Edit', icon: <Edit2 className="h-4 w-4" />, onClick: () => alert('Edit') },
				{ label: 'Duplicate', icon: <Copy className="h-4 w-4" />, onClick: () => alert('Duplicate') },
				{ label: 'Open link', icon: <ExternalLink className="h-4 w-4" />, onClick: () => alert('Open') },
				{ label: 'Favourite', icon: <Star className="h-4 w-4" />, onClick: () => alert('Favourite') },
			]}
		/>
	),
};

export const WithDangerItem: Story = {
	render: () => (
		<ContextMenu
			trigger={<KebabTrigger />}
			items={[
				{ label: 'Edit', icon: <Edit2 className="h-4 w-4" />, onClick: () => alert('Edit') },
				{ label: 'Duplicate', icon: <Copy className="h-4 w-4" />, onClick: () => alert('Duplicate') },
				{
					label: 'Delete',
					icon: <Trash2 className="h-4 w-4" />,
					onClick: () => alert('Delete'),
					danger: true,
				},
			]}
		/>
	),
};

export const WithSeparators: Story = {
	render: () => {
		const items: ContextMenuItem[] = [
			{ label: 'Edit', icon: <Edit2 className="h-4 w-4" />, onClick: () => alert('Edit') },
			{ label: 'Duplicate', icon: <Copy className="h-4 w-4" />, onClick: () => alert('Duplicate') },
			{ label: 'Open link', icon: <ExternalLink className="h-4 w-4" />, onClick: () => alert('Open') },
			{ label: 'sep-1', separator: true, onClick: () => {} },
			{ label: 'Favourite', icon: <Star className="h-4 w-4" />, onClick: () => alert('Favourite') },
			{ label: 'sep-2', separator: true, onClick: () => {} },
			{
				label: 'Delete',
				icon: <Trash2 className="h-4 w-4" />,
				onClick: () => alert('Delete'),
				danger: true,
			},
		];
		return <ContextMenu trigger={<KebabTrigger />} items={items} />;
	},
};

export const DisabledItems: Story = {
	render: () => (
		<ContextMenu
			trigger={<KebabTrigger />}
			items={[
				{ label: 'Edit', icon: <Edit2 className="h-4 w-4" />, onClick: () => alert('Edit') },
				{
					label: 'Publish (unavailable)',
					icon: <ExternalLink className="h-4 w-4" />,
					onClick: () => {},
					disabled: true,
				},
				{
					label: 'Archive (unavailable)',
					icon: <Star className="h-4 w-4" />,
					onClick: () => {},
					disabled: true,
				},
				{
					label: 'Delete',
					icon: <Trash2 className="h-4 w-4" />,
					onClick: () => alert('Delete'),
					danger: true,
				},
			]}
		/>
	),
};
