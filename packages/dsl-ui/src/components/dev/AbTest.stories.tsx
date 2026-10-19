import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { AbExperiments } from './AbExperiments.js';
import { AbTest } from './AbTest.js';

const meta: Meta<typeof AbTest> = {
	title: 'Dev/AbTest',
	component: AbTest,
	parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof AbTest>;

// In an app, `renderNode` is wired by the generated registry entry and `variants` comes from the YAML view. Here the
// "views" are plain strings rendered by a stand-in renderNode.
const renderNode = (node: unknown): React.ReactNode => <p className="rounded border border-border bg-surface p-4">{String(node)}</p>;

function Demo() {
	return (
		// `enabled` forces the experiments on: Storybook is not a development build of the host app.
		<AbExperiments enabled>
			<div className="flex min-h-screen flex-col gap-4 bg-bg p-8 text-content">
				<AbTest
					id="story-header"
					label="Header"
					initial="plain"
					variants={{
						plain: { label: 'Plain', hint: 'The reference header.', view: 'Header: plain' },
						bold: { label: 'Bold', hint: 'Heavier title.', view: 'Header: bold' },
					}}
					renderNode={renderNode}
				/>
				<AbTest
					id="story-footer"
					label="Footer"
					initial="short"
					variants={{
						short: { label: 'Short', hint: 'One line.', view: 'Footer: short' },
						long: { label: 'Long', hint: 'Three lines.', view: 'Footer: long' },
					}}
					renderNode={renderNode}
				/>
			</div>
		</AbExperiments>
	);
}

export const TwoTestsOneDock: Story = { render: () => <Demo /> };
