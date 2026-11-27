// A batch action says which of the selected items it applies to. `appliesTo` is a row field ("field" truthy, "!field" falsy, as a
// row action `condition`) or, from React, a function. `mode: 'all'` (default) turns the action off with the reason when any
// selected item does not qualify, so an action never silently skips items; `mode: 'some'` acts on the ones that qualify and says
// how many. The handler receives the items it applies to, and the ones it skipped as a third argument.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, useDataTableSelection } from './DataTable.js';

type Row = { id: string; name: string; archivable: boolean };
const ROWS: Row[] = [
	{ id: '1', name: 'one', archivable: true },
	{ id: '2', name: 'two', archivable: true },
	{ id: '3', name: 'three', archivable: false },
];
const COLUMNS = [{ key: 'name', label: 'Name', render: (row: Row) => row.name }];

function Probe() {
	const selection = useDataTableSelection();
	return <span data-testid="probe">{`${selection?.count}/${selection?.total}:${selection?.rows.map(row => row['id']).join(',')}`}</span>;
}

function renderTable(batchActions: React.ComponentProps<typeof DataTable<Row>>['batchActions'], onBatchAction = vi.fn(), select: number[] = [1, 2, 3]) {
	render(<DataTable columns={COLUMNS} rows={ROWS} selectable batchActions={batchActions} onBatchAction={onBatchAction} filtersTop={<Probe />} />);
	for (const index of select) {
		act(() => screen.getAllByRole('checkbox')[index]!.click());
	}
	return onBatchAction;
}

const action = () => screen.getByRole('button', { name: /^Archive/ });

describe('no appliesTo: unchanged', () => {
	it('is enabled and receives every selected row', () => {
		const onBatchAction = renderTable([{ label: 'Archive', action: 'archive' }]);
		expect(action()).toBeEnabled();
		fireEvent.click(action());
		expect(onBatchAction).toHaveBeenCalledWith('archive', ROWS);
		expect(onBatchAction.mock.calls[0]).toHaveLength(2);
	});
});

describe("mode 'all' (default)", () => {
	it('is off with the reason when one selected item does not qualify, and does nothing on click', () => {
		const onBatchAction = renderTable([{ label: 'Archive', action: 'archive', appliesTo: 'archivable' }]);
		expect(action()).toBeDisabled();
		expect(screen.getByRole('tooltip')).toHaveTextContent('1 of 3 selected cannot be handled by "Archive"');
		fireEvent.click(action());
		expect(onBatchAction).not.toHaveBeenCalled();
	});

	it('is on when every selected item qualifies', () => {
		const onBatchAction = renderTable([{ label: 'Archive', action: 'archive', appliesTo: 'archivable' }], vi.fn(), [1, 2]);
		expect(action()).toBeEnabled();
		fireEvent.click(action());
		expect(onBatchAction).toHaveBeenCalledWith('archive', [ROWS[0], ROWS[1]], { skipped: [] });
	});

	it('a custom disabledReason replaces the default message', () => {
		renderTable([{ label: 'Archive', action: 'archive', appliesTo: 'archivable', disabledReason: 'Only active items can be archived' }]);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Only active items can be archived');
	});
});

describe("mode 'some'", () => {
	it('acts on the qualifying items, shows how many, and hands the skipped ones over', () => {
		const onBatchAction = renderTable([{ label: 'Archive', action: 'archive', appliesTo: 'archivable', mode: 'some' }]);
		expect(action()).toBeEnabled();
		expect(action()).toHaveTextContent('Archive (2 of 3)');
		fireEvent.click(action());
		expect(onBatchAction).toHaveBeenCalledWith('archive', [ROWS[0], ROWS[1]], { skipped: [ROWS[2]] });
	});

	it('shows the plain label when every selected item qualifies', () => {
		renderTable([{ label: 'Archive', action: 'archive', appliesTo: 'archivable', mode: 'some' }], vi.fn(), [1, 2]);
		expect(action()).toHaveTextContent(/^Archive$/);
	});

	it('is off with the reason when none qualifies', () => {
		renderTable([{ label: 'Archive', action: 'archive', appliesTo: 'archivable', mode: 'some' }], vi.fn(), [3]);
		expect(action()).toBeDisabled();
		expect(screen.getByRole('tooltip')).toHaveTextContent('None of the 1 selected can be handled by "Archive"');
	});
});

describe('how appliesTo is written', () => {
	it('"!field" qualifies the items where the field is falsy', () => {
		const onBatchAction = renderTable([{ label: 'Archive', action: 'archive', appliesTo: '!archivable', mode: 'some' }]);
		fireEvent.click(action());
		expect(onBatchAction).toHaveBeenCalledWith('archive', [ROWS[2]], { skipped: [ROWS[0], ROWS[1]] });
	});

	it('a function (React) decides per row', () => {
		const onBatchAction = renderTable([{ label: 'Archive', action: 'archive', appliesTo: row => row.name !== 'two', mode: 'some' }]);
		fireEvent.click(action());
		expect(onBatchAction).toHaveBeenCalledWith('archive', [ROWS[0], ROWS[2]], { skipped: [ROWS[1]] });
	});
});

describe('what the selection scope exposes', () => {
	it('gives the selected rows, their count and the total to anything inside the table', () => {
		renderTable([{ label: 'Archive', action: 'archive' }], vi.fn(), [1, 3]);
		expect(screen.getByTestId('probe')).toHaveTextContent('2/3:1,3');
	});
});
