import type { Meta, StoryObj } from '@storybook/react';
import { Settings } from 'lucide-react';
import { Button } from './_Button.js';

const meta: Meta<typeof Button> = {
	title: 'Controls/Button',
	component: Button,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
	args: { children: 'Save', variant: 'primary' },
};

export const IconSizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Button size="icon" variant="secondary" aria-label="Settings large">
				<Settings className="h-5 w-5" />
			</Button>
			<Button size="icon-sm" variant="secondary" aria-label="Settings medium">
				<Settings className="h-4 w-4" />
			</Button>
			<Button size="icon-xs" variant="secondary" aria-label="Settings small">
				<Settings className="h-3 w-3" />
			</Button>
		</div>
	),
};

export const LinkVariant: Story = {
	render: () => (
		<p className="text-sm text-content">
			View the{' '}
			<Button variant="link" onClick={() => undefined}>
				release notes
			</Button>{' '}
			for details.
		</p>
	),
};
