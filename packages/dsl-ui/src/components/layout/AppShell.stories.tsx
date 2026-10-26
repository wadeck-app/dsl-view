import type { Meta, StoryObj } from '@storybook/react';
import { LayoutDashboard, ListChecks, Cpu, Settings, Info } from 'lucide-react';
import { AppShell, MENU_VARIANT_AB_OPTIONS, type ShellItem, type ShellMenu, type ShellMenuVariant } from './AppShell.js';
import { AccentScope } from './AccentScope.js';
import { ThemeScope } from './ThemeScope.js';
import { AbDock, type AbTest } from '../dev/AbDock.js';
import { useAbTest } from '../dev/useAbTest.js';
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

// A fixed fake test: the story needs a dock, not a working A/B choice.
const DOCK_TEST: AbTest = {
	id: 'shell-story',
	label: 'Policy scorecard layout',
	summary: 'cards',
	value: 'cards',
	options: [
		{ id: 'cards', label: 'One card per policy', title: 'Cards.' },
		{ id: 'table', label: 'One compact table', title: 'Table.' },
	],
	onSelect: () => {},
};

const TALL_MENU: ShellMenu = {
	title: 'Queue',
	label: 'Queue pages',
	items: Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, label: `Page number ${i + 1}`, href: `#/queue/p${i}`, current: i === 0 ? ('page' as const) : undefined })),
};

/**
 * The bar and the side menu stay in place while the page scrolls. The menu holds 40 entries, more than a window:
 * it scrolls on its own instead of growing the page. The A/B dock sits in the content area, right of the menu.
 */
export const LongPageTallMenu: Story = {
	render: () => (
		<AppShell brand="my-app" tabs={tabs('queue')} tabsLabel="Modules" menu={TALL_MENU} actions={<span className="text-sm text-muted">actions</span>}>
			<div className="p-6 text-content">
				<h1 className="text-xl font-semibold">Long page</h1>
				{Array.from({ length: 60 }, (_, i) => (
					<p key={i} className="mt-4 text-muted">
						Paragraph {i + 1}. Scroll: the top bar and the side menu do not move.
					</p>
				))}
			</div>
			<AbDock enabled tests={[DOCK_TEST]} />
		</AppShell>
	),
};

function LongPage({ barOnScroll }: { barOnScroll: 'steady' | 'shrink' | 'hide' | 'icons' }) {
	return (
		<AppShell brand="my-app" tabs={tabs('queue')} tabsLabel="Modules" menu={TALL_MENU} barOnScroll={barOnScroll} actions={<span className="text-sm text-muted">actions</span>}>
			<div className="p-6 text-content">
				<h1 className="text-xl font-semibold">barOnScroll = {barOnScroll}</h1>
				{Array.from({ length: 60 }, (_, i) => (
					<p key={i} className="mt-4 text-muted">
						Paragraph {i + 1}. Scroll down, then up. Hover or Tab into the bar to expand it.
					</p>
				))}
			</div>
		</AppShell>
	);
}

/** After the first scroll the bar is 1.5rem with smaller text; full again at the top, on hover and on focus. */
export const BarShrink: Story = { render: () => <LongPage barOnScroll="shrink" /> };
/** The bar slides away when scrolling down and returns after scrolling up a little; the menu then sticks to the top. */
export const BarHide: Story = { render: () => <LongPage barOnScroll="hide" /> };
/** After the first scroll the bar is a 2rem strip of icons (tooltips carry the names). */
export const BarIcons: Story = { render: () => <LongPage barOnScroll="icons" /> };

