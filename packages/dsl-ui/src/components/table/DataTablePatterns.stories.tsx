import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '../controls/_Button.js';
import { Drawer } from '../overlay/Drawer.js';
import { BulkActionsToolbar } from './BulkActionsToolbar.js';
import { Pagination } from './Pagination.js';
import { SearchBar } from './SearchBar.js';
import { SortableColumn } from './SortableColumn.js';

// ---------------------------------------------------------------------------
// Shared sample data
// ---------------------------------------------------------------------------

type Employee = {
	id: string;
	name: string;
	department: string;
	role: string;
	salary: number;
	startDate: string;
	email: string;
};

const EMPLOYEES: Employee[] = [
	{ id: '1', name: 'Alice Martin',   department: 'Engineering',  role: 'Senior Engineer',   salary: 95000, startDate: '2021-03-15', email: 'alice@example.com' },
	{ id: '2', name: 'Bob Smith',      department: 'Design',        role: 'UX Designer',       salary: 82000, startDate: '2020-07-01', email: 'bob@example.com' },
	{ id: '3', name: 'Carol Jones',    department: 'Engineering',  role: 'Staff Engineer',    salary: 110000, startDate: '2019-11-20', email: 'carol@example.com' },
	{ id: '4', name: 'David Kim',      department: 'Product',      role: 'Product Manager',   salary: 105000, startDate: '2022-01-10', email: 'david@example.com' },
	{ id: '5', name: 'Eva Rossi',      department: 'Design',        role: 'Visual Designer',   salary: 78000, startDate: '2023-05-03', email: 'eva@example.com' },
	{ id: '6', name: 'Frank Dupont',   department: 'Engineering',  role: 'Junior Engineer',   salary: 65000, startDate: '2024-02-14', email: 'frank@example.com' },
	{ id: '7', name: 'Grace Chen',     department: 'Product',      role: 'Associate PM',      salary: 88000, startDate: '2021-09-01', email: 'grace@example.com' },
	{ id: '8', name: 'Henry Müller',   department: 'Engineering',  role: 'Senior Engineer',   salary: 98000, startDate: '2020-04-19', email: 'henry@example.com' },
];

// ---------------------------------------------------------------------------
// Storybook meta — no single component to anchor on, use a placeholder
// ---------------------------------------------------------------------------

