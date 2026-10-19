import type { Meta, StoryObj } from '@storybook/react';
import { AppShell, type ShellItem, type ShellMenu } from './AppShell.js';
import { AccentScope } from './AccentScope.js';
import { ThemeScope } from './ThemeScope.js';
import { InitialsTile } from '../display/InitialsTile.js';
import { initialsOf } from '../display/initials.js';

const meta: Meta<typeof AppShell> = {
	title: 'Layout/AppShell',
	component: AppShell,
	parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof AppShell>;

const MODULES = [
	{ id: 'queue', title: 'Queue', color: '#0d9488' },
	{ id: 'orchestrator', title: 'Orchestrator', color: '#7c3aed' },
	{ id: 'audit-log', title: 'Audit log', color: '#e11d48' },
];

function tabs(currentId: string): ShellItem[] {
	return MODULES.map((m) => ({
		id: m.id,
		label: m.title,
		href: `#/${m.id}`,
		icon: <InitialsTile text={initialsOf(m.title)} color={m.color} />,
		current: m.id === currentId ? 'true' : undefined,
		accent: m.color,
	}));
}

const MENU: ShellMenu = {
	title: 'Queue',
	label: 'Queue pages',
	items: [
		{ id: 'overview', label: 'Overview', href: '#/queue', current: 'page' },
		{ id: 'jobs', label: 'Jobs', href: '#/queue/jobs' },
		{ id: 'workers', label: 'Workers', href: '#/queue/workers' },
	],
};

function Page() {
	return (
		<div className="p-6 text-content">
			<h1 className="text-xl font-semibold">Queue overview</h1>
			<p className="mt-2 text-muted">The page content goes here.</p>
		</div>
	);
}

/** Plain links, no router: the host decides what is current. The skip link appears on the first Tab. */
export const Basic: Story = {
	render: () => (
		<AppShell brand="my-app" tabs={tabs('queue')} tabsLabel="Modules" menu={MENU} skipLabel="Skip to content" actions={<span className="text-sm text-muted">actions</span>}>
			<Page />
		</AppShell>
	),
};

/** The current tab glows in its own accent; a tab without `accent` uses the theme accent (here recolored by AccentScope). */
export const ThemeAccentFallback: Story = {
	render: () => (
		<AccentScope color="#0284c7">
			<AppShell
				brand="my-app"
				tabs={tabs('queue').map((t) => ({ ...t, accent: undefined }))}
				tabsLabel="Modules"
				menu={MENU}
			>
				<Page />
			</AppShell>
		</AccentScope>
	),
};

/** Same data under each theme: every color is a token, so nothing else changes. */
export const LightAndDark: Story = {
	render: () => (
		<div className="flex flex-col">
			{(['light', 'dark'] as const).map((theme) => (
				<ThemeScope key={theme} theme={theme} surface="panel">
					<div className="h-80">
						<AppShell brand={`${theme} theme`} tabs={tabs('orchestrator')} tabsLabel={`Modules (${theme})`} menu={{ ...MENU, label: `Queue pages (${theme})` }}>
							<Page />
						</AppShell>
					</div>
				</ThemeScope>
			))}
		</div>
	),
};

const MANY = Array.from({ length: 16 }, (_, i) => ({ id: `m${i}`, title: `Module ${i + 1}`, color: ['#0d9488', '#7c3aed', '#e11d48', '#0284c7'][i % 4]! }));

/** More tabs than the bar can hold: the current one (the 12th) is scrolled into view and `moreLabel` lists the cut-off tabs. */
export const ManyTabs: Story = {
	render: () => (
		<div className="w-[640px] max-w-full">
			<AppShell
				brand="my-app"
				tabs={MANY.map((m, i) => ({ id: m.id, label: m.title, href: `#/${m.id}`, accent: m.color, current: i === 11 ? ('true' as const) : undefined }))}
				tabsLabel="Modules"
				menu={MENU}
				moreLabel="More"
			>
				<Page />
			</AppShell>
		</div>
	),
};
