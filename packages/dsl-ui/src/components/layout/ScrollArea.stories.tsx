import type { Meta, StoryObj } from '@storybook/react';
import { ScrollArea } from './ScrollArea.js';

/*
 * These stories exist to be LOOKED AT, at the scrollbar specifically.
 *
 * The rule: a scrollbar must match the surface it is drawn on, not the app theme. Each story
 * shows the same pane in both themes side by side, so the two can be compared without a toggle -
 * theme.css scopes the dark tokens to `.dark`, so a wrapper is enough to render a dark subtree.
 *
 * Scroll each pane. On Windows and Linux the scrollbar takes layout width and is always visible;
 * on macOS it is an overlay and only appears while scrolling.
 */

const meta: Meta<typeof ScrollArea> = {
	title: 'Layout/ScrollArea',
	component: ScrollArea,
	parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof ScrollArea>;

const lines = Array.from({ length: 40 }, (_, i) => `line ${i + 1}`);

/** Two panes, same markup, one per theme. */
function BothThemes({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="space-y-2">
			<p className="text-sm font-medium text-content">{label}</p>
			<div className="grid grid-cols-2 gap-4">
				<div className="bg-bg p-3 rounded border border-border">
					<p className="mb-2 text-xs uppercase tracking-wide text-muted">light theme</p>
					{children}
				</div>
				{/* `dark` carries both the tokens and `color-scheme: dark`, exactly as on a real app root. */}
				<div className="dark bg-bg p-3 rounded border border-border">
					<p className="mb-2 text-xs uppercase tracking-wide text-muted">dark theme</p>
					{children}
				</div>
			</div>
		</div>
	);
}

/**
 * The default, and the case that must NOT be forced.
 *
 * The panel is drawn from the theme's own surface tokens, so its scrollbar has to follow the
 * theme: light on the white card, dark on the dark one. Pinning `scheme="dark"` here would put a
 * dark scrollbar down a white panel.
 */
export const ThemedPanel: Story = {
	render: () => (
		<BothThemes label="scheme=auto on a themed surface - scrollbar follows the theme">
			<ScrollArea className="h-48 rounded border border-border bg-surface p-3">
				{lines.map(l => <p key={l} className="text-sm text-content">{l}</p>)}
			</ScrollArea>
		</BothThemes>
	),
};

/**
 * The log-pane case: a surface that is dark in both themes.
 *
 * Its tokens are overridden for the subtree, so nothing inside follows the app theme - and the
 * scrollbar must not either. Left on `auto`, the light-theme pane gets a white scrollbar running
 * down a near-black panel, which is the bug this prop exists for.
 */
export const AlwaysDarkPanel: Story = {
	render: () => (
		<BothThemes label="scheme=dark on a panel that is dark in both themes - scrollbar dark in both">
			<ScrollArea
				scheme="dark"
				className="h-48 rounded p-3 bg-[#111827] [--color-content:#e5e7eb]"
			>
				{lines.map(l => <p key={l} className="font-mono text-sm text-content">{l}</p>)}
			</ScrollArea>
		</BothThemes>
	),
};

/** The mirror: a panel that stays light inside a dark theme, e.g. a document or print preview. */
export const AlwaysLightPanel: Story = {
	render: () => (
		<BothThemes label="scheme=light on a panel that is light in both themes">
			<ScrollArea
				scheme="light"
				className="h-48 rounded p-3 bg-white [--color-content:#0f172a]"
			>
				{lines.map(l => <p key={l} className="text-sm text-content">{l}</p>)}
			</ScrollArea>
		</BothThemes>
	),
};

/**
 * The mistake, on purpose, so it is recognisable.
 *
 * `scheme="dark"` on a themed panel. In the light theme this is a dark scrollbar on a white
 * surface - the same class of error as the white-scrollbar-on-black-log it was meant to prevent,
 * just in the other direction. Compare against ThemedPanel.
 */
export const MismatchedOnPurpose: Story = {
	render: () => (
		<BothThemes label="WRONG: scheme=dark forced on a themed surface - look at the light pane">
			<ScrollArea scheme="dark" className="h-48 rounded border border-border bg-surface p-3">
				{lines.map(l => <p key={l} className="text-sm text-content">{l}</p>)}
			</ScrollArea>
		</BothThemes>
	),
};

/** Horizontal, to check the cross axis is genuinely locked rather than merely unused. */
export const HorizontalOnly: Story = {
	render: () => (
		<BothThemes label="axis=horizontal - the vertical axis cannot scroll">
			<ScrollArea axis="horizontal" className="h-24 rounded border border-border bg-surface p-3">
				<div className="flex gap-4 w-[1400px]">
					{Array.from({ length: 20 }, (_, i) => (
						<span key={i} className="text-sm text-content whitespace-nowrap">column {i + 1}</span>
					))}
				</div>
			</ScrollArea>
		</BothThemes>
	),
};
