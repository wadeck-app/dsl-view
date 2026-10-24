import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColumnHelpers, DataTable, useDataTableSelection } from './DataTable.js';

type Row = { id: string; name: string; status: number; method: string };

const rows: Row[] = [
	{ id: '1', name: 'Alice', status: 200, method: 'GET' },
	{ id: '2', name: 'Bob', status: 404, method: 'POST' },
	{ id: '3', name: 'Carol', status: 500, method: 'GET' },
];

afterEach(() => {
	vi.restoreAllMocks();
});

// The text of the first cell of each body row, in DOM order.
function names(): string[] {
	return screen
		.getAllByRole('row')
		.slice(1)
		.map(row => within(row).getAllByRole('cell')[0]!.textContent ?? '');
}

function sortable<T extends Record<string, unknown>>(key: keyof T & string, label: string) {
	const col = ColumnHelpers.text<T>(key, label);
	col.sortable = true;
	return col;
}

describe('DataTable cell formats', () => {
	const ts = '2026-10-19T14:05:00Z';

	it.each([
		['datetime', { dateStyle: 'short', timeStyle: 'short' }],
		['date', { dateStyle: 'short' }],
		['time', { timeStyle: 'short' }],
	] as const)('ColumnHelpers.date formats %s with the viewer locale', (format, options) => {
		type R = { id: string; at: string };
		render(<DataTable<R> rows={[{ id: '1', at: ts }]} columns={[ColumnHelpers.date<R>('at', 'At', { format })]} />);
		expect(screen.getByRole('cell')).toHaveTextContent(new Intl.DateTimeFormat(undefined, options).format(new Date(ts)));
	});

	it('shows an unparsable date as it came instead of crashing the whole table', () => {
		type R = { id: string; at: string };
		render(<DataTable<R> rows={[{ id: '1', at: 'not a date' }, { id: '2', at: ts }]} columns={[ColumnHelpers.date<R>('at', 'At')]} />);
		const cells = screen.getAllByRole('cell');
		expect(cells[0]).toHaveTextContent('not a date');
		expect(cells[1]).not.toHaveTextContent('not a date');
	});

	it('renders an empty cell for a null or missing date, not "null" or "Invalid Date"', () => {
		type R = { id: string; at: string | null };
		render(<DataTable<R> rows={[{ id: '1', at: null }]} columns={[ColumnHelpers.date<R>('at', 'At')]} />);
		expect(screen.getByRole('cell').textContent).toBe('');
	});

	it('formats bytes and milliseconds, and an empty value stays empty', () => {
		type R = { id: string; size: number | null; took: number | null };
		const cols = [ColumnHelpers.bytes<R>('size', 'Size'), ColumnHelpers.number<R>('took', 'Took', { format: 'ms' })];
		const view = render(<DataTable<R> rows={[{ id: '1', size: 2048, took: 12 }]} columns={cols} />);
		expect(screen.getAllByRole('cell').map(c => c.textContent)).toEqual(['2.0 KB', '12ms']);
		view.unmount();
		render(<DataTable<R> rows={[{ id: '1', size: null, took: null }]} columns={cols} />);
		expect(screen.getAllByRole('cell').map(c => c.textContent)).toEqual(['', '']);
	});

	it('ColumnHelpers.number without a format prints the value', () => {
		type R = { id: string; n: number };
		render(<DataTable<R> rows={[{ id: '1', n: 7 }]} columns={[ColumnHelpers.number<R>('n', 'N')]} />);
		expect(screen.getByRole('cell')).toHaveTextContent('7');
	});

	it('ColumnHelpers.text prints an empty string for a missing value', () => {
		type R = { id: string; v?: string };
		render(<DataTable<R> rows={[{ id: '1' }]} columns={[ColumnHelpers.text<R>('v', 'V')]} />);
		expect(screen.getByRole('cell').textContent).toBe('');
	});

	it('a plain YAML column prints the value, "" for null, and the label falls back to the field', () => {
		const view = render(<DataTable rows={[{ id: '1', nick: null }] as never} columns={[{ field: 'nick' }] as never} />);
		expect(screen.getByRole('columnheader')).toHaveTextContent('nick');
		expect(screen.getByRole('cell').textContent).toBe('');
		view.unmount();
		render(<DataTable rows={[{ id: '1', nick: 'ally' }] as never} columns={[{ field: 'nick', label: 'Nickname' }] as never} />);
		expect(screen.getByRole('columnheader')).toHaveTextContent('Nickname');
		expect(screen.getByRole('cell')).toHaveTextContent('ally');
	});

	it.each([
		['time', () => ColumnHelpers.date<Row>('name', 'T', { format: 'time' })],
		['date', () => ColumnHelpers.date<Row>('name', 'D', { format: 'date' })],
		['datetime', () => ColumnHelpers.date<Row>('name', 'DT')],
		['ms', () => ColumnHelpers.number<Row>('status', 'MS', { format: 'ms' })],
	])('a %s column is muted and never wraps', (_format, make) => {
		render(<DataTable rows={[rows[0]!]} columns={[make()]} />);
		const cell = screen.getByRole('cell');
		expect(cell).toHaveClass('text-muted', 'whitespace-nowrap');
		expect(cell).not.toHaveClass('break-all');
	});

	it('a bytes column is regular text (only time-like formats are muted)', () => {
		type R = { id: string; size: number };
		render(<DataTable<R> rows={[{ id: '1', size: 5 }]} columns={[ColumnHelpers.bytes<R>('size', 'Size')]} />);
		expect(screen.getByRole('cell')).toHaveClass('text-content');
		expect(screen.getByRole('cell')).not.toHaveClass('text-muted');
	});

	it('a plain text column wraps with break-all, a truncated one does not and carries the full text as title', () => {
		const plain = render(<DataTable rows={[rows[0]!]} columns={[ColumnHelpers.text<Row>('name', 'Name')]} />);
		expect(screen.getByRole('cell')).toHaveClass('break-all');
		expect(screen.getByRole('cell')).not.toHaveAttribute('title');
		plain.unmount();
		render(<DataTable rows={[rows[0]!]} columns={[ColumnHelpers.text<Row>('name', 'Name', { truncate: true })]} />);
		const cell = screen.getByRole('cell');
		expect(cell).toHaveClass('truncate', 'whitespace-nowrap');
		expect(cell).not.toHaveClass('break-all');
		expect(cell).toHaveAttribute('title', 'Alice');
	});

	it('a column with a width gets a fixed pixel width on header and cells (units of 4px)', () => {
		render(<DataTable rows={[rows[0]!]} columns={[ColumnHelpers.text<Row>('name', 'Name', { width: 10 })]} />);
		expect(screen.getByRole('columnheader')).toHaveStyle({ width: '40px' });
		expect(screen.getByRole('cell')).toHaveStyle({ width: '40px' });
	});

	it('mono switches the cell to a monospace font', () => {
		render(<DataTable rows={[rows[0]!]} columns={[ColumnHelpers.text<Row>('name', 'Name', { mono: true })]} />);
		expect(screen.getByRole('cell')).toHaveClass('font-mono');
	});

	it('does not apply font-mono to the table unless fontMono is set', () => {
		const { container } = render(<DataTable rows={[]} columns={[ColumnHelpers.text<Row>('name', 'Name')]} />);
		expect(container.firstChild).not.toHaveClass('font-mono');
	});
});