const meta: Meta = {
	title: 'Table/DataTable Patterns',
	parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

// ---------------------------------------------------------------------------
// Story 1: WithSorting
// ---------------------------------------------------------------------------

type SortDir = 'asc' | 'desc';
type SortState = { key: string; dir: SortDir } | null;

function sortEmployees(data: Employee[], sort: SortState): Employee[] {
	if (!sort) return data;
	const { key, dir } = sort;
	return [...data].sort((a, b) => {
		const av = a[key as keyof Employee];
		const bv = b[key as keyof Employee];
		if (typeof av === 'number' && typeof bv === 'number') {
			return dir === 'asc' ? av - bv : bv - av;
		}
		const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
		return dir === 'asc' ? cmp : -cmp;
	});
}

function cycleSort(current: SortState, key: string): SortState {
	if (!current || current.key !== key) return { key, dir: 'asc' };
	if (current.dir === 'asc') return { key, dir: 'desc' };
	// third click clears sort for this column
	return null;
}

export const WithSorting: Story = {
	name: 'WithSorting',
	render: () => {
		const [sort, setSort] = useState<SortState>(null);
		const rows = sortEmployees(EMPLOYEES, sort);

		function handleSort(key: string) {
			setSort(prev => cycleSort(prev, key));
		}

		return (
			<div className="space-y-3">
				<h2 className="text-base font-semibold text-content">Sortable Columns</h2>
				<p className="text-sm text-muted">Click a column header to sort. Click again to reverse. Third click clears sort.</p>
				<div className="overflow-x-auto rounded border border-border bg-surface">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border text-left text-xs text-muted">
								<SortableColumn label="Name"       sortKey="name"       currentSort={sort} onSort={handleSort} />
								<SortableColumn label="Department" sortKey="department" currentSort={sort} onSort={handleSort} />
								<SortableColumn label="Role"       sortKey="role"       currentSort={sort} onSort={handleSort} />
								<SortableColumn label="Salary"     sortKey="salary"     currentSort={sort} onSort={handleSort} />
								<SortableColumn label="Start Date" sortKey="startDate"  currentSort={sort} onSort={handleSort} />
							</tr>
						</thead>
						<tbody>
							{rows.map(emp => (
								<tr key={emp.id} className="border-b border-border hover:bg-bg-secondary">
									<td className="px-3 py-2 text-content">{emp.name}</td>
									<td className="px-3 py-2 text-muted">{emp.department}</td>
									<td className="px-3 py-2 text-content">{emp.role}</td>
									<td className="px-3 py-2 text-content">${emp.salary.toLocaleString()}</td>
									<td className="px-3 py-2 text-muted">{emp.startDate}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{sort && (
					<p className="text-xs text-muted">
						Sorted by <strong>{sort.key}</strong> ({sort.dir})
					</p>
				)}
			</div>
		);
	},
};

// ---------------------------------------------------------------------------
// Story 2: WithBulkActions
// ---------------------------------------------------------------------------

export const WithBulkActions: Story = {
	name: 'WithBulkActions',
	render: () => {
		const [selected, setSelected] = useState<Set<string>>(new Set());
		const [rows, setRows] = useState<Employee[]>(EMPLOYEES);

		function toggleRow(id: string) {
			setSelected(prev => {
				const next = new Set(prev);
				if (next.has(id)) {
					next.delete(id);
				} else {
					next.add(id);
				}
				return next;
			});
		}

		function toggleAll() {
			if (selected.size === rows.length) {
				setSelected(new Set());
			} else {
				setSelected(new Set(rows.map(r => r.id)));
			}
		}

		function clearSelection() {
			setSelected(new Set());
		}

		function deleteSelected() {
			setRows(prev => prev.filter(r => !selected.has(r.id)));
			clearSelection();
		}

		const allSelected = rows.length > 0 && selected.size === rows.length;
		const someSelected = selected.size > 0 && !allSelected;

		return (
			<div className="space-y-3">
				<h2 className="text-base font-semibold text-content">Bulk Actions</h2>
				<p className="text-sm text-muted">Select rows using checkboxes. The toolbar appears at the top when rows are selected.</p>
				<div className="overflow-x-auto rounded border border-border bg-surface">
					<BulkActionsToolbar selectedCount={selected.size} onClearSelection={clearSelection}>
						<Button
							type="button"
							variant="danger"
							size="sm"
							onClick={deleteSelected}
						>
							Delete selected
						</Button>
					</BulkActionsToolbar>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border text-left text-xs text-muted">
								<th className="w-8 px-3 py-2">
									<input
										type="checkbox"
										checked={allSelected}
										ref={el => { if (el) el.indeterminate = someSelected; }}
										onChange={toggleAll}
										aria-label="Select all rows"
										className="cursor-pointer"
									/>
								</th>
								<th className="px-3 py-2 font-normal">Name</th>
								<th className="px-3 py-2 font-normal">Department</th>
								<th className="px-3 py-2 font-normal">Role</th>
							</tr>
						</thead>
						<tbody>
							{rows.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-3 py-8 text-center text-muted">All rows deleted</td>
								</tr>
							) : (
								rows.map(emp => (
									<tr key={emp.id} className="border-b border-border hover:bg-bg-secondary">
										<td className="w-8 px-3 py-2 text-center">
											<input
												type="checkbox"
												checked={selected.has(emp.id)}
												onChange={() => toggleRow(emp.id)}
												aria-label={`Select ${emp.name}`}
												className="cursor-pointer"
											/>
										</td>
										<td className="px-3 py-2 text-content">{emp.name}</td>
										<td className="px-3 py-2 text-muted">{emp.department}</td>
										<td className="px-3 py-2 text-content">{emp.role}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		);
	},
};

// ---------------------------------------------------------------------------
// Story 3: WithDrawerDetail
// ---------------------------------------------------------------------------

export const WithDrawerDetail: Story = {
	name: 'WithDrawerDetail',
	render: () => {
		const [drawerOpen, setDrawerOpen] = useState(false);
		const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);

		function openDetail(emp: Employee) {
			setActiveEmployee(emp);
			setDrawerOpen(true);
		}

		return (
			<div className="space-y-3">
				<h2 className="text-base font-semibold text-content">Row Detail Drawer</h2>
				<p className="text-sm text-muted">Click any row or the "View" button to open a detail drawer.</p>
				<div className="overflow-x-auto rounded border border-border bg-surface">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border text-left text-xs text-muted">
								<th className="px-3 py-2 font-normal">Name</th>
								<th className="px-3 py-2 font-normal">Department</th>
								<th className="px-3 py-2 font-normal">Role</th>
								<th className="px-3 py-2 font-normal">Actions</th>
							</tr>
						</thead>
						<tbody>
							{EMPLOYEES.map(emp => (
								<tr
									key={emp.id}
									className="border-b border-border hover:bg-bg-secondary cursor-pointer"
									onClick={() => openDetail(emp)}
								>
									<td className="px-3 py-2 text-content">{emp.name}</td>
									<td className="px-3 py-2 text-muted">{emp.department}</td>
									<td className="px-3 py-2 text-content">{emp.role}</td>
									<td className="px-3 py-2">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={e => { e.stopPropagation(); openDetail(emp); }}
										>
											View
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<Drawer
					open={drawerOpen}
					onClose={() => setDrawerOpen(false)}
					title={activeEmployee ? activeEmployee.name : 'Employee Detail'}
					size="md"
					footer={
						<Button variant="ghost" onClick={() => setDrawerOpen(false)}>Close</Button>
					}
				>
					{activeEmployee && (
						<dl className="space-y-4">
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Name</dt>
								<dd className="mt-1 text-sm text-content">{activeEmployee.name}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Email</dt>
								<dd className="mt-1 text-sm text-content">{activeEmployee.email}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Department</dt>
								<dd className="mt-1 text-sm text-content">{activeEmployee.department}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Role</dt>
								<dd className="mt-1 text-sm text-content">{activeEmployee.role}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Salary</dt>
								<dd className="mt-1 text-sm text-content">${activeEmployee.salary.toLocaleString()}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Start Date</dt>
								<dd className="mt-1 text-sm text-content">{activeEmployee.startDate}</dd>
							</div>
						</dl>
					)}
				</Drawer>
			</div>
		);
	},
};

// ---------------------------------------------------------------------------
// Story 4: FullAdminTable — sorting + bulk actions + drawer detail + SearchBar + Pagination
// ---------------------------------------------------------------------------

const PAGE_SIZE = 4;

export const FullAdminTable: Story = {
	name: 'FullAdminTable',
	render: () => {
		const [search, setSearch] = useState('');
		const [sort, setSort] = useState<SortState>(null);
		const [page, setPage] = useState(0);
		const [selected, setSelected] = useState<Set<string>>(new Set());
		const [rows, setRows] = useState<Employee[]>(EMPLOYEES);
		const [drawerOpen, setDrawerOpen] = useState(false);
		const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);

		// Filter
		const filtered = rows.filter(emp =>
			[emp.name, emp.department, emp.role].some(v =>
				v.toLowerCase().includes(search.toLowerCase())
			)
		);

		// Sort
		const sorted = sortEmployees(filtered, sort);

		// Paginate
		const total = sorted.length;
		const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

		function handleSort(key: string) {
			setSort(prev => cycleSort(prev, key));
			setPage(0);
		}

		function handleSearch(value: string) {
			setSearch(value);
			setPage(0);
		}

		function toggleRow(id: string) {
			setSelected(prev => {
				const next = new Set(prev);
				if (next.has(id)) { next.delete(id); } else { next.add(id); }
				return next;
			});
		}

		function toggleAll() {
			const pageIds = pageRows.map(r => r.id);
			const allPageSelected = pageIds.every(id => selected.has(id));
			setSelected(prev => {
				const next = new Set(prev);
				if (allPageSelected) {
					pageIds.forEach(id => next.delete(id));
				} else {
					pageIds.forEach(id => next.add(id));
				}
				return next;
			});
		}

		function clearSelection() {
			setSelected(new Set());
		}

		function deleteSelected() {
			setRows(prev => prev.filter(r => !selected.has(r.id)));
			clearSelection();
		}

		function openDetail(emp: Employee) {
			setActiveEmployee(emp);
			setDrawerOpen(true);
		}

		const pageIds = pageRows.map(r => r.id);
		const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
		const somePageSelected = pageIds.some(id => selected.has(id)) && !allPageSelected;

		return (
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-base font-semibold text-content">Employee Directory</h2>
					<SearchBar value={search} onChange={handleSearch} placeholder="Search employees…" debounceMs={0} />
				</div>

				<div className="overflow-x-auto rounded border border-border bg-surface">
					<BulkActionsToolbar selectedCount={selected.size} onClearSelection={clearSelection}>
						<Button type="button" variant="danger" size="sm" onClick={deleteSelected}>
							Delete selected
						</Button>
					</BulkActionsToolbar>

					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border text-left text-xs text-muted">
								<th className="w-8 px-3 py-2">
									<input
										type="checkbox"
										checked={allPageSelected}
										ref={el => { if (el) el.indeterminate = somePageSelected; }}
										onChange={toggleAll}
										aria-label="Select all rows on this page"
										className="cursor-pointer"
									/>
								</th>
								<SortableColumn label="Name"       sortKey="name"       currentSort={sort} onSort={handleSort} />
								<SortableColumn label="Department" sortKey="department" currentSort={sort} onSort={handleSort} />
								<SortableColumn label="Role"       sortKey="role"       currentSort={sort} onSort={handleSort} />
								<SortableColumn label="Salary"     sortKey="salary"     currentSort={sort} onSort={handleSort} />
								<th className="px-3 py-2 font-normal whitespace-nowrap">Actions</th>
							</tr>
						</thead>
						<tbody>
							{pageRows.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-3 py-8 text-center text-muted">
										{search ? `No results for "${search}"` : 'No employees'}
									</td>
								</tr>
							) : (
								pageRows.map(emp => (
									<tr
										key={emp.id}
										className="border-b border-border hover:bg-bg-secondary cursor-pointer"
										onClick={() => openDetail(emp)}
									>
										<td className="w-8 px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
											<input
												type="checkbox"
												checked={selected.has(emp.id)}
												onChange={() => toggleRow(emp.id)}
												aria-label={`Select ${emp.name}`}
												className="cursor-pointer"
											/>
										</td>
										<td className="px-3 py-2 text-content font-medium">{emp.name}</td>
										<td className="px-3 py-2 text-muted">{emp.department}</td>
										<td className="px-3 py-2 text-content">{emp.role}</td>
										<td className="px-3 py-2 text-content">${emp.salary.toLocaleString()}</td>
										<td className="px-3 py-2" onClick={e => e.stopPropagation()}>
											<Button type="button" variant="ghost" size="sm" onClick={() => openDetail(emp)}>
												View
											</Button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				<Pagination
					page={page}
					onPageChange={setPage}
					total={total}
					size={PAGE_SIZE}
					onSizeChange={() => {}}
				/>

				<Drawer
					open={drawerOpen}
					onClose={() => setDrawerOpen(false)}
					title={activeEmployee ? activeEmployee.name : 'Employee Detail'}
					size="md"
					footer={<Button variant="ghost" onClick={() => setDrawerOpen(false)}>Close</Button>}
				>
					{activeEmployee && (
						<dl className="space-y-4">
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Email</dt>
								<dd className="mt-1 text-sm text-content">{activeEmployee.email}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Department</dt>
								<dd className="mt-1 text-sm text-content">{activeEmployee.department}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Role</dt>
								<dd className="mt-1 text-sm text-content">{activeEmployee.role}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Salary</dt>
								<dd className="mt-1 text-sm text-content">${activeEmployee.salary.toLocaleString()}</dd>
							</div>
							<div>
								<dt className="text-xs font-medium text-muted uppercase tracking-wide">Start Date</dt>
								<dd className="mt-1 text-sm text-content">{activeEmployee.startDate}</dd>
							</div>
						</dl>
					)}
				</Drawer>
			</div>
		);
	},
};
