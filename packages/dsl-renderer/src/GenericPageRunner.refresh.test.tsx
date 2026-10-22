import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { renderChildren, resolveExpressionValue } from './engine/DslRenderer.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { NotifierProvider } from './notifier.js';

// Stand-ins shaped like the generated entries: RefreshButton.onRefresh defaults to ctx.$refresh (@ctxDefault),
// Rows shows what each source returned and whether the page is mid-refetch ($refreshing).
const RefreshEntry: ComponentRegistryEntry = {
	name: 'Refresh',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const onRefresh = (resolveExpressionValue(node['onRefresh'], ctx) ?? ctx['$refresh']) as (source?: string) => Promise<void>;
		const source = node['source'] as string | undefined;
		return <button onClick={() => void onRefresh(source)}>{`refresh-${source ?? 'all'}`}</button>;
	},
};
const RowsEntry: ComponentRegistryEntry = {
	name: 'Rows',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const value = resolveExpressionValue(node['value'], ctx);
		return (
			<div>
				<span data-testid={`value-${String(node['name'])}`}>{value === undefined ? '-' : String(value)}</span>
				<span data-testid="refreshing">{String(ctx['$refreshing'] === true)}</span>
			</div>
		);
	},
};
const StackEntry: ComponentRegistryEntry = {
	name: 'Stack',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx, registry }) => <div>{renderChildren(node['items'] as unknown[], registry, ctx)}</div>,
};

const registry = createRegistry([RefreshEntry, RowsEntry, StackEntry]);

const PAGE = `
$sources:
  history:
    url: GET /api/history
  stats:
    url: GET /api/stats
$type: Stack
items:
  - $type: Refresh
    source: history
  - $type: Refresh
  - $type: Refresh
    source: nope
  - $type: Rows
    name: history
    value: $sources.history.n
  - $type: Rows
    name: stats
    value: $sources.stats.n
`;

/** A fetcher answering with an incrementing counter per URL, so a re-fetch is visible in the rendered value. */
function countingFetcher() {
	const counts: Record<string, number> = {};
	const fetcher = vi.fn(async (url: string) => {
		counts[url] = (counts[url] ?? 0) + 1;
		return { n: counts[url] };
	});
	return { fetcher, counts };
}

function renderPage(fetcher: ReturnType<typeof vi.fn>, notify?: (n: unknown) => void) {
	const page = (
		<GenericPageRunner yamlText={PAGE} registry={registry} fetcher={fetcher} brainRegistry={{}} />
	);
	return render(<MemoryRouter>{notify ? <NotifierProvider notify={notify}>{page}</NotifierProvider> : page}</MemoryRouter>);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GenericPageRunner $refresh (RefreshButton)', () => {
	it('re-fetches exactly the named source, leaving the others untouched', async () => {
		const { fetcher, counts } = countingFetcher();
		renderPage(fetcher);
		await waitFor(() => expect(screen.getByTestId('value-history')).toHaveTextContent('1'));
		expect(fetcher).toHaveBeenCalledTimes(2);

		fireEvent.click(screen.getByText('refresh-history'));

		await waitFor(() => expect(screen.getByTestId('value-history')).toHaveTextContent('2'));
		expect(counts['GET /api/history']).toBe(2);
		expect(counts['GET /api/stats']).toBe(1);
		expect(fetcher).toHaveBeenCalledTimes(3);
		expect(screen.getByTestId('value-stats')).toHaveTextContent('1');
	});

	it('without a source re-fetches every source of the page', async () => {
		const { fetcher, counts } = countingFetcher();
		renderPage(fetcher);
		await waitFor(() => expect(screen.getByTestId('value-stats')).toHaveTextContent('1'));

		fireEvent.click(screen.getByText('refresh-all'));

		await waitFor(() => expect(screen.getByTestId('value-stats')).toHaveTextContent('2'));
		expect(counts['GET /api/history']).toBe(2);
		expect(counts['GET /api/stats']).toBe(2);
	});

	it('keeps the previous value on screen while the refresh is in flight (no blank, no initial-loading again)', async () => {
		let release!: (value: unknown) => void;
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce({ n: 1 })
			.mockResolvedValueOnce({ n: 1 })
			.mockImplementationOnce(() => new Promise(res => (release = res)));
		renderPage(fetcher);
		await waitFor(() => expect(screen.getByTestId('value-history')).toHaveTextContent('1'));

		fireEvent.click(screen.getByText('refresh-history'));

		await waitFor(() => expect(screen.getAllByTestId('refreshing')[0]).toHaveTextContent('true'));
		expect(screen.getByTestId('value-history')).toHaveTextContent('1');

		release({ n: 2 });
		await waitFor(() => expect(screen.getByTestId('value-history')).toHaveTextContent('2'));
		await waitFor(() => expect(screen.getAllByTestId('refreshing')[0]).toHaveTextContent('false'));
	});

	it('reports an unknown source through the notifier, naming the sources the page has, without fetching', async () => {
		const { fetcher } = countingFetcher();
		const notify = vi.fn();
		renderPage(fetcher, notify);
		await waitFor(() => expect(screen.getByTestId('value-history')).toHaveTextContent('1'));

		fireEvent.click(screen.getByText('refresh-nope'));

		await waitFor(() =>
			expect(notify).toHaveBeenCalledWith({
				kind: 'error',
				message: 'Cannot refresh unknown source "nope". This page has: history, stats.',
			})
		);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('reports a failed refresh through the notifier every time and keeps the old data', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failure = Object.assign(new Error('Daemon is not running'), { status: 503 });
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce({ n: 1 })
			.mockResolvedValueOnce({ n: 1 })
			.mockRejectedValue(failure);
		const notify = vi.fn();
		renderPage(fetcher, notify);
		await waitFor(() => expect(screen.getByTestId('value-history')).toHaveTextContent('1'));

		fireEvent.click(screen.getByText('refresh-history'));
		await waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
		fireEvent.click(screen.getByText('refresh-history'));
		await waitFor(() => expect(notify).toHaveBeenCalledTimes(2));

		expect(notify).toHaveBeenLastCalledWith({ kind: 'error', message: 'Could not load the data: Daemon is not running', status: 503 });
		expect(screen.getByTestId('value-history')).toHaveTextContent('1');
	});
});
