import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { DateRangePicker, type DateRange } from '../components/form/DateRangePicker.js';
import { Drawer } from '../components/overlay/Drawer.js';
import { DataTable, ColumnHelpers, type TableColumn } from '../components/table/DataTable.js';
import { Pagination } from '../components/table/Pagination.js';
import { SearchBar } from '../components/table/SearchBar.js';
import { Badge } from '../components/display/Badge.js';
import { PageHeader } from '../components/display/PageHeader.js';
import { PageContent } from '../components/layout/PageContent.js';
import { Section } from '../components/layout/Section.js';
import { Button } from '../components/controls/_Button.js';

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

type UserStatus = 'active' | 'inactive' | 'pending';

interface User extends Record<string, unknown> {
	id: string;
	name: string;
	email: string;
	role: string;
	status: UserStatus;
	joinedDate: string;
}

// ---------------------------------------------------------------------------
// Fake data (hardcoded -- no API calls)
// ---------------------------------------------------------------------------

const ALL_USERS: User[] = [
	{ id: '1', name: 'Alice Martin',   email: 'alice@example.com',   role: 'Admin',   status: 'active',   joinedDate: '2023-01-15' },
	{ id: '2', name: 'Bob Chen',       email: 'bob@example.com',     role: 'Editor',  status: 'active',   joinedDate: '2023-04-02' },
	{ id: '3', name: 'Carol Singh',    email: 'carol@example.com',   role: 'Viewer',  status: 'inactive', joinedDate: '2022-11-20' },
	{ id: '4', name: 'David López',    email: 'david@example.com',   role: 'Editor',  status: 'pending',  joinedDate: '2024-02-08' },
	{ id: '5', name: 'Eva Müller',     email: 'eva@example.com',     role: 'Admin',   status: 'active',   joinedDate: '2022-07-30' },
	{ id: '6', name: 'Frank Okafor',   email: 'frank@example.com',   role: 'Viewer',  status: 'pending',  joinedDate: '2024-05-14' },
	{ id: '7', name: 'Grace Tanaka',   email: 'grace@example.com',   role: 'Editor',  status: 'inactive', joinedDate: '2023-09-01' },
	{ id: '8', name: 'Hiro Yamamoto',  email: 'hiro@example.com',    role: 'Viewer',  status: 'active',   joinedDate: '2024-01-22' },
	{ id: '9', name: 'Isabel Ferreira',email: 'isabel@example.com',  role: 'Editor',  status: 'active',   joinedDate: '2023-06-10' },
	{ id: '10', name: 'Jack Nguyen',   email: 'jack@example.com',    role: 'Admin',   status: 'inactive', joinedDate: '2022-03-17' },
];

// ---------------------------------------------------------------------------
// Status badge variant mapping
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<UserStatus, 'success' | 'danger' | 'warning'> = {
	active:   'success',
	inactive: 'danger',
	pending:  'warning',
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const USER_COLUMNS: TableColumn<User>[] = [
	{
		key: 'name',
		label: 'Name',
		sortable: true,
		render: (row) => row.name,
	},
	{
		key: 'email',
		label: 'Email',
		render: (row) => row.email,
	},
	{
		key: 'role',
		label: 'Role',
		render: (row) => row.role,
	},
	{
		key: 'status',
		label: 'Status',
		render: (row) => (
			<Badge label={row.status} variant={STATUS_VARIANT[row.status]} />
		),
	},
	{
		key: 'joinedDate',
		label: 'Joined Date',
		sortable: true,
		render: (row) =>
			new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
				new Date(row.joinedDate),
			),
	},
	ColumnHelpers.actions<User>([
		{ label: 'View details', action: 'view', variant: 'ghost' },
	]),
];

// ---------------------------------------------------------------------------
// Page size constant
// ---------------------------------------------------------------------------

const PAGE_SIZE = 5;

// ---------------------------------------------------------------------------
// AdminDashboard component (rendered inside the story)
// ---------------------------------------------------------------------------

