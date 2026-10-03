import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { ChipButton } from '../components/controls/ChipButton.js';
import { Breadcrumb } from '../components/navigation/Breadcrumb.js';
import { Tabs } from '../components/navigation/Tabs.js';
import { PageTabs } from '../components/navigation/PageTabs.js';
import { FilterBar, type FilterBarFilter } from '../components/table/FilterBar.js';
import { BulkActionsToolbar } from '../components/table/BulkActionsToolbar.js';
import { Pagination } from '../components/table/Pagination.js';

// Every "row of small controls" component in dsl-ui, stacked so size drift
// between them is visible at a glance even though each looks fine alone.

function RowLabel({ children }: { children: React.ReactNode }) {
	return <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{children}</p>;
}

const sampleFilters: FilterBarFilter[] = [
	{ key: 'active', label: 'Active', value: 'active', active: true, color: 'green' },
	{ key: 'pending', label: 'Pending', value: 'pending', active: false, color: 'yellow' },
];

function ToolbarConsistencyPage() {
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState(sampleFilters);
	const [tabsValue, setTabsValue] = useState('overview');
	const [pageTabsValue, setPageTabsValue] = useState('overview');
	const [page, setPage] = useState(1);

	function handleFilterChange(key: string, _value: string, active: boolean) {
		setFilters(prev => prev.map(f => (f.key === key ? { ...f, active } : f)));
	}

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-6">
			<div>
				<RowLabel>Breadcrumb (Button size=&quot;sm&quot;, 14px icon)</RowLabel>
				<Breadcrumb currentPath="/settings/billing/invoices" onNavigate={() => undefined} />
			</div>

			<div>
				<RowLabel>FilterBar (SearchBar size=&quot;sm&quot; + ChipButton + Button size=&quot;sm&quot;, 12px icon)</RowLabel>
				<FilterBar
					search={search}
					onSearchChange={setSearch}
					filters={filters}
					onFilterChange={handleFilterChange}
					onClearAll={() => { setSearch(''); setFilters(prev => prev.map(f => ({ ...f, active: false }))); }}
					placeholder="Search…"
				/>
			</div>

			<div>
				<RowLabel>Bare ChipButton row (same control FilterBar uses internally)</RowLabel>
				<div className="flex items-center gap-1">
					<ChipButton active color="green" onClick={() => undefined}>Live</ChipButton>
					<ChipButton active={false} onClick={() => undefined}>Ended</ChipButton>
					<ChipButton active color="blue" onClick={() => undefined} shape="square">Wide</ChipButton>
				</div>
			</div>

			<div>
				<RowLabel>BulkActionsToolbar (Button size=&quot;sm&quot;, 14px icon)</RowLabel>
				<BulkActionsToolbar selectedCount={3} onClearSelection={() => undefined} />
			</div>

			<div>
				<RowLabel>Pagination (Button size=&quot;sm&quot;, 14px icon)</RowLabel>
				<Pagination page={page} onPageChange={setPage} total={100} size={10} onSizeChange={() => undefined} />
			</div>

			<div>
				<RowLabel>Tabs (owns its own geometry via size=&quot;none&quot;)</RowLabel>
				<Tabs
					value={tabsValue}
					onChange={setTabsValue}
					tabs={[
						{ key: 'overview', label: 'Overview', children: <p className="text-sm text-content">Overview content.</p> },
						{ key: 'activity', label: 'Activity', children: <p className="text-sm text-content">Activity content.</p> },
					]}
				/>
			</div>

			<div>
				<RowLabel>PageTabs (owns its own geometry via size=&quot;none&quot;)</RowLabel>
				<PageTabs
					activeTab={pageTabsValue}
					onChange={setPageTabsValue}
					tabs={[
						{ id: 'overview', label: 'Overview', children: <p className="text-sm text-content">Overview content.</p> },
						{ id: 'activity', label: 'Activity', children: <p className="text-sm text-content">Activity content.</p> },
					]}
				/>
			</div>
		</div>
	);
}

const meta: Meta = {
	title: 'Examples/ToolbarConsistency',
	parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj = {
	render: () => <ToolbarConsistencyPage />,
};
