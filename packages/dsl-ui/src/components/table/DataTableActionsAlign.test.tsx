// The actions column sits at the end of the row: header and cells are right-aligned and the column is only as wide as its icons,
// so every module gets the same look without a custom class.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from './DataTable.js';
import type { TableColumn } from './DataTable.js';

type Row = Record<string, unknown>;
const rows: Row[] = [{ id: '1', state: 'done' }];
const yaml = (cols: Array<Record<string, unknown>>) => cols as unknown as TableColumn<Row>[];
const actions = { type: 'actions', items: [{ label: 'Clear', action: 'clear' }, { label: 'Drop', action: 'drop' }] };

describe('DataTable actions column alignment', () => {
	it('right-aligns the cell content', () => {
		render(<DataTable rows={rows} columns={yaml([{ field: 'state', label: 'State' }, actions])} />);
		const wrapper = screen.getByRole('button', { name: 'Clear' }).parentElement as HTMLElement;
		expect(wrapper).toHaveClass('justify-end');
	});

	it('right-aligns the header too', () => {
		render(<DataTable rows={rows} columns={yaml([{ field: 'state', label: 'State' }, { ...actions, label: 'Actions' }])} />);
		expect(screen.getAllByRole('columnheader').at(-1)).toHaveClass('text-right');
	});

	it('hugs its icons when no width is given, and keeps an explicit width', () => {
		const { unmount } = render(<DataTable rows={rows} columns={yaml([{ field: 'state', label: 'State' }, actions])} />);
		const td = screen.getByRole('button', { name: 'Clear' }).closest('td') as HTMLElement;
		expect(td).toHaveClass('w-px', 'whitespace-nowrap');
		unmount();
		render(<DataTable rows={rows} columns={yaml([{ field: 'state', label: 'State' }, { ...actions, width: 24 }])} />);
		const sized = screen.getByRole('button', { name: 'Clear' }).closest('td') as HTMLElement;
		expect(sized).not.toHaveClass('w-px');
		expect(sized.style.width).toBe('96px');
	});

	it('does not touch the alignment of a data column', () => {
		render(<DataTable rows={rows} columns={yaml([{ field: 'state', label: 'State' }, actions])} />);
		expect(screen.getAllByRole('columnheader')[0]).not.toHaveClass('text-right');
		expect(screen.getByText('done').closest('td')).not.toHaveClass('w-px');
	});
});