function AdminDashboardPage() {
	const [searchTerm, setSearchTerm]       = useState('');
	const [dateRange, setDateRange]         = useState<DateRange>({ from: null, to: null });
	const [page, setPage]                   = useState(0);
	const [drawerOpen, setDrawerOpen]       = useState(false);
	const [activeUser, setActiveUser]       = useState<User | null>(null);

	// Filtering by search term and joined date range
	const filteredUsers = ALL_USERS.filter((u) => {
		if (searchTerm) {
			const q = searchTerm.toLowerCase();
			if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
				return false;
			}
		}
		if (dateRange.from !== null || dateRange.to !== null) {
			const joined = new Date(u.joinedDate);
			if (dateRange.from !== null && joined < dateRange.from) return false;
			if (dateRange.to !== null && joined > dateRange.to) return false;
		}
		return true;
	});

	// Paginate after filtering
	const pageRows = filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

	function handleSearchChange(value: string) {
		setSearchTerm(value);
		setPage(0);
	}

	function handleDateRangeChange(range: DateRange) {
		setDateRange(range);
		setPage(0);
	}

	function handleAction(action: string, row: User) {
		if (action === 'view') {
			setActiveUser(row);
			setDrawerOpen(true);
		}
	}

	function handleBatchAction(actionName: string, rows: User[]) {
		// Demo only -- log to console, no real effect
		// eslint-disable-next-line no-console
		console.info(`Batch action "${actionName}" on ${rows.length} user(s):`, rows.map((r) => r.name));
	}

	const drawerFooter = (
		<>
			<Button type="button" variant="secondary" onClick={() => setDrawerOpen(false)}>
				Close
			</Button>
			<Button type="button" variant="primary">
				Edit
			</Button>
		</>
	);

	return (
		<>
		{/* User detail Drawer -- portal to document.body */}
		<Drawer
			open={drawerOpen}
			onClose={() => setDrawerOpen(false)}
			title={activeUser ? `User: ${activeUser.name}` : 'User details'}
			footer={drawerFooter}
			side="right"
			size="md"
		>
			{activeUser && (
				<div className="space-y-4 text-sm">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Name</p>
						<p className="text-content">{activeUser.name}</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Email</p>
						<p className="text-content">{activeUser.email}</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Role</p>
						<p className="text-content">{activeUser.role}</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Status</p>
						<Badge label={activeUser.status} variant={STATUS_VARIANT[activeUser.status]} />
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Joined Date</p>
						<p className="text-content">
							{new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
								new Date(activeUser.joinedDate),
							)}
						</p>
					</div>
				</div>
			)}
		</Drawer>

		<PageContent
			maxWidth="2xl"
			sections={
				<>
					{/* Page header */}
					<PageHeader
						title="Users"
						subtitle="Manage user accounts and permissions"
					/>

					{/* Filters row */}
					<Section>
						<div className="flex flex-wrap items-center gap-3">
							<div className="w-72">
								<DateRangePicker
									value={dateRange}
									onChange={handleDateRangeChange}
									placeholder="Filter by joined date..."
								/>
							</div>
							<SearchBar
								value={searchTerm}
								onChange={handleSearchChange}
								placeholder="Search by name or email..."
							/>
						</div>
					</Section>

					{/* Table */}
					<Section>
						<DataTable<User>
							rows={pageRows}
							columns={USER_COLUMNS}
							selectable
							batchActions={[
								{ label: 'Delete selected', action: 'delete', variant: 'danger' },
								{ label: 'Export',          action: 'export', variant: 'ghost'  },
							]}
							onBatchAction={handleBatchAction}
							onAction={handleAction}
							emptyMessage="No users match your filters."
						/>

						{/* Pagination */}
						<Pagination
							page={page}
							onPageChange={setPage}
							total={filteredUsers.length}
							size={PAGE_SIZE}
							onSizeChange={() => undefined}
						/>
					</Section>
				</>
			}
		/>
		</>
	);
}

// ---------------------------------------------------------------------------
// Storybook meta + story export
// ---------------------------------------------------------------------------

const meta: Meta = {
	title: 'Examples/AdminDashboard',
	parameters: { layout: 'fullscreen' },
};
export default meta;

export const AdminDashboard: StoryObj = {
	render: () => <AdminDashboardPage />,
};

// ---------------------------------------------------------------------------
// Drawer -- rendered at document root level (outside PageContent)
// ---------------------------------------------------------------------------
// The Drawer uses a portal so it must live in the React tree even though it
// renders outside the PageContent container.  We wire it here by lifting the
// open/activeUser state up to AdminDashboardPage above.
//
// Phase 1 components used in this story:
//   display:   Badge, PageHeader
//   form:      DateRangePicker
//   layout:    PageContent, Section
//   overlay:   Drawer
//   table:     DataTable (sortable columns, selectable + BulkActionsToolbar, ColumnHelpers.actions)
//              Pagination, SearchBar
//   controls:  Button (inside Drawer footer + DataTable internals)
