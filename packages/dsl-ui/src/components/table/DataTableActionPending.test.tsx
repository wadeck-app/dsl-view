// Workspace build of the renderer, not '@wadeck-app/dsl-renderer': dsl-ui/node_modules holds an old PUBLISHED copy
// that predates `$actionPending` (same reason as scripts/generate-known-keys.ts). Needs `npm run build` in dsl-renderer.
// violations-suppress-start: ts/no-cross-package-relative the alias resolves to an old published copy here
// violations-suppress-start: ts/no-deep-relative same reason: the workspace build is only reachable by path
import { createRegistry, GenericPageRunner, resolveExpressionValue } from '../../../../dsl-renderer/dist/index.js';
// violations-suppress-end: ts/no-deep-relative
// violations-suppress-end: ts/no-cross-package-relative
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable.js';
import type { TableColumn } from './DataTable.js';

type Row = Record<string, unknown>;
type Deferred = { promise: Promise<unknown>; resolve: (v: unknown) => void; reject: (e: Error) => void };

function deferred(): Deferred {
	let resolve!: (v: unknown) => void;
	let reject!: (e: Error) => void;
	const promise = new Promise<unknown>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

// Stands for the generated DataTable registry entry: every prop is resolved from the node, and the ones tagged
// @ctxDefault fall back to the page ctx exactly as `entriesGenerator` emits it (the generated text itself is
// asserted in generatedEntries.typecheck.test.ts, so this stand-in cannot drift unnoticed).
const registry = createRegistry([
	{
		name: 'DataTable',
		category: 'atomic',
		tags: [],
		render: ({ node, ctx }) => (
			<DataTable
				rows={resolveExpressionValue(node['rows'], ctx) as Row[]}
				columns={node['columns'] as TableColumn<Row>[]}
				selectable={node['selectable'] === true}
				batchActions={node['batchActions'] as { label: string; action: string }[] | undefined}
				onAction={(resolveExpressionValue(node['onAction'], ctx) ?? ctx['onAction']) as (a: string, r: Row) => void}
				onBatchAction={(resolveExpressionValue(node['onBatchAction'], ctx) ?? ctx['onBatchAction']) as (a: string, r: Row[]) => void}
				actionPending={(resolveExpressionValue(node['actionPending'], ctx) ?? ctx['$actionPending']) as Record<string, boolean> | undefined}
			/>
		),
	},
]);

const PAGE = `
$actions:
  clearEntry:
    url: "POST /api/dlq/{id}/clear"
    confirm: "Sure?"
  keepEntry:
    url: "POST /api/dlq/{id}/keep"
$type: DataTable
selectable: true
batchActions:
  - label: Clear all
    action: clearEntry
rows: [{id: "a-1"}, {id: "b-2"}]
columns:
  - field: id
    label: Id
  - type: actions
    items:
      - label: Clear
        action: clearEntry
      - label: Keep
        action: keepEntry
`;

type Fetcher = (url: string, params?: Record<string, string>, body?: unknown, headers?: Record<string, string>) => Promise<unknown>;

function renderPage(fetcher: Fetcher) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={PAGE} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('DataTable action buttons while their action runs (through a real GenericPageRunner)', () => {
	// Row actions without an icon fall back to text buttons and warn once per render, which is noise here.
	function quiet() {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(window, 'confirm').mockReturnValue(true);
	}

	it('disables and marks busy the clicked action everywhere, leaves other actions alone, and re-enables when done', async () => {
		quiet();
		const call = deferred();
		const fetcher = vi.fn().mockReturnValue(call.promise);
		renderPage(fetcher);

		const clear = () => screen.getAllByRole('button', { name: 'Clear' });
		const keep = () => screen.getAllByRole('button', { name: 'Keep' });
		expect(clear()[0]).toBeEnabled();

		fireEvent.click(clear()[0]!);

		await waitFor(() => expect(clear()[0]).toBeDisabled());
		expect(fetcher).toHaveBeenCalledTimes(1);
		// Per action NAME, not per row: the other row's Clear is busy too, other actions are untouched.
		expect(clear()[1]).toBeDisabled();
		expect(clear()[0]).toHaveAttribute('aria-busy', 'true');
		expect(keep()[0]).toBeEnabled();
		expect(keep()[0]).not.toHaveAttribute('aria-busy');

		call.resolve({});
		await waitFor(() => expect(clear()[0]).toBeEnabled());
		expect(clear()[0]).not.toHaveAttribute('aria-busy');
	});

	it('re-enables the button when the action fails (no stuck button)', async () => {
		quiet();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const call = deferred();
		const fetcher = vi.fn().mockReturnValue(call.promise);
		renderPage(fetcher);

		fireEvent.click(screen.getAllByRole('button', { name: 'Clear' })[0]!);
		await waitFor(() => expect(screen.getAllByRole('button', { name: 'Clear' })[0]).toBeDisabled());

		call.reject(new Error('Daemon is not running'));
		await waitFor(() => expect(screen.getAllByRole('button', { name: 'Clear' })[0]).toBeEnabled());
	});

	it('also busies the batch button of the running action', async () => {
		quiet();
		const call = deferred();
		const fetcher = vi.fn().mockReturnValue(call.promise);
		renderPage(fetcher);

		// Select both rows, then run the batch action: the batch bar clears the selection on click, so the
		// per-row Clear (same action name) is the observable proof that the pending flag reached the table.
		fireEvent.click(screen.getAllByRole('checkbox')[0]!);
		fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

		await waitFor(() => expect(screen.getAllByRole('button', { name: 'Clear' })[0]).toBeDisabled());
		call.resolve({});
		await waitFor(() => expect(screen.getAllByRole('button', { name: 'Clear' })[0]).toBeEnabled());
	});
});

describe('DataTable actionPending prop', () => {
	it('marks a batch button busy and disabled while its action is pending', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const rows: Row[] = [{ id: 'a-1' }];
		render(
			<DataTable
				rows={rows}
				columns={[{ key: 'id', label: 'Id', render: (r: Row) => String(r['id']) } as unknown as TableColumn<Row>]}
				selectable
				batchActions={[{ label: 'Clear all', action: 'clearEntry' }]}
				actionPending={{ clearEntry: true }}
			/>
		);
		fireEvent.click(screen.getAllByRole('checkbox')[1]!);
		const batch = screen.getByRole('button', { name: /Clear all/ });
		expect(batch).toBeDisabled();
		expect(batch).toHaveAttribute('aria-busy', 'true');
	});

	it('replaces the icon of an icon-only row button with a spinner and disables it', () => {
		const rows: Row[] = [{ id: 'a-1' }];
		render(
			<DataTable
				rows={rows}
				columns={
					[
						{ key: 'id', label: 'Id', render: (r: Row) => String(r['id']) },
						{ key: '_actions', label: '', isActions: true, actions: [{ label: 'Remove', action: 'remove', icon: <span data-testid="icon" /> }] },
					] as unknown as TableColumn<Row>[]
				}
				actionPending={{ remove: true }}
			/>
		);
		const button = screen.getByRole('button', { name: 'Remove' });
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('aria-busy', 'true');
		expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
	});
});
