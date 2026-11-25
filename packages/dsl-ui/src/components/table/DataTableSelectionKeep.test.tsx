// Selection after a batch action: an action that asks for it keeps the selection (a cancelled confirm must not lose it), and ids of
// rows that left the table are dropped so the toolbar never counts rows nobody can see.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ColumnHelpers, DataTable } from './DataTable.js';

type Row = Record<string, unknown>;
const rows: Row[] = [{ id: '1', name: 'a' }, { id: '2', name: 'b' }, { id: '3', name: 'c' }];
const cols = [ColumnHelpers.text<Row>('name', 'Name')];
const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

describe('DataTable batch action keepSelection', () => {
	it('keeps the selection after an action marked keepSelection, and still calls the handler', () => {
		const onBatchAction = vi.fn();
		render(<DataTable rows={rows} columns={cols} selectable batchActions={[{ label: 'Delete', action: 'delete', keepSelection: true }]} onBatchAction={onBatchAction} />);
		fireEvent.click(box('Select row 1'));
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(onBatchAction).toHaveBeenCalledExactlyOnceWith('delete', [rows[0]]);
		expect(screen.getByText('1 selected')).toBeInTheDocument();
		expect(box('Select row 1').checked).toBe(true);
	});

	it('still clears after an action that does not ask to keep it (unchanged default)', () => {
		render(<DataTable rows={rows} columns={cols} selectable batchActions={[{ label: 'Delete', action: 'delete' }]} />);
		fireEvent.click(box('Select row 1'));
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(screen.queryByRole('toolbar')).toBeNull();
	});
});

describe('DataTable selection pruning', () => {
	const batch = [{ label: 'Delete', action: 'delete', keepSelection: true }];

	it('drops the ids of rows that vanished from the rows', () => {
		const { rerender } = render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		fireEvent.click(box('Select row 1'));
		fireEvent.click(box('Select row 2'));
		expect(screen.getByText('2 selected')).toBeInTheDocument();
		rerender(<DataTable rows={rows.slice(1)} columns={cols} selectable batchActions={batch} />);
		expect(screen.getByText('1 selected')).toBeInTheDocument();
		expect(box('Select row 2').checked).toBe(true);
	});

	it('removes the toolbar when every selected row vanished, and a returning row is not selected again', () => {
		const { rerender } = render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		fireEvent.click(box('Select row 1'));
		rerender(<DataTable rows={rows.slice(1)} columns={cols} selectable batchActions={batch} />);
		expect(screen.queryByRole('toolbar')).toBeNull();
		rerender(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		expect(box('Select row 1').checked).toBe(false);
	});

	it('keeps the selection when the rows are reloaded with the same ids (new objects)', () => {
		const { rerender } = render(<DataTable rows={rows} columns={cols} selectable batchActions={batch} />);
		fireEvent.click(box('Select row 2'));
		rerender(<DataTable rows={rows.map(r => ({ ...r }))} columns={cols} selectable batchActions={batch} />);
		expect(box('Select row 2').checked).toBe(true);
	});
});
