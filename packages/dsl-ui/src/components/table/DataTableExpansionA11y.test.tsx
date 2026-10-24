import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ColumnHelpers, DataTable } from './DataTable.js';

type Row = { id: string; name: string };
const rows: Row[] = [
	{ id: '1', name: 'Alice' },
	{ id: '2', name: 'Bob' },
];
const cols = [ColumnHelpers.text<Row>('name', 'Name')];
const expansion = { $type: 'Detail' };
const renderNode = (_node: Record<string, unknown>, ctx: Record<string, unknown>) => (
	<span data-testid="panel">{(ctx['row'] as Row).name}</span>
);

describe('DataTable expansion toggle accessibility', () => {
	it('every row has a named toggle, collapsed by default (default English names)', () => {
		render(<DataTable rows={rows} columns={cols} expansion={expansion} renderNode={renderNode} />);

		const toggles = screen.getAllByRole('button', { name: 'Expand row' });
		expect(toggles).toHaveLength(2);
		for (const toggle of toggles) {
			expect(toggle).toHaveAttribute('aria-expanded', 'false');
			expect(toggle).not.toHaveAttribute('aria-controls');
		}
	});

	it('expanding a row flips only that row: name, aria-expanded and aria-controls pointing at the panel that exists', () => {
		render(<DataTable rows={rows} columns={cols} expansion={expansion} renderNode={renderNode} />);
		const [first, second] = screen.getAllByRole('button', { name: 'Expand row' }) as [HTMLElement, HTMLElement];

		fireEvent.click(second);

		expect(second).toHaveAccessibleName('Collapse row');
		expect(second).toHaveAttribute('aria-expanded', 'true');
		expect(first).toHaveAccessibleName('Expand row');
		expect(first).toHaveAttribute('aria-expanded', 'false');
		const panelId = second.getAttribute('aria-controls');
		expect(panelId).toBeTruthy();
		expect(document.getElementById(panelId!)).toContainElement(screen.getByTestId('panel'));
		expect(screen.getByTestId('panel')).toHaveTextContent('Bob');
	});

	it('collapsing again restores the collapsed state and drops aria-controls', () => {
		render(<DataTable rows={rows} columns={cols} expansion={expansion} renderNode={renderNode} />);
		const toggle = screen.getAllByRole('button', { name: 'Expand row' })[0]!;

		fireEvent.click(toggle);
		fireEvent.click(screen.getByRole('button', { name: 'Collapse row' }));

		expect(toggle).toHaveAccessibleName('Expand row');
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(toggle).not.toHaveAttribute('aria-controls');
		expect(screen.queryByTestId('panel')).toBeNull();
	});

	it('expandLabel and collapseLabel replace the names (translation)', () => {
		render(<DataTable rows={rows} columns={cols} expansion={expansion} renderNode={renderNode} expandLabel="Afficher le detail" collapseLabel="Masquer le detail" />);

		const toggle = screen.getAllByRole('button', { name: 'Afficher le detail' })[0]!;
		fireEvent.click(toggle);

		expect(toggle).toHaveAccessibleName('Masquer le detail');
		expect(screen.queryByRole('button', { name: 'Expand row' })).toBeNull();
		expect(screen.getByRole('button', { name: 'Afficher le detail' })).toHaveAttribute('aria-expanded', 'false');
	});

	it('two tables on a page never share a panel id', () => {
		render(
			<>
				<DataTable rows={[rows[0]!]} columns={cols} expansion={expansion} renderNode={renderNode} />
				<DataTable rows={[rows[0]!]} columns={cols} expansion={expansion} renderNode={renderNode} />
			</>
		);
		for (const toggle of screen.getAllByRole('button', { name: 'Expand row' })) {
			fireEvent.click(toggle);
		}

		const ids = screen.getAllByRole('button', { name: 'Collapse row' }).map(toggle => toggle.getAttribute('aria-controls'));
		expect(new Set(ids).size).toBe(2);
	});

	it('a row without expansionCondition has no toggle at all (nothing to name)', () => {
		type E = { id: string; name: string; hasDetail: boolean };
		const data: E[] = [{ id: '1', name: 'A', hasDetail: true }, { id: '2', name: 'B', hasDetail: false }];

		render(<DataTable<E> rows={data} columns={[ColumnHelpers.text<E>('name', 'Name')]} expansion={expansion} renderNode={renderNode as never} expansionCondition="hasDetail" />);

		expect(screen.getAllByRole('button', { name: 'Expand row' })).toHaveLength(1);
	});
});
