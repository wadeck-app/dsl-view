import type { Meta, StoryObj } from '@storybook/react';

import { AbDock } from './AbDock.js';
import { useAbTest } from './useAbTest.js';

const meta: Meta<typeof AbDock> = {
	title: 'Dev/AbDock',
	component: AbDock,
	parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof AbDock>;

function Demo() {
	const tab = useAbTest({
		id: 'story-tab',
		label: 'Active tab',
		initial: 'pill',
		options: {
			pill: { label: 'Pill', hint: 'Tinted pill behind the active tab.' },
			ring: { label: 'Ring', hint: 'Outline ring around the active tab.' },
			underline: { label: 'Underline', hint: 'Underline below the active tab.' },
		},
	});
	const density = useAbTest({
		id: 'story-density',
		label: 'Density',
		initial: 'comfortable',
		options: {
			comfortable: { label: 'Comfortable', hint: 'Default row height.' },
			compact: { label: 'Compact', hint: 'Tighter rows.' },
		},
	});
	return (
		<div className="min-h-screen bg-bg p-8 text-content">
			<p>Applied: tab = {tab.value}, density = {density.value}</p>
			{/* `enabled` forces the dock on: Storybook is not a development build of the host app. */}
			<AbDock tests={[tab, density]} enabled />
		</div>
	);
}

export const TwoTests: Story = { render: () => <Demo /> };