describe('DataTable sorting', () => {
	type N = { id: string; name: string; size: number | null };
	const data: N[] = [
		{ id: '1', name: 'banana', size: 10 },
		{ id: '2', name: 'apple', size: 9 },
		{ id: '3', name: 'cherry', size: 100 },
	];
	const cols = [sortable<N>('name', 'Name'), sortable<N>('size', 'Size')];

	it('cycles ascending, descending, then back to the original order', () => {
		render(<DataTable<N> rows={data} columns={cols} />);
		const button = screen.getByRole('button', { name: 'Sort by Name' });
		expect(names()).toEqual(['banana', 'apple', 'cherry']);
		fireEvent.click(button);
		expect(names()).toEqual(['apple', 'banana', 'cherry']);
		fireEvent.click(button);
		expect(names()).toEqual(['cherry', 'banana', 'apple']);
		fireEvent.click(button);
		expect(names()).toEqual(['banana', 'apple', 'cherry']);
	});

	it('compares numbers numerically (9 < 10 < 100), not as text', () => {
		render(<DataTable<N> rows={data} columns={cols} />);
		const button = screen.getByRole('button', { name: 'Sort by Size' });
		fireEvent.click(button);
		expect(screen.getAllByRole('row').slice(1).map(r => within(r).getAllByRole('cell')[1]!.textContent)).toEqual(['9', '10', '100']);
		fireEvent.click(button);
		expect(screen.getAllByRole('row').slice(1).map(r => within(r).getAllByRole('cell')[1]!.textContent)).toEqual(['100', '10', '9']);
	});

	it('sorting another column replaces the first sort', () => {
		render(<DataTable<N> rows={data} columns={cols} />);
		fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }));
		fireEvent.click(screen.getByRole('button', { name: 'Sort by Size' }));
		expect(names()).toEqual(['apple', 'banana', 'cherry']); // size asc: 9, 10, 100
	});

	it('puts empty values first when ascending (they compare as empty text)', () => {
		const withNull: N[] = [{ id: '1', name: 'b', size: 1 }, { id: '2', name: 'a', size: null }];
		render(<DataTable<N> rows={withNull} columns={[sortable<N>('name', 'Name')]} />);
		fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }));
		expect(names()).toEqual(['a', 'b']);
	});

	it('does not reorder the caller\'s rows array', () => {
		const original = [...data];
		render(<DataTable<N> rows={data} columns={cols} />);
		fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }));
		expect(data).toEqual(original);
	});

	it('reports each step to onSortColChange / onSortDirChange, and an unsorted table as an empty column', () => {
		const onSortColChange = vi.fn();
		const onSortDirChange = vi.fn();
		render(<DataTable<N> rows={data} columns={cols} onSortColChange={onSortColChange} onSortDirChange={onSortDirChange} />);
		const button = screen.getByRole('button', { name: 'Sort by Name' });
		fireEvent.click(button);
		expect(onSortColChange).toHaveBeenLastCalledWith('name');
		expect(onSortDirChange).toHaveBeenLastCalledWith('asc');
		fireEvent.click(button);
		expect(onSortColChange).toHaveBeenLastCalledWith('name');
		expect(onSortDirChange).toHaveBeenLastCalledWith('desc');
		fireEvent.click(button);
		expect(onSortColChange).toHaveBeenLastCalledWith('');
		expect(onSortDirChange).toHaveBeenLastCalledWith('asc');
	});

	it('starts sorted when sortCol / sortDir are given', () => {
		render(<DataTable<N> rows={data} columns={cols} sortCol="name" sortDir="desc" />);
		expect(names()).toEqual(['cherry', 'banana', 'apple']);
	});

	it('shows the sort direction on the header arrow', () => {
		const { container } = render(<DataTable<N> rows={data} columns={cols} />);
		const arrow = () => container.querySelector('th button svg')!.getAttribute('class')!;
		expect(arrow()).toContain('lucide-chevrons-up-down');
		fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }));
		expect(arrow()).toContain('lucide-chevron-up');
		fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }));
		expect(arrow()).toContain('lucide-chevron-down');
	});
});

