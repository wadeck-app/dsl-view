import React, { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { FilterBar } from './FilterBar.js';
import type { FilterBarFilter } from './FilterBar.js';

const meta: Meta<typeof FilterBar> = {
	title: 'Table/FilterBar',
	component: FilterBar,
	parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof FilterBar>;

const statusFilters: FilterBarFilter[] = [
	{ key: 'active', label: 'Active', value: 'active', active: false, color: 'green' },
	{ key: 'pending', label: 'Pending', value: 'pending', active: false, color: 'yellow' },
	{ key: 'archived', label: 'Archived', value: 'archived', active: false, color: 'gray' },
];

export const Default: Story = {
	render: () => {
		const [search, setSearch] = useState('');
		const [filters, setFilters] = useState(statusFilters);

		function handleFilterChange(key: string, _value: string, active: boolean) {
			setFilters(prev => prev.map(f => f.key === key ? { ...f, active } : f));
		}

		function handleClearAll() {
			setSearch('');
			setFilters(prev => prev.map(f => ({ ...f, active: false })));
		}

		return (
			<FilterBar
				search={search}
				onSearchChange={setSearch}
				filters={filters}
				onFilterChange={handleFilterChange}
				onClearAll={handleClearAll}
				placeholder="Search…"
			/>
		);
	},
};

const activeFilters: FilterBarFilter[] = [
	{ key: 'active', label: 'Active', value: 'active', active: true, color: 'green' },
	{ key: 'pending', label: 'Pending', value: 'pending', active: false, color: 'yellow' },
	{ key: 'admin', label: 'Admin', value: 'admin', active: true, color: 'blue' },
];

export const WithActiveFilters: Story = {
	render: () => {
		const [search, setSearch] = useState('john');
		const [filters, setFilters] = useState(activeFilters);

		function handleFilterChange(key: string, _value: string, active: boolean) {
			setFilters(prev => prev.map(f => f.key === key ? { ...f, active } : f));
		}

		function handleClearAll() {
			setSearch('');
			setFilters(prev => prev.map(f => ({ ...f, active: false })));
		}

		return (
			<FilterBar
				search={search}
				onSearchChange={setSearch}
				filters={filters}
				onFilterChange={handleFilterChange}
				onClearAll={handleClearAll}
				placeholder="Search…"
			/>
		);
	},
};

export const SearchOnly: Story = {
	render: () => {
		const [search, setSearch] = useState('');
		return (
			<FilterBar
				search={search}
				onSearchChange={setSearch}
				placeholder="Search users…"
			/>
		);
	},
};

const adminFilters: FilterBarFilter[] = [
	{ key: 'role_admin', label: 'Admin', value: 'admin', active: true, color: 'blue' },
	{ key: 'role_editor', label: 'Editor', value: 'editor', active: false, color: 'purple' },
	{ key: 'role_viewer', label: 'Viewer', value: 'viewer', active: false, color: 'gray' },
	{ key: 'status_active', label: 'Active', value: 'active', active: true, color: 'green' },
	{ key: 'status_suspended', label: 'Suspended', value: 'suspended', active: false, color: 'red' },
];

export const FullAdminTable: Story = {
	render: () => {
		const [search, setSearch] = useState('');
		const [filters, setFilters] = useState(adminFilters);

		function handleFilterChange(key: string, _value: string, active: boolean) {
			setFilters(prev => prev.map(f => f.key === key ? { ...f, active } : f));
		}

		function handleClearAll() {
			setSearch('');
			setFilters(prev => prev.map(f => ({ ...f, active: false })));
		}

		return (
			<div className="w-[700px]">
				<FilterBar
					search={search}
					onSearchChange={setSearch}
					filters={filters}
					onFilterChange={handleFilterChange}
					onClearAll={handleClearAll}
					placeholder="Search users, emails…"
				/>
			</div>
		);
	},
};
