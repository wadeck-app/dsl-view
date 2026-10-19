import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';

// Stand-in for DataTable's row action buttons: like the generated entry, it takes the page's
// ctx.onAction / ctx.onBatchAction (@ctxDefault) and calls them WITHOUT awaiting, as DataTable does.
const RowTableEntry: ComponentRegistryEntry = {
	name: 'RowTable',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const onAction = ctx['onAction'] as (action: string, row: Record<string, unknown>) => void;
		const onBatchAction = ctx['onBatchAction'] as (action: string, rows: Record<string, unknown>[]) => void;
		const rows = node['rows'] as Record<string, unknown>[];
		const action = node['action'] as string;
		return (
			<div>
				{rows.map((row, i) => (
					<button key={i} onClick={() => onAction(action, row)}>
						{`run-${i}`}
					</button>
				))}
				<button onClick={() => onBatchAction(action, rows)}>batch</button>
			</div>
		);
	},
};

const registry = createRegistry([RowTableEntry]);

function renderPage(yaml: string, fetcher = vi.fn().mockResolvedValue({}), onActionError?: (e: Error, i: unknown) => void) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} onActionError={onActionError} />
		</MemoryRouter>
	);
}

const PAGE = (url: string, rows: string) => `
$actions:
  clearEntry:
    url: "${url}"
    confirm: "Sure?"
$type: RowTable
action: clearEntry
rows: ${rows}
`;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GenericPageRunner row actions', () => {
	it('interpolates {id} from the clicked row into the url before calling the fetcher', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const fetcher = vi.fn().mockResolvedValue({});
		renderPage(PAGE('POST /api/dlq/{id}/clear', '[{id: "a-1"}, {id: "b-2"}]'), fetcher);

		fireEvent.click(screen.getByText('run-1'));

		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledWith('POST /api/dlq/b-2/clear', { id: 'b-2' }, undefined, undefined);
		});
	});

	it('percent-encodes substituted values so a row value cannot add path segments', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const fetcher = vi.fn().mockResolvedValue({});
		renderPage(PAGE('POST /api/dlq/{id}/clear', '[{id: "a/b?c"}]'), fetcher);

		fireEvent.click(screen.getByText('run-0'));

		await waitFor(() => {
			expect(fetcher).toHaveBeenCalledWith('POST /api/dlq/a%2Fb%3Fc/clear', expect.anything(), undefined, undefined);
		});
	});

	it('does not call the fetcher when the confirm is declined', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		const fetcher = vi.fn().mockResolvedValue({});
		renderPage(PAGE('POST /api/dlq/{id}/clear', '[{id: "a-1"}]'), fetcher);

		fireEvent.click(screen.getByText('run-0'));
		await Promise.resolve();

		expect(window.confirm).toHaveBeenCalledWith('Sure?');
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('fails loudly (no request, named error) when a placeholder has no value in the row', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetcher = vi.fn().mockResolvedValue({});
		const onActionError = vi.fn();
		renderPage(PAGE('POST /api/dlq/{entryId}/clear', '[{id: "a-1"}]'), fetcher, onActionError);

		fireEvent.click(screen.getByText('run-0'));

		await waitFor(() => expect(onActionError).toHaveBeenCalledTimes(1));
		const [error, info] = onActionError.mock.calls[0]!;
		expect((error as Error).message).toContain('action "clearEntry"');
		expect((error as Error).message).toContain('{entryId}');
		expect((error as Error).message).toContain('row keys: id');
		expect(info).toEqual({ action: 'clearEntry', kind: 'row' });
		expect(fetcher).not.toHaveBeenCalled();
		expect(errorSpy).toHaveBeenCalled();
	});

	it('reports a failing request through onActionError and console.error instead of an unhandled rejection', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetcher = vi.fn().mockRejectedValue(new Error('POST /api/dlq/a-1/clear -> 503'));
		const onActionError = vi.fn();
		renderPage(PAGE('POST /api/dlq/{id}/clear', '[{id: "a-1"}]'), fetcher, onActionError);

		fireEvent.click(screen.getByText('run-0'));

		await waitFor(() => expect(onActionError).toHaveBeenCalledTimes(1));
		expect((onActionError.mock.calls[0]![0] as Error).message).toContain('503');
		expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('row action "clearEntry" failed'));
	});

	it('reports a failing batch action the same way', async () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
		const onActionError = vi.fn();
		renderPage(PAGE('POST /api/dlq/{id}/clear', '[{id: "a-1"}]'), fetcher, onActionError);

		fireEvent.click(screen.getByText('batch'));

		await waitFor(() => expect(onActionError).toHaveBeenCalledTimes(1));
		expect(onActionError.mock.calls[0]![1]).toEqual({ action: 'clearEntry', kind: 'batch' });
		expect(errorSpy).toHaveBeenCalled();
	});
});
