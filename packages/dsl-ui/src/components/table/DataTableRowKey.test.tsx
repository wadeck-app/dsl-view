import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColumnHelpers, DataTable } from './DataTable.js';

type Row = { name: string; id?: string; uuid?: string };

const cols = [ColumnHelpers.text<Row>('name', 'Name')];
const batch = [{ label: 'Delete', action: 'delete' }];

afterEach(() => {
	vi.restoreAllMocks();
});

function checkbox(name: string): HTMLInputElement {
	return screen.getByRole('checkbox', { name }) as HTMLInputElement;
}

function checkedRowBoxes(): boolean[] {
	return screen
		.getAllByRole('checkbox')
		.slice(1)
		.map(box => (box as HTMLInputElement).checked);
}

describe('DataTable row identity for selection', () => {
	it('selects only the clicked row when rows have no id (they used to share one empty key and all toggled together)', () => {
		const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		// DataTable reports each distinct message once per module, so a warning is asserted only by a test whose message
		// no other test of this file produces: here "4 row(s)" (the others use 3, 2 or 1 row without an id). With a
		// shared message the test that runs first would get the warning and the others none, depending on the order.
		const rows: Row[] = [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }];
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		fireEvent.click(checkbox('Select row 1'));
		expect(checkedRowBoxes()).toStrictEqual([false, true, false, false]);
		expect(screen.getByText('1 selected')).toBeInTheDocument();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('4 row(s) have no "id" value'));
	});

	it('hands the batch action exactly the selected rows when ids are missing', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const onBatchAction = vi.fn();
		const rows: Row[] = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} onBatchAction={onBatchAction} />);
		fireEvent.click(checkbox('Select row 2'));
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(onBatchAction).toHaveBeenCalledTimes(1);
		expect(onBatchAction).toHaveBeenCalledWith('delete', [rows[2]]);
	});

	it('keeps a selection on the same row after the table is sorted', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const sortableName = ColumnHelpers.text<Row>('name', 'Name');
		sortableName.sortable = true;
		const rows: Row[] = [{ name: 'B' }, { name: 'A' }];
		render(<DataTable rows={rows} columns={[sortableName]} selectable batchActions={batch} />);
		fireEvent.click(checkbox('Select row 0'));
		expect(checkedRowBoxes()).toStrictEqual([true, false]);
		fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }));
		const afterSort = screen.getAllByRole('row').slice(1).map(row => row.textContent);
		expect(afterSort.findIndex(text => text?.includes('B'))).toBe(checkedRowBoxes().indexOf(true));
	});

	it('uses the column named by rowKey as identity', () => {
		const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const rows: Row[] = [
			{ name: 'A', uuid: 'u1' },
			{ name: 'B', uuid: 'u2' },
		];
		render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} rowKey="uuid" />);
		fireEvent.click(checkbox('Select row u2'));
		expect(checkedRowBoxes()).toStrictEqual([false, true]);
		expect(warn).not.toHaveBeenCalled();
	});

	it('does not warn when every row has an id', () => {
		const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={[{ name: 'A', id: '1' }, { name: 'B', id: '2' }]} columns={cols} selectable batchActions={batch} />);
		expect(warn).not.toHaveBeenCalled();
	});

	it('warns once, naming the key and the values, when two rows share the same identity', () => {
		const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const rows: Row[] = [
			{ name: 'A', id: 'same' },
			{ name: 'B', id: 'same' },
		];
		const view = render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		view.rerender(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		const messages = warn.mock.calls.map(call => String(call[0])).filter(text => text.includes('same'));
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('"id"');
		expect(messages[0]).toContain('rowKey');
	});

	it('names the missing key and the fallback in the warning for rows without an identity', () => {
		const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={[{ name: 'Only' }]} columns={cols} selectable batchActions={batch} rowKey="uuid" />);
		const message = warn.mock.calls.map(call => String(call[0])).find(text => text.includes('uuid'));
		expect(message).toBeDefined();
		expect(message).toContain('position');
	});

	it('does not warn about identities when the table is not selectable (nothing uses them)', () => {
		const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		render(<DataTable rows={[{ name: 'A' }, { name: 'B' }]} columns={cols} />);
		expect(warn).not.toHaveBeenCalled();
	});
});
