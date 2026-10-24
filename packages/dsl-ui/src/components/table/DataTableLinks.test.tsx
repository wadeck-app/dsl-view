import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DATA_TABLE_LINK_COLUMN_KEYS, DataTable } from './DataTable.js';
import type { TableColumn } from './DataTable.js';
import { ICON_NAMES } from '../display/iconByName.js';

type Row = Record<string, unknown>;

const yamlColumns = (cols: Array<Record<string, unknown>>) => cols as unknown as TableColumn<Row>[];

function Where() {
	const loc = useLocation();
	return <output data-testid="where">{loc.pathname + loc.search}</output>;
}

function renderTable(columns: Array<Record<string, unknown>>, rows: Row[], extra: Record<string, unknown> = {}) {
	return render(
		<MemoryRouter>
			<DataTable rows={rows} columns={yamlColumns(columns)} loading={false} {...extra} />
			<Where />
		</MemoryRouter>
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('DataTable link column (type: link)', () => {
	const rows: Row[] = [
		{ id: 'r1', executionId: 'ex 1/a', state: 'ok' },
		{ id: 'r2', executionId: 'ex2', state: 'ko' },
	];

	it('renders an icon-only router link per row, named by its label, with the encoded target', () => {
		renderTable([{ field: 'state', label: 'State' }, { type: 'link', to: '/modules/flow/executions/{executionId}', icon: 'external-link', label: 'Open details' }], rows);
		const links = screen.getAllByRole('link', { name: 'Open details' });
		expect(links).toHaveLength(2);
		expect(links[0]).toHaveAttribute('href', '/modules/flow/executions/ex%201%2Fa');
		expect(links[1]).toHaveAttribute('href', '/modules/flow/executions/ex2');
		expect(links[0]).toHaveAttribute('title', 'Open details');
		// Icon only: the visible text is empty, the name comes from aria-label.
		expect(links[0]).toHaveTextContent('');
		expect(links[0]!.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
	});

	it('navigates client-side on click and does not trigger the row click', () => {
		const onRowClick = vi.fn();
		renderTable([{ type: 'link', to: '/runs/{id}', label: 'Open' }], rows, { onRowClick });
		const link = screen.getAllByRole('link', { name: 'Open' })[1]!;
		// false: the default action (a full navigation) was prevented by the router.
		expect(fireEvent.click(link)).toBe(false);
		expect(screen.getByTestId('where')).toHaveTextContent('/runs/r2');
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('keeps rows non-clickable: the link is the only interactive element a row gets', () => {
		renderTable([{ type: 'link', to: '/runs/{id}', label: 'Open' }], rows);
		const bodyRows = screen.getAllByRole('row').slice(1);
		for (const row of bodyRows) {
			expect(within(row).getAllByRole('link')).toHaveLength(1);
			expect(within(row).queryByRole('button')).toBeNull();
		}
	});

	it('puts a position: start link first (right after the expansion chevron), others keep their order', () => {
		renderTable(
			[{ field: 'state', label: 'State' }, { type: 'link', to: '/runs/{id}', label: 'Open', position: 'start' }, { field: 'id', label: 'Id' }],
			[rows[0]!],
			{ expansion: { $type: 'Label', label: 'x' }, renderNode: () => null }
		);
		const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell');
		// chevron cell, then the link, then State and Id.
		expect(within(cells[0]!).getByRole('button')).toBeInTheDocument();
		expect(within(cells[1]!).getByRole('link', { name: 'Open' })).toBeInTheDocument();
		expect(cells[2]).toHaveTextContent('ok');
		expect(cells[3]).toHaveTextContent('r1');
		const headers = screen.getAllByRole('columnheader').map(h => h.textContent);
		expect(headers).toEqual(['', 'Open', 'State', 'Id']);
	});

	it('keeps the declared place for position: end (default)', () => {
		renderTable([{ field: 'state', label: 'State' }, { type: 'link', to: '/runs/{id}', label: 'Open' }], [rows[0]!]);
		const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell');
		expect(cells[0]).toHaveTextContent('ok');
		expect(within(cells[1]!).getByRole('link', { name: 'Open' })).toBeInTheDocument();
	});

	it('exposes the label to assistive technology in the header, not on screen', () => {
		renderTable([{ type: 'link', to: '/runs/{id}', label: 'Open details' }], [rows[0]!]);
		const header = screen.getByRole('columnheader', { name: 'Open details' });
		expect(header.querySelector('.sr-only')).toHaveTextContent('Open details');
	});

	it('shows no link and logs once when a row lacks the placeholder value', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderTable([{ type: 'link', to: '/missing-probe/{nope}', label: 'Open' }], rows);
		expect(screen.queryByRole('link')).toBeNull();
		const messages = error.mock.calls.map(c => String(c[0]));
		expect(messages.filter(m => m.includes('link not rendered'))).toHaveLength(1);
		expect(messages.join('\n')).toContain('{nope}');
		expect(messages.join('\n')).toContain('row keys: executionId, id, state');
	});

	it('logs an error for a missing label and a missing target, and for an unknown icon', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderTable([{ type: 'link', icon: 'no-such-icon-probe' }], [rows[0]!]);
		const messages = error.mock.calls.map(c => String(c[0])).join('\n');
		expect(messages).toContain('needs `to`');
		expect(messages).toContain('needs a `label`');
		expect(messages).toContain('unknown icon "no-such-icon-probe"');
		expect(messages).toContain(ICON_NAMES.join(', '));
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('rejects a target that is not an app path instead of rendering a dangerous anchor', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderTable([{ type: 'link', to: '{url}', label: 'Open' }], [{ id: 'x', url: 'javascript:alert(1)' }]);
		expect(screen.queryByRole('link')).toBeNull();
		expect(error.mock.calls.map(c => String(c[0])).join('\n')).toMatch(/absolute app path|link not rendered/);
	});

	it('supports an external target in a new tab', () => {
		renderTable([{ type: 'link', to: 'https://example.com/{id}', label: 'Docs', external: true }], [rows[0]!]);
		const link = screen.getByRole('link', { name: 'Docs' });
		expect(link).toHaveAttribute('href', 'https://example.com/r1');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('warns about an unsupported key on a link column with the keys it supports', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderTable([{ type: 'link', to: '/x', label: 'Open', bogusLinkKeyProbe: true }], [rows[0]!]);
		const text = error.mock.calls.map(c => String(c[0])).join('\n');
		expect(text).toContain('unknown key "bogusLinkKeyProbe"');
		expect(text).toContain(`Supported keys for a link column: ${[...DATA_TABLE_LINK_COLUMN_KEYS].sort().join(', ')}`);
	});
});

describe('DataTable data column href', () => {
	const rows: Row[] = [
		{ id: '1', event: 'order.created', count: 7 },
		{ id: '2', event: 'a b', count: 0 },
	];

	it('renders the cell value as a link to the filled, encoded template', () => {
		renderTable([{ field: 'event', label: 'Event', href: '/modules/queue/history?event={event}' }, { field: 'count', label: 'Count' }], rows);
		const first = screen.getByRole('link', { name: 'order.created' });
		expect(first).toHaveAttribute('href', '/modules/queue/history?event=order.created');
		expect(screen.getByRole('link', { name: 'a b' })).toHaveAttribute('href', '/modules/queue/history?event=a%20b');
		expect(screen.queryByRole('link', { name: '7' })).toBeNull();
		fireEvent.click(first);
		expect(screen.getByTestId('where')).toHaveTextContent('/modules/queue/history?event=order.created');
	});

	it('links the formatted value too (badge, format)', () => {
		renderTable([{ field: 'event', label: 'Event', href: '/h?e={event}', badge: { 'order.created': 'success' } }], [rows[0]!]);
		const link = screen.getByRole('link', { name: 'order.created' });
		expect(link.textContent).toBe('order.created');
	});

	it('shows the plain value and logs once when the row has no value for a placeholder', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderTable([{ field: 'event', label: 'Event', href: '/h?x={absentProbe}' }], rows);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText('order.created')).toBeInTheDocument();
		expect(error.mock.calls.map(c => String(c[0])).filter(m => m.includes('href ignored'))).toHaveLength(1);
	});

	it('does not break a column without href', () => {
		renderTable([{ field: 'event', label: 'Event' }], [rows[0]!]);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText('order.created')).toBeInTheDocument();
	});
});
