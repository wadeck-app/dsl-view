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

	// Was size="sm" + className="p-0" - both set padding on the same button.
	it('expansion toggle button has no competing padding source', () => {
		const { container } = render(
			<DataTable rows={rows} columns={columns} expansion={{}} renderNode={() => <p>details</p>} />
		);
		const toggle = container.querySelector('svg')?.closest('button');
		expect(toggle?.className).not.toMatch(/\bpx-3\b/);
		expect(toggle?.className).toMatch(/\bp-0\b/);
	});

	it('calls onAction(actionName, row) when action button clicked', () => {
		const onAction = vi.fn();
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Edit', icon: null, action: 'edit' }]),
		];
		render(<DataTable rows={rows} columns={cols} onAction={onAction} />);
		fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
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

	/*
	 * These two asked for `actionsVisible={true}`, a prop DataTable has never had -- React dropped it
	 * and both tests passed anyway. The second was worse than useless: it asserted the absence of an
	 * `opacity-0` class that DataTable does not emit anywhere, so it could not have failed. Both now
	 * state what the component actually does, which is render action buttons unconditionally.
	 */
	it('success variant renders the action button with the bg-success class', () => {
		const onAction = vi.fn();
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Restore', icon: null, action: 'restore', variant: 'success' }]),
		];
		render(<DataTable rows={rows} columns={cols} onAction={onAction} />);
		const btn = screen.getAllByRole('button', { name: 'Restore' })[0]!;
		expect(btn).toHaveClass('bg-success');
	});

	// Guards against a hover-reveal being introduced: an action a reader cannot see is an action
	// they will not find.
	it('renders one action button per row, visible without hovering', () => {
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Delete', icon: null, action: 'delete', variant: 'danger' }]),
		];
		render(<DataTable rows={rows} columns={cols} />);
		const buttons = screen.getAllByRole('button', { name: 'Delete' });
		expect(buttons).toHaveLength(rows.length);
		for (const btn of buttons) {
			expect(btn).toBeVisible();
		}
	});

	it('action button hidden when condition field is truthy and condition starts with !', () => {
		// condition: "!revoked" -> hide button when row.revoked === true
		type TokenRow = { id: string; label: string; revoked: boolean };
		const tokenRows: TokenRow[] = [
			{ id: '1', label: 'Active token', revoked: false },
			{ id: '2', label: 'Revoked token', revoked: true },
		];
		const cols = [
			ColumnHelpers.text<TokenRow>('label', 'Label'),
			ColumnHelpers.actions<TokenRow>([{ label: 'Revoke', icon: null, action: 'revoke', condition: '!revoked' }]),
		];
		render(<DataTable rows={tokenRows} columns={cols} onAction={vi.fn()} />);
		const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
		expect(revokeButtons).toHaveLength(1); // only visible on non-revoked row
	});

	it('action button hidden when condition field is falsy', () => {
		// condition: "active" -> show button only when row.active === true
		type Row = { id: string; name: string; active: boolean };
		const rows: Row[] = [
			{ id: '1', name: 'Active', active: true },
			{ id: '2', name: 'Inactive', active: false },
		];
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Deactivate', icon: null, action: 'deactivate', condition: 'active' }]),
		];
		render(<DataTable rows={rows} columns={cols} onAction={vi.fn()} />);
		const buttons = screen.getAllByRole('button', { name: 'Deactivate' });
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

	// Sorting now lives on a dedicated IconButton, not the whole label - a sortable header's
	// label text is plain text, not itself a button.
	it('sortable header: label is plain text, only the arrow is a button', () => {
		const cols = [ColumnHelpers.text<Row>('name', 'Name')];
		cols[0]!.sortable = true;
		render(<DataTable rows={rows} columns={cols} />);
		expect(screen.getByText('Name').closest('button')).toBeNull();
		expect(screen.getByRole('button', { name: 'Sort by Name' })).toBeInTheDocument();
	});

	// Layout-shift regression: the toolbar must never precede <table> in the DOM, in either
	// supported position, so selecting a row cannot move any row out from under the user's click.
	it('batch toolbar never precedes the table in the DOM', () => {
		const cols = [ColumnHelpers.text<Row>('name', 'Name')];
		const { container } = render(
			<DataTable
				rows={rows}
				columns={cols}
				selectable
				batchActions={[{ label: 'Delete', action: 'delete' }]}
			/>
		);
		fireEvent.click(screen.getAllByRole('checkbox')[1]!);
		const html = container.innerHTML;
		const toolbarIdx = html.indexOf('role="toolbar"');
		const tableIdx = html.indexOf('<table');
		expect(toolbarIdx).toBeGreaterThan(-1);
		expect(toolbarIdx).toBeGreaterThan(tableIdx);
	});

	// A batch action with no explicit variant must look like a real button, not ghost text.
	it('batch action with no variant defaults to secondary, not ghost', () => {
		const cols = [ColumnHelpers.text<Row>('name', 'Name')];
		render(
			<DataTable
				rows={rows}
				columns={cols}
				selectable
				batchActions={[{ label: 'Export', action: 'export' }]}
			/>
		);
		fireEvent.click(screen.getAllByRole('checkbox')[1]!);
		const btn = screen.getByRole('button', { name: 'Export' });
		expect(btn.className).toMatch(/\bbg-surface\b/);
	});

	// The "N selected" label was text-sm (14px) next to size="sm" buttons (12px) - same box
	// center, but different font-size threw off the optical text baseline.
	it('"N selected" label matches the batch buttons\' font-size', () => {
		const cols = [ColumnHelpers.text<Row>('name', 'Name')];
		render(
			<DataTable rows={rows} columns={cols} selectable batchActions={[{ label: 'Export', action: 'export' }]} />
		);
		fireEvent.click(screen.getAllByRole('checkbox')[1]!);
		const label = screen.getByText('1 selected');
		expect(label.className).toMatch(/\btext-xs\b/);
	});

	// Row actions render icon-only - no visible label text, just the icon + aria-label.
	it('row action renders icon-only, with no visible label text', () => {
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Edit', icon: <svg data-testid="edit-icon" />, action: 'edit' }]),
		];
		render(<DataTable rows={rows} columns={cols} />);
		const btn = screen.getAllByRole('button', { name: 'Edit' })[0]!;
		expect(btn.textContent?.trim()).toBe('');
		expect(btn.querySelector('[data-testid="edit-icon"]')).toBeInTheDocument();
	});

	// Without an icon (e.g. a YAML-authored action, which can't express a ReactNode), falling
	// back to IconButton would render an invisible icon-less button - must stay a visible text button.
	it('row action without an icon falls back to a visible text button, not an empty one', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			ColumnHelpers.actions<Row>([{ label: 'Edit', action: 'edit' }]),
		];
		render(<DataTable rows={rows} columns={cols} />);
		const btn = screen.getAllByRole('button', { name: 'Edit' })[0]!;
		expect(btn.textContent?.trim()).toBe('Edit');
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});

