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

const ROW_NAMES = ['Dashboard width', 'Columns', 'Gap', 'Cell height', 'Bar', 'Filter chips'] as const;

// Six rows: the dock covers a good part of the page. Fold it with the chevron on its top edge, or Escape inside it.
function ManyRowsDemo() {
	const tests = [
		useAbTest({ id: 'many-0', label: ROW_NAMES[0], initial: 'a', options: { a: { label: 'A', hint: 'First variant.' }, b: { label: 'B', hint: 'Second variant.' } } }),
		useAbTest({ id: 'many-1', label: ROW_NAMES[1], initial: 'a', options: { a: { label: 'A', hint: 'First variant.' }, b: { label: 'B', hint: 'Second variant.' } } }),
		useAbTest({ id: 'many-2', label: ROW_NAMES[2], initial: 'a', options: { a: { label: 'A', hint: 'First variant.' }, b: { label: 'B', hint: 'Second variant.' } } }),
		useAbTest({ id: 'many-3', label: ROW_NAMES[3], initial: 'a', options: { a: { label: 'A', hint: 'First variant.' }, b: { label: 'B', hint: 'Second variant.' } } }),
		useAbTest({ id: 'many-4', label: ROW_NAMES[4], initial: 'a', options: { a: { label: 'A', hint: 'First variant.' }, b: { label: 'B', hint: 'Second variant.' } } }),
		useAbTest({ id: 'many-5', label: ROW_NAMES[5], initial: 'a', options: { a: { label: 'A', hint: 'First variant.' }, b: { label: 'B', hint: 'Second variant.' } } }),
	];
	return (
		<div className="min-h-screen bg-bg p-8 text-content">
			<p>Six rows. Fold the dock with the chevron on its top edge, or press Escape while the focus is inside it.</p>
			<AbDock tests={tests} enabled />
		</div>
	);
}

export const SixRowsFoldable: Story = { render: () => <ManyRowsDemo /> };
