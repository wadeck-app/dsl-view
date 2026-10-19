import type { Meta, StoryObj } from '@storybook/react';
import { AccentScope } from './AccentScope.js';
import { ThemeScope } from './ThemeScope.js';
import { Button } from '../controls/_Button.js';
import { Badge } from '../display/Badge.js';

const meta: Meta<typeof AccentScope> = {
	title: 'Layout/AccentScope',
	component: AccentScope,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof AccentScope>;

function Sample({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 text-content">
			<span className="text-primary">{label}</span>
			<span className="rounded bg-primary-light px-2 py-1 text-primary">tint</span>
			<Button variant="primary">Primary</Button>
			<Badge label="Badge" />
		</div>
	);
}

/** The theme's own accent, then the same content recolored. */
export const Basic: Story = {
	render: () => (
		<div className="flex flex-col gap-3">
			<Sample label="Theme accent" />
			<AccentScope color="#0d9488">
				<Sample label="Teal" />
			</AccentScope>
			<AccentScope color="#e11d48">
				<Sample label="Rose" />
			</AccentScope>
		</div>
	),
};

/** Inner scope wins inside, the outer one stays around it. */
export const Nested: Story = {
	render: () => (
		<AccentScope color="#0284c7">
			<div className="flex flex-col gap-3">
				<Sample label="Outer (sky)" />
				<AccentScope color="#7c3aed">
					<Sample label="Inner (violet)" />
				</AccentScope>
			</div>
		</AccentScope>
	),
};

/** The light and dark values come from the nearest color-scheme: the same color under each ThemeScope. */
export const UnderThemeScopes: Story = {
	render: () => (
		<div className="flex flex-col gap-3">
			<ThemeScope theme="light" surface="panel" className="p-3">
				<AccentScope color="#0d9488">
					<Sample label="Teal on light" />
				</AccentScope>
			</ThemeScope>
			<ThemeScope theme="dark" surface="panel" className="p-3">
				<AccentScope color="#0d9488">
					<Sample label="Teal on dark" />
				</AccentScope>
			</ThemeScope>
		</div>
	),
};