const ICON = { size: 16, 'aria-hidden': true } as const;
const GROUPED_MENU: ShellMenu = {
	title: 'Queue',
	label: 'Queue pages',
	items: [
		{ id: 'overview', label: 'Overview', href: '#/queue', current: 'page', icon: <LayoutDashboard {...ICON} />, description: 'Health of the whole queue' },
		{ id: 'jobs', label: 'Jobs', href: '#/queue/jobs', icon: <ListChecks {...ICON} />, description: 'Pending, running and failed jobs' },
		{ id: 'workers', label: 'Workers', href: '#/queue/workers', icon: <Cpu {...ICON} />, description: 'Who is picking jobs up' },
		{ kind: 'separator', id: 'admin', label: 'Administration' },
		...Array.from({ length: 30 }, (_, i) => ({ id: `a${i}`, label: `Admin page ${i + 1}`, href: `#/queue/a${i}`, icon: <Settings {...ICON} />, description: i % 3 === 0 ? `Settings group ${i + 1}` : undefined })),
		{ kind: 'separator', id: 'unlabelled' },
		{ id: 'about', label: 'About', href: '#/queue/about', icon: <Info {...ICON} /> },
	],
};

function MenuVariantDemo({ menuVariant }: { menuVariant: ShellMenuVariant }) {
	return (
		<AppShell brand="my-app" tabs={tabs('queue')} tabsLabel="Modules" menu={GROUPED_MENU} menuVariant={menuVariant}>
			<div className="p-6 text-content">
				<h1 className="text-xl font-semibold">menuVariant = {menuVariant}</h1>
				<p className="mt-2 text-muted">The menu holds more entries than the window: it scrolls on its own. Use the arrow keys, Home and End inside it.</p>
				{Array.from({ length: 40 }, (_, i) => (
					<p key={i} className="mt-4 text-muted">
						Paragraph {i + 1}.
					</p>
				))}
			</div>
		</AppShell>
	);
}

/** The reference: 15rem, icon and label. */
export const MenuClassic: Story = { render: () => <MenuVariantDemo menuVariant="classic" /> };
/** 13rem, text rows without icons; the current row is bold with a 2px accent line on the right edge. */
export const MenuSlim: Story = { render: () => <MenuVariantDemo menuVariant="slim" /> };
/** 18rem, a card per entry with the optional `description` line; lifts on hover. */
export const MenuCards: Story = { render: () => <MenuVariantDemo menuVariant="cards" /> };
/** 5rem launcher column: icon above a small label, the current one is a filled tile. */
export const MenuTiles: Story = { render: () => <MenuVariantDemo menuVariant="tiles" /> };
/** 3.5rem icon rail; hover or Tab to an icon to see its label fly out. */
export const MenuFlyout: Story = { render: () => <MenuVariantDemo menuVariant="flyout" /> };
/** A rounded panel detached from the edges with a soft shadow. */
export const MenuFloating: Story = { render: () => <MenuVariantDemo menuVariant="floating" /> };
/** Timeline: guide line, a node per entry, separators as group titles. */
export const MenuTree: Story = { render: () => <MenuVariantDemo menuVariant="tree" /> };
/** The chevron (or the `[` key) folds it to a 1rem sliver; hover or focus on the sliver peeks the menu. Kept in localStorage `app-shell.menu`. */
export const MenuPeek: Story = { render: () => <MenuVariantDemo menuVariant="peek" /> };

function MenuAbDemo() {
	// The host's way to compare the variants: one A/B test, the dock shows the one-line hint of each as a tooltip.
	const test = useAbTest({ id: 'shell-menu', label: 'Side menu', initial: 'classic', options: MENU_VARIANT_AB_OPTIONS });
	return (
		<AppShell brand="my-app" tabs={tabs('queue')} tabsLabel="Modules" menu={GROUPED_MENU} menuVariant={test.value}>
			<div className="p-6 text-content">
				<h1 className="text-xl font-semibold">Side menu = {test.value}</h1>
				<p className="mt-2 text-muted">Pick a variant in the dock at the bottom; hover an option for its hint.</p>
			</div>
			<AbDock enabled tests={[test]} />
		</AppShell>
	);
}

/** All variants through the A/B dock (labels and hints come from `MENU_VARIANT_AB_OPTIONS`). */
export const MenuAbDock: Story = { render: () => <MenuAbDemo /> };
