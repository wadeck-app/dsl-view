import { render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { resolveExpressionValue } from './engine/DslRenderer.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { NotifierProvider } from './notifier.js';

// Stand-in for a table whose `loading` follows the page (@ctxDefault $initialLoading), like the generated DataTable entry:
// loading -> a loading message, never the empty message; loaded and empty -> the empty message.
const TableEntry: ComponentRegistryEntry = {
	name: 'Table',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const loading = (node['loading'] as boolean | undefined) ?? (ctx['$initialLoading'] as boolean | undefined) ?? false;
		const rows = (resolveExpressionValue(node['rows'], ctx) as unknown[] | undefined) ?? [];
		if (loading) {
			return <div role="status">Loading...</div>;
		}
		return rows.length === 0 ? <div>No items</div> : <div>{`${rows.length} rows`}</div>;
	},
};

const registry = createRegistry([TableEntry]);

const PAGE = `
$sources:
  history:
    url: GET /api/history
$type: Table
rows: $sources.history.entries
`;

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function renderPage(fetcher: ReturnType<typeof vi.fn>, yaml = PAGE) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} />
		</MemoryRouter>
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GenericPageRunner loading vs empty', () => {
	it('shows loading, never the empty message, while the first load is pending; then the data', async () => {
		const pending = deferred<unknown>();
		renderPage(vi.fn().mockReturnValue(pending.promise));

		expect(screen.getByRole('status')).toHaveTextContent('Loading...');
		expect(screen.queryByText('No items')).toBeNull();

		await act(async () => {
			pending.resolve({ entries: [{ id: 1 }, { id: 2 }] });
		});

		expect(await screen.findByText('2 rows')).toBeInTheDocument();
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('shows the empty message only once the load really returned nothing', async () => {
		const pending = deferred<unknown>();
		renderPage(vi.fn().mockReturnValue(pending.promise));
		expect(screen.queryByText('No items')).toBeNull();

		await act(async () => {
			pending.resolve({ entries: [] });
		});

		expect(await screen.findByText('No items')).toBeInTheDocument();
	});

	it('keeps the previous data (no loading state) while a later load is in flight', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			const second = deferred<unknown>();
			const fetcher = vi
				.fn()
				.mockResolvedValueOnce({ entries: [{ id: 1 }] })
				.mockReturnValueOnce(second.promise);
			renderPage(
				fetcher,
				`
$sources:
  history:
    url: GET /api/history
    poll: 1s
$type: Table
rows: $sources.history.entries
`
			);
			expect(await screen.findByText('1 rows')).toBeInTheDocument();

			await act(async () => {
				await vi.advanceTimersByTimeAsync(1100);
			});

			// The poll is in flight: the rows stay, no skeleton replaces them and no empty message appears.
			expect(fetcher).toHaveBeenCalledTimes(2);
			expect(screen.getByText('1 rows')).toBeInTheDocument();
			expect(screen.queryByRole('status')).toBeNull();
			expect(screen.queryByText('No items')).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it('reports a failed first load through the notifier, and stops saying "loading"', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failure = Object.assign(new Error('Daemon is not running -- start it with `queue start`'), { status: 503 });
		const notify = vi.fn();
		render(
			<MemoryRouter>
				<NotifierProvider notify={notify}>
					<GenericPageRunner yamlText={PAGE} registry={registry} fetcher={vi.fn().mockRejectedValue(failure)} brainRegistry={{}} />
				</NotifierProvider>
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(notify).toHaveBeenCalledWith({
				kind: 'error',
				message: 'Could not load the data: Daemon is not running -- start it with `queue start`',
				status: 503,
			});
		});
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('shows the failure in the inline banner when the host has no notifier', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderPage(vi.fn().mockRejectedValue(new Error('boom')));

		expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the data: boom');
	});

	it('does not repeat the same load error on every poll tick', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		try {
			const notify = vi.fn();
			render(
				<MemoryRouter>
					<NotifierProvider notify={notify}>
						<GenericPageRunner
							yamlText={`
$sources:
  history:
    url: GET /api/history
    poll: 1s
$type: Table
rows: $sources.history.entries
`}
							registry={registry}
							fetcher={vi.fn().mockRejectedValue(new Error('down'))}
							brainRegistry={{}}
						/>
					</NotifierProvider>
				</MemoryRouter>
			);
			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});
			expect(notify).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});
});