/*
 * Row clicks. `navigateTo` can only express a path template and needs a RouterContext, so a consumer
 * that owns its own navigation had to give up row clicks entirely -- and one that simply had not
 * mounted a provider got a click that did nothing and said nothing.
 */
describe('DataTable row clicks', () => {
	it('onRowClick receives the clicked row', () => {
		const onRowClick = vi.fn();
		render(<DataTable rows={rows} columns={columns} onRowClick={onRowClick} />);

		fireEvent.click(screen.getByText('Bob'));

		expect(onRowClick).toHaveBeenCalledTimes(1);
		expect(onRowClick).toHaveBeenCalledWith(rows[1]);
	});

	it('marks the row clickable so the affordance matches the behaviour', () => {
		const { container } = render(<DataTable rows={rows} columns={columns} onRowClick={() => {}} />);
		expect(container.querySelector('tbody tr')).toHaveClass('cursor-pointer');
	});

	it('rows are not clickable when neither onRowClick nor navigateTo is given', () => {
		const { container } = render(<DataTable rows={rows} columns={columns} />);
		expect(container.querySelector('tbody tr')).not.toHaveClass('cursor-pointer');
	});

	it('onRowClick wins over navigateTo', () => {
		const onRowClick = vi.fn();
		render(<DataTable rows={rows} columns={columns} onRowClick={onRowClick} navigateTo="/x/{id}" />);

		fireEvent.click(screen.getByText('Alice'));

		expect(onRowClick).toHaveBeenCalledWith(rows[0]);
	});

	// A dead click that explains itself beats one that does not. Without a RouterContext there is
	// nothing to navigate with, and this used to be `router?.navigate` -- silently nothing.
	it('navigateTo without a RouterContext says so instead of doing nothing quietly', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		render(<DataTable rows={rows} columns={columns} navigateTo="/x/{id}" />);

		fireEvent.click(screen.getByText('Alice'));

		expect(error).toHaveBeenCalled();
		expect(error.mock.calls[0]?.join(' ')).toContain('RouterContext');
		error.mockRestore();
	});
});
