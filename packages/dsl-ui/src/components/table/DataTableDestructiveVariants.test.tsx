// A destructive action short of solid red: a row icon and a batch button both take `danger-outline` (red border and text, no fill).
// A neutral batch bar uses `secondary` / `neutral` / `ghost`.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ColumnHelpers, DataTable } from './DataTable.js';
import type { TableColumn } from './DataTable.js';

type Row = Record<string, unknown>;
const rows: Row[] = [{ id: '1', name: 'a' }];

describe('DataTable destructive and neutral variants', () => {
	it('a row action icon with variant danger-outline is outlined red, not filled', () => {
		const cols = [
			ColumnHelpers.text<Row>('name', 'Name'),
			{ key: '_actions', label: '', isActions: true, render: () => null, actions: [{ label: 'Delete', action: 'delete', icon: <span />, variant: 'danger-outline' as const }] },
		] as TableColumn<Row>[];
		render(<DataTable rows={rows} columns={cols} />);
		const button = screen.getByRole('button', { name: 'Delete' });
		expect(button).toHaveClass('border-danger', 'text-danger');
		expect(button).not.toHaveClass('bg-danger');
	});

	it.each(['secondary', 'neutral', 'danger-outline', 'ghost'] as const)('a batch action takes variant %s', variant => {
		render(<DataTable rows={rows} columns={[ColumnHelpers.text<Row>('name', 'Name')]} selectable batchActions={[{ label: 'Go', action: 'go', variant }]} />);
		fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
		expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
	});
});
