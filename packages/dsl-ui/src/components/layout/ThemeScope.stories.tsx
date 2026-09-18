import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ThemeScope } from './ThemeScope.js';
import { ScrollArea } from './ScrollArea.js';
import { Button } from '../controls/_Button.js';
import { ChipButton } from '../controls/ChipButton.js';
import { Checkbox } from '../controls/Checkbox.js';
import { FieldSelect } from '../form/FieldSelect.js';
import { FieldText } from '../form/FieldText.js';
import { Badge } from '../display/Badge.js';
import { Progress } from '../display/Progress.js';
import { Skeleton } from '../display/Skeleton.js';

const meta: Meta<typeof ThemeScope> = {
	title: 'Layout/ThemeScope',
	component: ThemeScope,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof ThemeScope>;

const OPTIONS = [
	{ value: 'a', label: 'Option A' },
	{ value: 'b', label: 'Option B' },
];

/**
 * A representative set of controls, so each nesting level can be judged on real components rather
 * than on coloured boxes. Deliberately includes a native select, a checkbox and a scroll area -
 * those are UA-drawn chrome, which only `color-scheme` can reach.
 */
function Controls({ label }: { label: string }) {
	const [checked, setChecked] = useState(true);
	const [choice, setChoice] = useState('a');
	const [text, setText] = useState('editable');
	return (
		<div className="space-y-3">
			<p className="text-sm font-semibold">{label}</p>

			<div className="flex flex-wrap items-center gap-2">
				<Button variant="primary" size="sm">Primary</Button>
				<Button variant="secondary" size="sm">Secondary</Button>
				<Button variant="link" size="sm">Link</Button>
				{/* `label`, not children: Badge takes a string prop, and children are silently
				    dropped. Stories are excluded from tsconfig, so nothing caught it - the badges
				    rendered as empty slivers until someone looked at the screenshot. */}
				<Badge label="ok" variant="success" />
				<Badge label="failed" variant="danger" tone="subtle" />
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{/* ChipButton styles itself with dark: variants via chipColors - the known exception. */}
				<ChipButton active onClick={() => {}}>chip active</ChipButton>
				<ChipButton active={false} onClick={() => {}}>chip idle</ChipButton>
				<ChipButton active emphasis="strong" onClick={() => {}}>strong</ChipButton>
			</div>

			<div className="flex items-center gap-4">
				<Checkbox checked={checked} onChange={e => setChecked(e.target.checked)} aria-label="A checkbox" />
				<Progress value={64} showValue layout="inline" size="sm" />
			</div>

			{/* Native chrome: the dropdown list and the caret are painted by the browser. */}
			<FieldSelect label="A native select" value={choice} onChange={setChoice} options={OPTIONS} />
			<FieldText label="A text field" value={text} onChange={setText} />

			<Skeleton />

			{/* The scrollbar is the giveaway: it must match THIS panel, not the app. */}
			<ScrollArea className="h-24 rounded border border-border p-2">
				{Array.from({ length: 20 }, (_, i) => (
					<p key={i} className="text-xs">scrollable line {i + 1}</p>
				))}
			</ScrollArea>
		</div>
	);
}

/** One scope, dark, inside a light Storybook canvas. */
export const Dark: Story = {
	render: () => (
		<ThemeScope theme="dark" className="p-4 rounded-lg">
			<Controls label="dark scope in a light page" />
		</ThemeScope>
	),
};

/** The direction that was impossible before: light re-asserted inside a dark app. */
export const LightInsideDark: Story = {
	render: () => (
		<ThemeScope theme="dark" className="p-4 rounded-lg space-y-4">
			<Controls label="outer: dark" />
			<ThemeScope theme="light" surface="panel" className="p-4 rounded-lg">
				<Controls label="inner: light, inside dark" />
			</ThemeScope>
		</ThemeScope>
	),
};

/**
 * Four levels, alternating.
 *
 * Every level should be internally consistent: text, surfaces, borders, the native select's
 * dropdown and the scroll area's scrollbar all belonging to that level's palette. Custom properties
 * inherit, so each element takes its value from the NEAREST scope above it.
 *
 * Watch the chips. ChipButton styles itself with Tailwind `dark:` variants through chipColors, and a
 * `dark:` variant keys off ANY `.dark` ancestor - so at the light levels nested inside a dark one it
 * keeps its dark styling while everything around it is light. That is the known limitation, shown
 * rather than hidden: CSS cannot express "nearest ancestor wins" for a variant selector, so the fix
 * is chipColors using tokens.
 */
export const AlternatingFourLevels: Story = {
	render: () => (
		<ThemeScope theme="light" className="p-4 rounded-lg space-y-4">
			<Controls label="level 1 - light" />
			<ThemeScope theme="dark" className="p-4 rounded-lg space-y-4">
				<Controls label="level 2 - dark" />
				<ThemeScope theme="light" className="p-4 rounded-lg space-y-4">
					<Controls label="level 3 - light" />
					<ThemeScope theme="dark" className="p-4 rounded-lg">
						<Controls label="level 4 - dark" />
					</ThemeScope>
				</ThemeScope>
			</ThemeScope>
		</ThemeScope>
	),
};

/** The same four levels the other way round, so neither direction is privileged. */
export const AlternatingFromDark: Story = {
	render: () => (
		<ThemeScope theme="dark" className="p-4 rounded-lg space-y-4">
			<Controls label="level 1 - dark" />
			<ThemeScope theme="light" className="p-4 rounded-lg space-y-4">
				<Controls label="level 2 - light" />
				<ThemeScope theme="dark" className="p-4 rounded-lg space-y-4">
					<Controls label="level 3 - dark" />
					<ThemeScope theme="light" className="p-4 rounded-lg">
						<Controls label="level 4 - light" />
					</ThemeScope>
				</ThemeScope>
			</ThemeScope>
		</ThemeScope>
	),
};

/**
 * A palette that is neither light nor dark: a terminal.
 *
 * This is what a log pane needs. `theme="dark"` gets the right `color-scheme` for the scrollbar and
 * the native select, and `tokens` replaces the surfaces with the terminal's own. Every component
 * inside then comes out terminal-coloured without knowing anything about terminals - which is the
 * point, and what a consumer previously hand-rolled per component.
 */
export const CustomPalette: Story = {
	render: () => (
		<ThemeScope
			theme="dark"
			surface="none"
			className="p-4 rounded-lg font-mono"
			tokens={{
				'--color-bg': '#111827',
				'--color-surface': '#374151',
				'--color-content': '#e5e7eb',
				'--color-muted': '#9ca3af',
				'--color-muted-bg': '#4b5563',
				'--color-border': '#4b5563',
				'--color-bg-secondary': '#4b5563',
				'--color-primary': '#60a5fa',
				'--color-primary-solid': '#2563eb',
				'--color-primary-solid-hover': '#1d4ed8',
			}}
		>
			<div className="bg-bg text-content p-3 rounded">
				<Controls label="terminal palette, via tokens" />
			</div>
		</ThemeScope>
	),
};