describe('DataTable selection and batch actions', () => {
	const cols = [ColumnHelpers.text<Row>('name', 'Name')];
	const batch = [{ label: 'Delete', action: 'delete' }];

	function checkbox(name: string): HTMLInputElement {
		return screen.getByRole('checkbox', { name }) as HTMLInputElement;
	}

	it('select-all selects every row, and clears them on a second click', () => {
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		fireEvent.click(checkbox('Select all rows on this page'));
		expect(screen.getByText('3 selected')).toBeInTheDocument();
		expect(['1', '2', '3'].every(id => checkbox(`Select row ${id}`).checked)).toBe(true);
		fireEvent.click(checkbox('Select all rows on this page'));
		expect(screen.queryByText(/selected/)).toBeNull();
	});

	it('marks select-all as indeterminate when only some rows are selected', () => {
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		const all = checkbox('Select all rows on this page');
		expect(all.indeterminate).toBe(false);
		fireEvent.click(checkbox('Select row 2'));
		expect(all.indeterminate).toBe(true);
		expect(all.checked).toBe(false);
		fireEvent.click(checkbox('Select all rows on this page'));
		expect(all.indeterminate).toBe(false);
		expect(all.checked).toBe(true);
	});

	it('toggles one row on and off', () => {
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		fireEvent.click(checkbox('Select row 1'));
		expect(screen.getByText('1 selected')).toBeInTheDocument();
		fireEvent.click(checkbox('Select row 1'));
		expect(screen.queryByText(/selected/)).toBeNull();
	});

	it('has no select-all with nothing to select and no checkboxes when not selectable', () => {
		const empty = render(<DataTable rows={[]} columns={cols} selectable batchActions={batch} />);
		expect(checkbox('Select all rows on this page').checked).toBe(false);
		empty.unmount();
		render(<DataTable rows={rows} columns={cols} />);
		expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
	});

	it('shows no batch toolbar without batch actions, or while nothing is selected', () => {
		const noActions = render(<DataTable rows={rows} columns={cols} selectable />);
		fireEvent.click(checkbox('Select row 1'));
		expect(screen.queryByRole('toolbar')).toBeNull();
		noActions.unmount();
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		expect(screen.queryByRole('toolbar')).toBeNull();
	});

	it('a batch action receives the selected rows (not the others), then clears the selection', () => {
		const onBatchAction = vi.fn();
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} onBatchAction={onBatchAction} />);
		fireEvent.click(checkbox('Select row 1'));
		fireEvent.click(checkbox('Select row 3'));
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(onBatchAction).toHaveBeenCalledExactlyOnceWith('delete', [rows[0], rows[2]]);
		expect(screen.queryByRole('toolbar')).toBeNull();
		expect(checkbox('Select row 1').checked).toBe(false);
	});

	it('a batch action without a handler does not throw and still clears the selection', () => {
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		fireEvent.click(checkbox('Select row 1'));
		expect(() => fireEvent.click(screen.getByRole('button', { name: 'Delete' }))).not.toThrow();
		expect(screen.queryByRole('toolbar')).toBeNull();
	});

	it('uses the floating pill by default and a static bar below the table for position "bottom"', () => {
		const floating = render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		fireEvent.click(checkbox('Select row 1'));
		expect(screen.getByRole('toolbar')).toHaveClass('fixed');
		floating.unmount();
		const bottom = render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} batchActionsPosition="bottom" />);
		fireEvent.click(checkbox('Select row 1'));
		const toolbar = screen.getByRole('toolbar');
		expect(toolbar).not.toHaveClass('fixed');
		// "below the table": it follows <table> in the document, so selecting a row never pushes the rows down.
		const table = screen.getByRole('table');
		expect(table.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		bottom.unmount();
	});

	it('a batch action shows busy while it runs and keeps its variant', () => {
		render(
			<DataTable
				rows={rows}
				columns={cols}
				selectable
				batchActions={[{ label: 'Delete', action: 'delete', variant: 'danger' }]}
				actionPending={{ delete: true }}
			/>
		);
		fireEvent.click(checkbox('Select row 1'));
		const button = screen.getByRole('button', { name: 'Delete' });
		expect(button).toHaveAttribute('aria-busy', 'true');
		expect(button).toHaveClass('bg-danger');
	});

	it('clicking a selection checkbox does not trigger the row click', () => {
		const onRowClick = vi.fn();
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} onRowClick={onRowClick} />);
		fireEvent.click(checkbox('Select row 1'));
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('exposes the selection to components rendered inside the table', () => {
		function Probe() {
			const selection = useDataTableSelection();
			return <span data-testid="probe">{selection ? selection.selectedIds.join(',') : 'no-context'}</span>;
		}
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} filters={<Probe />} />);
		expect(screen.getByTestId('probe')).toHaveTextContent('');
		fireEvent.click(checkbox('Select row 2'));
		expect(screen.getByTestId('probe')).toHaveTextContent('2');
	});

	it('outside a DataTable the selection hook has no context', () => {
		function Probe() {
			return <span data-testid="probe">{useDataTableSelection() === null ? 'none' : 'some'}</span>;
		}
		render(<Probe />);
		expect(screen.getByTestId('probe')).toHaveTextContent('none');
	});
});

