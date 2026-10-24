import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { PageTabs } from './PageTabs.js';
import { Tabs } from './Tabs.js';

const meta: Meta<typeof Tabs> = {
	title: 'Navigation/Tabs',
	component: Tabs,
};
export default meta;
type Story = StoryObj<typeof Tabs>;

const TABS = [
	{ key: 'overview', label: 'Overview', children: <p className="text-sm text-content">Overview panel</p> },
	{ key: 'activity', label: 'Activity', children: <p className="text-sm text-content">Activity panel</p> },
	{ key: 'settings', label: 'Settings', children: <p className="text-sm text-content">Settings panel</p> },
];

// Real tab semantics: tablist/tab/tabpanel, roving tabindex, arrows and Home/End move and select.
export const Default: Story = {
	render: () => <Tabs tabs={TABS} />,
};

export const Controlled: Story = {
	render: () => {
		const [active, setActive] = useState('activity');
		return <Tabs tabs={TABS} value={active} onChange={setActive} />;
	},
};

export const PageTabsKeyboard: Story = {
	render: () => {
		const [active, setActive] = useState('overview');
		return (
			<PageTabs
				tabs={TABS.map(tab => ({ id: tab.key, label: tab.label, children: tab.children }))}
				activeTab={active}
				onChange={setActive}
			/>
		);
	},
};
