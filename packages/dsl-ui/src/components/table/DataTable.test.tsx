import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ColumnHelpers, DataTable, useDataTableFilter } from './DataTable.js';
import { FilterChips } from './FilterChips.js';
import { StatusFilter } from './StatusFilter.js';

type Row = { id: string; name: string; status: number; method: string };

const rows: Row[] = [
	{ id: '1', name: 'Alice', status: 200, method: 'GET' },
	{ id: '2', name: 'Bob', status: 404, method: 'POST' },
	{ id: '3', name: 'Carol', status: 500, method: 'GET' },
];

const columns = [ColumnHelpers.text<Row>('name', 'Name'), ColumnHelpers.text<Row>('status', 'Status')];

describe('DataTable', () => {
	it('shows "Loading..." when loading=true', () => {
		render(<DataTable rows={[]} columns={columns} loading={true} />);
		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('shows emptyMessage when rows=[] and loading=false', () => {
		render(<DataTable rows={[]} columns={columns} emptyMessage="Nothing here" />);
		expect(screen.getByText('Nothing here')).toBeInTheDocument();
	});

	it('renders column headers', () => {
		render(<DataTable rows={[]} columns={columns} />);
		expect(screen.getByText('Name')).toBeInTheDocument();
		expect(screen.getByText('Status')).toBeInTheDocument();
	});

	it('renders row data via column render functions', () => {
		render(<DataTable rows={rows} columns={columns} />);
		expect(screen.getByText('Alice')).toBeInTheDocument();
		expect(screen.getByText('Bob')).toBeInTheDocument();
	});

	it('calls onAction(actionName, row) when action button clicked', () => {
		const onAction = vi.fn();
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Edit', action: 'edit' }]),
		];
		render(<DataTable rows={rows} columns={cols} onAction={onAction} />);
		fireEvent.click(screen.getAllByText('Edit')[0]!);
		expect(onAction).toHaveBeenCalledWith('edit', rows[0]);
	});

	it('filters rows by status family (4xx) via DataTableFilterCtx', () => {
		const cols = [ColumnHelpers.text<Row>('name', 'Name'), ColumnHelpers.text<Row>('status', 'Status')];
		function StatusFilterConnected() {
			const ctx = useDataTableFilter()!;
			const value = (ctx.filters['status'] as string) ?? 'all';
			return <StatusFilter value={value} onChange={v => ctx.setFilter('status', v)} />;
		}
		render(<DataTable rows={rows} columns={cols} filters={<StatusFilterConnected />} />);
		expect(screen.getByText('Alice')).toBeInTheDocument();
		expect(screen.getByText('Bob')).toBeInTheDocument();
		expect(screen.getByText('Carol')).toBeInTheDocument();
		fireEvent.click(screen.getByText('4xx'));
		expect(screen.queryByText('Alice')).not.toBeInTheDocument();
		expect(screen.getByText('Bob')).toBeInTheDocument();
		expect(screen.queryByText('Carol')).not.toBeInTheDocument();
	});

	it('ColumnHelpers.bytes formats bytes correctly', () => {
		type ByteRow = { size: number };
		const cols = [ColumnHelpers.bytes<ByteRow>('size', 'Size')];
		render(<DataTable rows={[{ size: 1500 }]} columns={cols} />);
		expect(screen.getByText('1.5 KB')).toBeInTheDocument();
	});

	it('ColumnHelpers.bytes formats MB correctly', () => {
		type ByteRow = { size: number };
		const cols = [ColumnHelpers.bytes<ByteRow>('size', 'Size')];
		render(<DataTable rows={[{ size: 2 * 1024 * 1024 }]} columns={cols} />);
		expect(screen.getByText('2.0 MB')).toBeInTheDocument();
	});

	it('ColumnHelpers.number with ms format appends ms suffix', () => {
		type MsRow = { duration: number };
		const cols = [ColumnHelpers.number<MsRow>('duration', 'Duration', { format: 'ms' })];
		render(<DataTable rows={[{ duration: 42 }]} columns={cols} />);
		expect(screen.getByText('42ms')).toBeInTheDocument();
	});

	it('filters rows by array value via DataTableFilterCtx', () => {
		function FilterChipsConnected() {
			const ctx = useDataTableFilter()!;
			const value = (ctx.filters['method'] as string[]) ?? [];
			const options = [
				{ value: 'GET', label: 'GET' },
				{ value: 'POST', label: 'POST' },
			];
			return (
				<FilterChips bind="method" options={options} value={value} onChange={v => ctx.setFilter('method', v)} />
			);
		}
		render(<DataTable rows={rows} columns={columns} filters={<FilterChipsConnected />} />);
		// Initially all rows visible
		expect(screen.getByText('Alice')).toBeInTheDocument();
		expect(screen.getByText('Bob')).toBeInTheDocument();
		// Click POST to deselect GET (only POST active)
		fireEvent.click(screen.getByText('GET'));
		expect(screen.queryByText('Alice')).not.toBeInTheDocument();
		expect(screen.getByText('Bob')).toBeInTheDocument();
	});

	it('renders filter chips above table when filters prop provided', () => {
		const options = [
			{ value: 'GET', label: 'GET' },
			{ value: 'POST', label: 'POST' },
		];
		render(
			<DataTable
				rows={rows}
				columns={columns}
				filters={<FilterChips bind="method" options={options} value={[]} onChange={vi.fn()} />}
			/>
		);
		expect(screen.getByText('GET')).toBeInTheDocument();
		expect(screen.getByText('POST')).toBeInTheDocument();
	});

	it('renders filtersTop above filters when both provided', () => {
		render(
			<DataTable
				rows={rows}
				columns={columns}
				filtersTop={<span>top-filter</span>}
				filters={<span>bottom-filter</span>}
			/>
		);
		const topFilter = screen.getByText('top-filter');
		const bottomFilter = screen.getByText('bottom-filter');
		expect(topFilter).toBeInTheDocument();
		expect(bottomFilter).toBeInTheDocument();
		// filtersTop must appear before filters in DOM order
		expect(topFilter.compareDocumentPosition(bottomFilter)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	it('registerFilterPredicate applies a custom row-shape predicate before the generic branches', () => {
		// Generic infra test replacing the old hardcoded hide_meta branch (removed from
		// applyFilters()) - the real hide_meta behavior is now an integration test in
		// HideMetaToggle.test.tsx, which registers this exact predicate itself.
		type LogRow = { id: string; path: string };
		const logRows: LogRow[] = [
			{ id: '1', path: '/api/files' },
			{ id: '2', path: '/admin/logs' },
			{ id: '3', path: '/admin/logs/2026-06-26' },
			{ id: '4', path: '/sync/status' },
		];
		const logCols = [ColumnHelpers.text<LogRow>('path', 'Path')];
		function CustomPredicateConnected() {
			const ctx = useDataTableFilter()!;
			return (
				<button
					onClick={() => {
						ctx.registerFilterPredicate?.(
							'hide_meta',
							(row, value) => !(value === true && typeof row['path'] === 'string' && row['path'].startsWith('/admin/logs'))
						);
						ctx.setFilter('hide_meta', true);
					}}
				>
					hide
				</button>
			);
		}
		render(<DataTable rows={logRows} columns={logCols} filters={<CustomPredicateConnected />} />);
		expect(screen.getByText('/api/files')).toBeInTheDocument();
		expect(screen.getByText('/admin/logs')).toBeInTheDocument();
		fireEvent.click(screen.getByText('hide'));
		expect(screen.getByText('/api/files')).toBeInTheDocument();
		expect(screen.queryByText('/admin/logs')).not.toBeInTheDocument();
		expect(screen.queryByText('/admin/logs/2026-06-26')).not.toBeInTheDocument();
		expect(screen.getByText('/sync/status')).toBeInTheDocument();
	});

	it('defaultFilters seeds initial filter state (replacing the old initialFilters prop)', () => {
		type LogRow = { id: string; path: string };
		const logRows: LogRow[] = [
			{ id: '1', path: '/api/files' },
			{ id: '2', path: '/admin/logs' },
		];
		const logCols = [ColumnHelpers.text<LogRow>('path', 'Path')];
		render(<DataTable rows={logRows} columns={logCols} defaultFilters={{ hide_meta: false }} />);
		expect(screen.getByText('/api/files')).toBeInTheDocument();
		expect(screen.getByText('/admin/logs')).toBeInTheDocument();
	});

	it('fontMono=true applies font-mono class to the table wrapper', () => {
		const { container } = render(<DataTable rows={[]} columns={columns} fontMono={true} />);
		expect(container.firstChild).toHaveClass('font-mono');
	});

	it('success variant renders action button with bg-success class when actionsVisible=true', () => {
		const onAction = vi.fn();
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Restore', action: 'restore', variant: 'success' }]),
		];
		render(<DataTable rows={rows} columns={cols} onAction={onAction} actionsVisible={true} />);
		const btn = screen.getAllByText('Restore')[0]!;
		expect(btn).toHaveClass('bg-success');
	});

	it('actionsVisible=true renders action buttons without opacity-0 class', () => {
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Delete', action: 'delete', variant: 'danger' }]),
		];
		const { container } = render(<DataTable rows={rows} columns={cols} actionsVisible={true} />);
		// Should not have opacity-0 on the actions container
		const actionDivs = container.querySelectorAll('.flex.items-center.gap-1');
		expect(actionDivs.length).toBeGreaterThan(0);
		actionDivs.forEach(div => {
			expect(div).not.toHaveClass('opacity-0');
		});
	});

	it('action button hidden when condition field is truthy and condition starts with !', () => {
		// condition: "!revoked" → hide button when row.revoked === true
		type TokenRow = { id: string; label: string; revoked: boolean };
		const tokenRows: TokenRow[] = [
			{ id: '1', label: 'Active token', revoked: false },
			{ id: '2', label: 'Revoked token', revoked: true },
		];
		const cols = [
			ColumnHelpers.text<TokenRow>('label', 'Label'),
			ColumnHelpers.actions<TokenRow>([{ label: 'Revoke', action: 'revoke', condition: '!revoked' }]),
		];
		render(<DataTable rows={tokenRows} columns={cols} onAction={vi.fn()} />);
		const revokeButtons = screen.getAllByText('Revoke');
		expect(revokeButtons).toHaveLength(1); // only visible on non-revoked row
	});

	it('action button hidden when condition field is falsy', () => {
		// condition: "active" → show button only when row.active === true
		type Row = { id: string; name: string; active: boolean };
		const rows: Row[] = [
			{ id: '1', name: 'Active', active: true },
			{ id: '2', name: 'Inactive', active: false },
		];
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Deactivate', action: 'deactivate', condition: 'active' }]),
		];
		render(<DataTable rows={rows} columns={cols} onAction={vi.fn()} />);
		const buttons = screen.getAllByText('Deactivate');
		expect(buttons).toHaveLength(1); // only visible on active row
	});

	it('muted:true column renders in muted text class', () => {
		type Row = { id: string; ts: string };
		const rows: Row[] = [{ id: '1', ts: '2026-06-26T10:00:00Z' }];
		const col = ColumnHelpers.text<Row>('ts', 'Time', { muted: true });
		const { container } = render(<DataTable rows={rows} columns={[col]} />);
		const cell = container.querySelector('td');
		expect(cell?.className).toMatch(/text-muted/);
	});
});
