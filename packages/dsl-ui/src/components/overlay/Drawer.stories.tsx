import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '../controls/_Button.js';
import { Drawer } from './Drawer.js';

const meta: Meta<typeof Drawer> = {
	title: 'Overlay/Drawer',
	component: Drawer,
	parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof Drawer>;

export const RightDrawer: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		return (
			<div className="p-8">
				<Button onClick={() => setOpen(true)}>Open Right Drawer</Button>
				<Drawer open={open} onClose={() => setOpen(false)} title="Right Drawer" side="right">
					<p className="text-content">This drawer slides in from the right side.</p>
				</Drawer>
			</div>
		);
	},
};

export const LeftDrawer: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		return (
			<div className="p-8">
				<Button onClick={() => setOpen(true)}>Open Left Drawer</Button>
				<Drawer open={open} onClose={() => setOpen(false)} title="Left Drawer" side="left">
					<p className="text-content">This drawer slides in from the left side.</p>
				</Drawer>
			</div>
		);
	},
};

export const BottomDrawer: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		return (
			<div className="p-8">
				<Button onClick={() => setOpen(true)}>Open Bottom Drawer</Button>
				<Drawer open={open} onClose={() => setOpen(false)} title="Bottom Drawer" side="bottom">
					<p className="text-content">This drawer slides up from the bottom.</p>
				</Drawer>
			</div>
		);
	},
};

export const SmallDrawer: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		return (
			<div className="p-8">
				<Button onClick={() => setOpen(true)}>Open Small Drawer</Button>
				<Drawer open={open} onClose={() => setOpen(false)} title="Small Drawer" size="sm">
					<p className="text-content">A narrow (w-64) drawer for compact content.</p>
				</Drawer>
			</div>
		);
	},
};

export const MediumDrawer: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		return (
			<div className="p-8">
				<Button onClick={() => setOpen(true)}>Open Medium Drawer</Button>
				<Drawer open={open} onClose={() => setOpen(false)} title="Medium Drawer" size="md">
					<p className="text-content">The default (w-96) drawer size.</p>
				</Drawer>
			</div>
		);
	},
};

export const LargeDrawer: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		return (
			<div className="p-8">
				<Button onClick={() => setOpen(true)}>Open Large Drawer</Button>
				<Drawer open={open} onClose={() => setOpen(false)} title="Large Drawer" size="lg">
					<p className="text-content">A wide (w-[32rem]) drawer for richer content.</p>
				</Drawer>
			</div>
		);
	},
};

export const WithFooter: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		return (
			<div className="p-8">
				<Button onClick={() => setOpen(true)}>Open Drawer with Footer</Button>
				<Drawer
					open={open}
					onClose={() => setOpen(false)}
					title="Edit Settings"
					footer={
						<>
							<Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
							<Button variant="primary" onClick={() => setOpen(false)}>Save</Button>
						</>
					}
				>
					<p className="text-content">Make your changes here. The footer holds action buttons.</p>
				</Drawer>
			</div>
		);
	},
};

export const NoCloseButton: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		return (
			<div className="p-8">
				<Button onClick={() => setOpen(true)}>Open Drawer (no X button)</Button>
				<Drawer
					open={open}
					onClose={() => setOpen(false)}
					title="No Close Button"
					hideCloseButton
					footer={
						<Button variant="primary" onClick={() => setOpen(false)}>Done</Button>
					}
				>
					<p className="text-content">
						The close button is hidden. Use the footer button or press Escape to close.
					</p>
				</Drawer>
			</div>
		);
	},
};

type User = { id: number; name: string; email: string; role: string };

const USERS: User[] = [
	{ id: 1, name: 'Alice Martin', email: 'alice@example.com', role: 'Admin' },
	{ id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Editor' },
	{ id: 3, name: 'Carol Jones', email: 'carol@example.com', role: 'Viewer' },
];

export const DataTableDetail: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		const [selected, setSelected] = useState<User | null>(null);

		function openDetail(user: User) {
			setSelected(user);
			setOpen(true);
		}

		return (
			<div className="p-8">
				<h1 className="text-lg font-semibold text-content mb-4">Users</h1>
				<table className="w-full border-collapse border border-border text-sm">
					<thead>
						<tr className="bg-surface-subtle">
							<th className="border border-border px-4 py-2 text-left text-content">Name</th>
							<th className="border border-border px-4 py-2 text-left text-content">Email</th>
							<th className="border border-border px-4 py-2 text-left text-content">Role</th>
							<th className="border border-border px-4 py-2 text-left text-content">Actions</th>
						</tr>
					</thead>
					<tbody>
						{USERS.map(user => (
							<tr key={user.id} className="hover:bg-surface-subtle">
								<td className="border border-border px-4 py-2 text-content">{user.name}</td>
								<td className="border border-border px-4 py-2 text-content">{user.email}</td>
								<td className="border border-border px-4 py-2 text-content">{user.role}</td>
								<td className="border border-border px-4 py-2">
									<Button variant="ghost" size="sm" onClick={() => openDetail(user)}>
										View
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>

				<Drawer
					open={open}
					onClose={() => setOpen(false)}
					title={selected ? `User: ${selected.name}` : 'User Detail'}
					footer={
						<Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
					}
				>
					{selected && (
						<dl className="space-y-4">
							<div>
								<dt className="text-sm font-medium text-content-subtle">Name</dt>
								<dd className="text-base text-content">{selected.name}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-content-subtle">Email</dt>
								<dd className="text-base text-content">{selected.email}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-content-subtle">Role</dt>
								<dd className="text-base text-content">{selected.role}</dd>
							</div>
						</dl>
					)}
				</Drawer>
			</div>
		);
	},
};
