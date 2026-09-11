import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '../controls/_Button.js';
import { Popover } from './Popover.js';

const meta: Meta<typeof Popover> = {
	title: 'Overlay/Popover',
	component: Popover,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Popover>;

export const DefaultBottom: Story = {
	render: () => (
		<Popover trigger={<Button>Open Popover</Button>} side="bottom" align="start">
			<p className="text-sm text-content">This is a popover panel positioned below the trigger.</p>
		</Popover>
	),
};

export const Placements: Story = {
	render: () => (
		<div className="flex flex-col items-center gap-8 p-16">
			<Popover trigger={<Button>Top</Button>} side="top">
				<p className="text-sm text-content">Positioned above</p>
			</Popover>
			<div className="flex gap-8">
				<Popover trigger={<Button>Left</Button>} side="left">
					<p className="text-sm text-content">Positioned left</p>
				</Popover>
				<Popover trigger={<Button>Right</Button>} side="right">
					<p className="text-sm text-content">Positioned right</p>
				</Popover>
			</div>
			<Popover trigger={<Button>Bottom</Button>} side="bottom">
				<p className="text-sm text-content">Positioned below</p>
			</Popover>
		</div>
	),
};

export const WithFormContent: Story = {
	render: () => (
		<Popover trigger={<Button>Edit settings</Button>} side="bottom" align="start">
			<div className="flex flex-col gap-3 w-56">
				<h3 className="text-sm font-semibold text-content">Quick Settings</h3>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-content-subtle">Display name</span>
					<input
						type="text"
						defaultValue="Alice Martin"
						className="rounded border border-border bg-surface px-2 py-1 text-sm text-content outline-none focus:border-primary"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<span className="text-xs text-content-subtle">Theme</span>
					<select className="rounded border border-border bg-surface px-2 py-1 text-sm text-content">
						<option>Light</option>
						<option>Dark</option>
						<option>System</option>
					</select>
				</label>
				<Button size="sm" variant="primary" className="mt-1 self-end">
					Save
				</Button>
			</div>
		</Popover>
	),
};

export const ControlledMode: Story = {
	render: () => {
		const [open, setOpen] = useState(false);
		return (
			<div className="flex flex-col items-center gap-4">
				<p className="text-sm text-content-subtle">Popover is {open ? 'open' : 'closed'}</p>
				<div className="flex gap-2">
					<Button onClick={() => setOpen(true)}>Open externally</Button>
					<Button variant="ghost" onClick={() => setOpen(false)}>Close externally</Button>
				</div>
				<Popover
					trigger={<Button>Trigger (also toggles)</Button>}
					open={open}
					onOpenChange={setOpen}
				>
					<p className="text-sm text-content">Controlled popover content.</p>
					<Button size="sm" variant="ghost" className="mt-2" onClick={() => setOpen(false)}>
						Close
					</Button>
				</Popover>
			</div>
		);
	},
};

export const AlignVariants: Story = {
	render: () => (
		<div className="flex gap-4 p-8">
			<Popover trigger={<Button>Align Start</Button>} side="bottom" align="start">
				<p className="text-sm text-content w-40">Aligned to the start of the trigger.</p>
			</Popover>
			<Popover trigger={<Button>Align Center</Button>} side="bottom" align="center">
				<p className="text-sm text-content w-40">Aligned to the center of the trigger.</p>
			</Popover>
			<Popover trigger={<Button>Align End</Button>} side="bottom" align="end">
				<p className="text-sm text-content w-40">Aligned to the end of the trigger.</p>
			</Popover>
		</div>
	),
};
