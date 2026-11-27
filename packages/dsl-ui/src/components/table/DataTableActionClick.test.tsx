// Reproduced on the showcase assets page: deleting a row also followed the row's navigateTo, opening the deleted asset (HTTP 404).
// A click on a row action belongs to the action, never to the row.
import { fireEvent, render, screen } from '@testing-library/react';
import { Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable.js';

const ROWS = [{ id: '1', name: 'one' }];

function renderTable(onRowClick: () => void, onAction: () => void) {
	render(
		<DataTable
			rows={ROWS}
			onRowClick={onRowClick}
			columns={[{ key: 'name', label: 'Name', render: (row: (typeof ROWS)[number]) => row.name }, { type: 'actions', items: [{ label: 'Delete', action: 'delete', icon: <Trash2 /> }] } as never]}
			onAction={onAction}
		/>
	);
}

describe('a click on a row action', () => {
	it('runs the action and does not click the row', () => {
		const onRowClick = vi.fn();
		const onAction = vi.fn();
		renderTable(onRowClick, onAction);
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(onAction).toHaveBeenCalledTimes(1);
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('a click on the data cells still clicks the row', () => {
		const onRowClick = vi.fn();
		renderTable(onRowClick, vi.fn());
		fireEvent.click(screen.getByText('one'));
		expect(onRowClick).toHaveBeenCalledTimes(1);
	});
});