describe('DataTable expansion', () => {
	const cols = [ColumnHelpers.text<Row>('name', 'Name')];
	const renderNode = vi.fn((node: Record<string, unknown>, ctx: Record<string, unknown>) => (
		<span data-testid="expanded">{`${String(node['$type'])}:${String((ctx['row'] as Row).name)}`}</span>
	));
	const expansion = { $type: 'Detail' };

	it('toggles the expansion of a row and renders the node with that row', () => {
		render(<DataTable rows={rows} columns={cols} expansion={expansion} renderNode={renderNode} />);
		const toggles = screen.getAllByRole('button');
		expect(screen.queryByTestId('expanded')).toBeNull();
		fireEvent.click(toggles[1]!);
		expect(screen.getByTestId('expanded')).toHaveTextContent('Detail:Bob');
		expect(renderNode).toHaveBeenLastCalledWith(expansion, { row: rows[1] });
		fireEvent.click(toggles[1]!);
		expect(screen.queryByTestId('expanded')).toBeNull();
	});

	it('expanding another row moves the expansion', () => {
		render(<DataTable rows={rows} columns={cols} expansion={expansion} renderNode={renderNode} />);
		const toggles = screen.getAllByRole('button');
		fireEvent.click(toggles[0]!);
		fireEvent.click(toggles[2]!);
		expect(screen.getAllByTestId('expanded')).toHaveLength(1);
		expect(screen.getByTestId('expanded')).toHaveTextContent('Detail:Carol');
	});

	it('identifies rows by `key` when they have no `id`', () => {
		type K = { key: string; name: string };
		const keyed: K[] = [{ key: 'a', name: 'A' }, { key: 'b', name: 'B' }];
		render(<DataTable<K> rows={keyed} columns={[ColumnHelpers.text<K>('name', 'Name')]} expansion={expansion} renderNode={renderNode as never} />);
		fireEvent.click(screen.getAllByRole('button')[1]!);
		expect(screen.getAllByTestId('expanded')).toHaveLength(1);
		expect(screen.getByTestId('expanded')).toHaveTextContent('Detail:B');
	});

	it('shows the toggle only on rows where expansionCondition is truthy', () => {
		type E = { id: string; name: string; hasDetail: boolean };
		const data: E[] = [{ id: '1', name: 'A', hasDetail: true }, { id: '2', name: 'B', hasDetail: false }];
		render(<DataTable<E> rows={data} columns={[ColumnHelpers.text<E>('name', 'Name')]} expansion={expansion} renderNode={renderNode as never} expansionCondition="hasDetail" />);
		expect(screen.getAllByRole('button')).toHaveLength(1);
	});

	it('shows nothing expanded without a renderNode, and the toggle is still there', () => {
		render(<DataTable rows={rows} columns={cols} expansion={expansion} />);
		fireEvent.click(screen.getAllByRole('button')[0]!);
		expect(screen.queryByTestId('expanded')).toBeNull();
	});

	it('the expanded row spans every column: the toggle, the data and the selection column', () => {
		const plain = render(<DataTable rows={rows} columns={cols} expansion={expansion} renderNode={renderNode} />);
		fireEvent.click(screen.getAllByRole('button')[0]!);
		expect(screen.getByTestId('expanded').closest('td')).toHaveAttribute('colspan', '2');
		plain.unmount();
		render(<DataTable rows={rows} columns={cols} expansion={expansion} renderNode={renderNode} selectable />);
		fireEvent.click(screen.getAllByRole('button')[0]!);
		expect(screen.getByTestId('expanded').closest('td')).toHaveAttribute('colspan', '3');
	});

	it('the empty and loading states span the extra columns too', () => {
		const empty = render(<DataTable rows={[]} columns={cols} expansion={expansion} selectable emptyMessage="Nothing" />);
		expect(screen.getByText('Nothing').closest('td')).toHaveAttribute('colspan', '3');
		empty.unmount();
		const loading = render(<DataTable rows={[]} columns={cols} expansion={expansion} selectable loading />);
		for (const row of screen.getAllByRole('row').slice(1)) {
			expect(within(row).getAllByRole('cell')).toHaveLength(3);
		}
		loading.unmount();
		render(<DataTable rows={[]} columns={cols} emptyMessage="Nothing" />);
		expect(screen.getByText('Nothing').closest('td')).toHaveAttribute('colspan', '1');
	});
});

