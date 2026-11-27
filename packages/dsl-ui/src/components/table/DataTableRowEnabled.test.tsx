// A row action can be shown but not available for one row: `enabledWhen` (a row field, `!field` for falsy, like `condition`) turns
// the button off for the rows that do not qualify, and `disabledReason` says why in its tooltip. `condition` still hides.
import { fireEvent, render, screen } from '@testing-library/react';
import { Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable.js';

type Row = { id: string; name: string; locked: boolean };
const ROWS: Row[] = [
	{ id: '1', name: 'one', locked: false },
	{ id: '2', name: 'two', locked: true },
];

function renderTable(item: Record<string, unknown>, onAction = vi.fn()) {
	render(
		<DataTable
			rows={ROWS}
			columns={[{ key: 'name', label: 'Name', render: (row: Row) => row.name }, { type: 'actions', items: [{ label: 'Delete', action: 'delete', icon: <Trash2 />, ...item }] } as never]}
			onAction={onAction}
		/>
	);
	return onAction;
}

const buttons = () => screen.getAllByRole('button', { name: 'Delete' });

describe('enabledWhen on a row action', () => {
	it('turns the button off for the rows that do not qualify, with the reason', () => {
		const onAction = renderTable({ enabledWhen: '!locked', disabledReason: 'Locked rows cannot be deleted' });
		expect(buttons()[0]).toBeEnabled();
		expect(buttons()[1]).toBeDisabled();
		expect(screen.getByRole('tooltip')).toHaveTextContent('Locked rows cannot be deleted');
		fireEvent.click(buttons()[1]!);
		expect(onAction).not.toHaveBeenCalled();
		fireEvent.click(buttons()[0]!);
		expect(onAction).toHaveBeenCalledWith('delete', ROWS[0]);
	});

	it('says something even without a disabledReason', () => {
		renderTable({ enabledWhen: '!locked' });
		expect(screen.getByRole('tooltip')).toHaveTextContent('Not available for this row');
	});

	it('"field" qualifies the rows where the field is truthy', () => {
		renderTable({ enabledWhen: 'locked' });
		expect(buttons()[0]).toBeDisabled();
		expect(buttons()[1]).toBeEnabled();
	});

	it('a text action (no icon) follows the same rule', () => {
		render(
			<DataTable
				rows={ROWS}
				columns={[{ key: 'name', label: 'Name', render: (row: Row) => row.name }, { type: 'actions', items: [{ label: 'Delete', action: 'delete', enabledWhen: '!locked', disabledReason: 'Locked' }] } as never]}
				onAction={vi.fn()}
			/>
		);
		expect(buttons()[1]).toBeDisabled();
		expect(screen.getByRole('tooltip')).toHaveTextContent('Locked');
	});

	it('condition still hides the button, and wins over enabledWhen', () => {
		renderTable({ condition: '!locked', enabledWhen: '!locked' });
		expect(buttons()).toHaveLength(1);
	});
});
