import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../components/controls/_Button.js';
import { Breadcrumb } from '../components/navigation/Breadcrumb.js';
import { Tabs } from '../components/navigation/Tabs.js';
import { Card } from '../components/layout/Card.js';
import { CardActions } from '../components/layout/CardActions.js';
import { PageHeader } from '../components/display/PageHeader.js';
import { FieldText } from '../components/form/FieldText.js';
import { Switch } from '../components/controls/Switch.js';

// Realistic settings page composed from real dsl-ui components, so a size
// regression in any one of them is visible here even if it looks fine alone.

function SettingsPage() {
	const [tab, setTab] = useState('profile');
	const [name, setName] = useState('Alice Martin');
	const [email, setEmail] = useState('alice@example.com');
	const [notifications, setNotifications] = useState(true);

	return (
		<div className="mx-auto max-w-3xl space-y-4 p-6">
			<Breadcrumb currentPath="/settings/profile" onNavigate={() => undefined} />

			<PageHeader
				title="Settings"
				subtitle="Manage your account and preferences"
			/>

			<Tabs
				value={tab}
				onChange={setTab}
				tabs={[
					{
						key: 'profile',
						label: 'Profile',
						children: (
							<Card
								footer={
									<CardActions>
										<Button key="cancel" variant="secondary">Cancel</Button>
										<Button key="save" variant="primary">Save changes</Button>
									</CardActions>
								}
							>
								<div className="space-y-4">
									<FieldText label="Full name" value={name} onChange={setName} />
									<FieldText label="Email" value={email} onChange={setEmail} type="email" />
								</div>
							</Card>
						),
					},
					{
						key: 'notifications',
						label: 'Notifications',
						children: (
							<Card
								footer={
									<CardActions>
										<Button key="save" variant="primary">Save changes</Button>
									</CardActions>
								}
							>
								<Switch
									checked={notifications}
									onChange={setNotifications}
									label="Email me about account activity"
								/>
							</Card>
						),
					},
				]}
			/>
		</div>
	);
}

const meta: Meta = {
	title: 'Examples/SettingsPage',
	parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj = {
	render: () => <SettingsPage />,
};