describe('DataTable busy presentation', () => {
	const cols = [ColumnHelpers.text<Row>('name', 'Name'), ColumnHelpers.text<Row>('status', 'Status')];
	const dimmed = () => screen.getAllByRole('rowgroup')[1]!.className.includes('opacity-60');

	it('dims the kept rows only for a refetch: not while idle, not behind the loading skeleton', () => {
		const idle = render(<DataTable rows={rows} columns={cols} />);
		expect(dimmed()).toBe(false);
		idle.unmount();
		const refreshing = render(<DataTable rows={rows} columns={cols} refreshing />);
		expect(dimmed()).toBe(true);
		refreshing.unmount();
		// First load wins over a refetch flag: skeleton rows are not dimmed, they have their own look.
		render(<DataTable rows={[]} columns={cols} loading refreshing />);
		expect(dimmed()).toBe(false);
	});

	it('announces the loading state from the first cell of the first skeleton row, once', () => {
		render(<DataTable rows={[]} columns={cols} loading />);
		const status = screen.getByRole('status');
		const firstCell = within(screen.getAllByRole('row')[1]!).getAllByRole('cell')[0]!;
		expect(firstCell).toContainElement(status);
	});
});

describe('DataTable row actions conditions', () => {
	type T = { id: string; label: string; revoked: boolean };
	const data: T[] = [
		{ id: '1', label: 'Active token', revoked: false },
		{ id: '2', label: 'Revoked token', revoked: true },
	];
	const rowOf = (label: string) => screen.getByText(label).closest('tr')!;

	it('a "!field" condition shows the action only on rows where the field is falsy', () => {
		const cols = [ColumnHelpers.text<T>('label', 'Label'), ColumnHelpers.actions<T>([{ label: 'Revoke', icon: null, action: 'revoke', condition: '!revoked' }])];
		render(<DataTable<T> rows={data} columns={cols} onAction={vi.fn()} />);
		expect(within(rowOf('Active token')).queryByRole('button', { name: 'Revoke' })).not.toBeNull();
		expect(within(rowOf('Revoked token')).queryByRole('button', { name: 'Revoke' })).toBeNull();
	});

	it('a "field" condition shows the action only on rows where the field is truthy', () => {
		const cols = [ColumnHelpers.text<T>('label', 'Label'), ColumnHelpers.actions<T>([{ label: 'Restore', icon: null, action: 'restore', condition: 'revoked' }])];
		render(<DataTable<T> rows={data} columns={cols} onAction={vi.fn()} />);
		expect(within(rowOf('Active token')).queryByRole('button', { name: 'Restore' })).toBeNull();
		expect(within(rowOf('Revoked token')).queryByRole('button', { name: 'Restore' })).not.toBeNull();
	});

	it('an action without a condition shows on every row and reports the clicked row', () => {
		const onAction = vi.fn();
		const cols = [ColumnHelpers.text<T>('label', 'Label'), ColumnHelpers.actions<T>([{ label: 'Open', icon: <svg />, action: 'open' }])];
		render(<DataTable<T> rows={data} columns={cols} onAction={onAction} />);
		fireEvent.click(within(rowOf('Revoked token')).getByRole('button', { name: 'Open' }));
		expect(onAction).toHaveBeenCalledExactlyOnceWith('open', data[1]);
	});
});

