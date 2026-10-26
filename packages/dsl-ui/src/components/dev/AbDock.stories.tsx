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

// Long labels: columns grow with their label, the label column with the longest row label, the row up to the window.
function LongLabelsDemo() {
	const tests = [
		useAbTest({
			id: 'long-card',
			label: 'Policy scorecard layout',
			initial: 'cards',
			options: { cards: { label: 'One card per policy', hint: 'Cards.' }, table: { label: 'One compact table', hint: 'Table.' } },
		}),
		useAbTest({
			id: 'long-colour',
			label: 'Colour of figures',
			initial: 'a',
			options: {
				a: { label: 'Neutral', hint: 'A.' },
				b: { label: 'Semantic colours', hint: 'B.' },
				c: { label: 'Tinted by status', hint: 'C.' },
				d: { label: 'A rather long fourth option', hint: 'D.' },
				e: { label: 'E', hint: 'E.' },
			},
		}),
		useAbTest({ id: 'long-gap', label: 'Average policy scorecard column header density mode', initial: 'a', options: { a: { label: 'A', hint: 'A.' }, b: { label: 'B', hint: 'B.' } } }),
	];
	return (
		<div className="min-h-screen bg-bg p-8 text-content">
			<p>Long labels. The eye hides a test; Copy report copies only the visible ones.</p>
			<AbDock tests={tests} enabled />
		</div>
	);
}

export const LongLabels: Story = { render: () => <LongLabelsDemo /> };

// Fake side menu, 15rem wide: the dock must stay in the area to its right. `insetLeft` is what a host with its own menu passes
// (or sets as the `--ab-dock-inset-left` CSS variable); under a real AppShell nothing is needed (see Layout/AppShell, LongPageTallMenu).
function BesideMenuDemo() {
	const tests = [
		useAbTest({
			id: 'menu-card',
			label: 'Policy scorecard layout',
			initial: 'cards',
			options: {
				cards: { label: 'One card per policy', hint: 'Cards.' },
				table: { label: 'One compact table', hint: 'Table.' },
				a: { label: 'A rather long third option', hint: 'C.' },
				b: { label: 'Fourth option, longer still', hint: 'D.' },
				c: { label: 'Fifth', hint: 'E.' },
			},
		}),
		useAbTest({ id: 'menu-gap', label: 'Average policy scorecard column header density mode', initial: 'a', options: { a: { label: 'A', hint: 'A.' }, b: { label: 'B', hint: 'B.' } } }),
	];
	return (
		<div className="flex min-h-screen bg-bg text-content">
			<aside className="w-60 shrink-0 border-r border-border bg-surface p-3 text-sm text-muted">Fake side menu (15rem)</aside>
			<main className="flex-1 p-8">
				<p>The dock is centred on this area, never wider, never under the menu. Copy report is the round button at its bottom right.</p>
			</main>
			<AbDock tests={tests} enabled insetLeft="15rem" />
		</div>
	);
}

export const BesideSideMenu: Story = { render: () => <BesideMenuDemo /> };