describe('DataTable filter state', () => {
	type F = { id: string; name: string; status: number; method: string };
	const data: F[] = [
		{ id: '1', name: 'a', status: 399, method: 'GET' },
		{ id: '2', name: 'b', status: 400, method: 'POST' },
		{ id: '3', name: 'c', status: 499, method: 'GET' },
		{ id: '4', name: 'd', status: 500, method: 'GET' },
	];
	const cols = [ColumnHelpers.text<F>('name', 'Name')];

	it('a "4xx" string is an exact match like any other: the status-family rule belongs to the app (a registered predicate)', () => {
		render(<DataTable<F> rows={data} columns={cols} defaultFilters={{ status: '4xx' }} emptyMessage="No match" />);
		expect(screen.getByText('No match')).toBeInTheDocument();
	});

	it('an exact-match string filter on a numeric field compares its text (400 matches "400", not 399 or 499)', () => {
		render(<DataTable<F> rows={data} columns={cols} defaultFilters={{ status: '400' }} />);
		expect(names()).toEqual(['b']);
	});

	it('an array filter keeps rows whose field is in the list; an empty array filters nothing', () => {
		const some = render(<DataTable<F> rows={data} columns={cols} defaultFilters={{ method: ['POST'] }} />);
		expect(names()).toEqual(['b']);
		some.unmount();
		render(<DataTable<F> rows={data} columns={cols} defaultFilters={{ method: [] }} />);
		expect(names()).toEqual(['a', 'b', 'c', 'd']);
	});

	it('a plain string filter is an exact match', () => {
		render(<DataTable<F> rows={data} columns={cols} defaultFilters={{ method: 'GET' }} />);
		expect(names()).toEqual(['a', 'c', 'd']);
	});

	it('a string filter hides rows that lack the field', () => {
		const sparse = [{ id: '1', name: 'a' }, { id: '2', name: 'b', method: 'GET' }];
		render(<DataTable rows={sparse as never} columns={cols as never} defaultFilters={{ method: 'GET' }} />);
		expect(names()).toEqual(['b']);
	});

	it.each([['all'], [null], [undefined]])('the value %s means "no filter"', value => {
		render(<DataTable<F> rows={data} columns={cols} defaultFilters={{ method: value }} />);
		expect(names()).toEqual(['a', 'b', 'c', 'd']);
	});

	it('combines several filters (all must match)', () => {
		render(<DataTable<F> rows={data} columns={cols} defaultFilters={{ method: 'GET', status: '499' }} />);
		expect(names()).toEqual(['c']);
	});

	it('shows the empty message when the filters leave nothing', () => {
		render(<DataTable<F> rows={data} columns={cols} defaultFilters={{ method: 'DELETE' }} emptyMessage="No match" />);
		expect(screen.getByText('No match')).toBeInTheDocument();
	});
});

describe('DataTable actions column with a malformed item', () => {
	it('drops an item that is not an object, says so once and still renders the valid ones', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const yaml = [{ field: 'name', label: 'Name' }, { type: 'actions', items: [null, 'oops', { label: 'Ok', action: 'ok' }] }];
		render(<DataTable rows={[rows[0]!, rows[1]!]} columns={yaml as never} />);
		expect(screen.getAllByRole('button', { name: 'Ok' })).toHaveLength(2);
		const reports = error.mock.calls.map(c => String(c[0])).filter(m => m.includes('an action item must be an object'));
		expect(reports.some(m => m.includes('item #0') && m.includes('null'))).toBe(true);
		expect(reports.some(m => m.includes('item #1') && m.includes('"oops"'))).toBe(true);
	});
});
