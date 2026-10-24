import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

import type { ComponentRegistryEntry, RegistryRenderProps } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';

// violations-suppress-start: react/no-raw-button test stand-in for the generated DataTable / Form entries; dsl-renderer cannot import dsl-ui's Button
// One probe for every action path: a named handler (form submit), a row action and a batch action, plus read-outs of the
// ctx values the runner exposes (sources, extras, pending flags).
function Probe({ node, ctx }: RegistryRenderProps) {
	const [result, setResult] = React.useState<string>('(none)');
	const handler = ctx[node['handler'] as string] as ((body?: Record<string, unknown>) => Promise<unknown>) | undefined;
	const onAction = ctx['onAction'] as (action: string, row: Record<string, unknown>) => Promise<void>;
	const onBatchAction = ctx['onBatchAction'] as (action: string, rows: Record<string, unknown>[]) => Promise<void>;
	const action = (node['action'] as string | undefined) ?? (node['handler'] as string);
	const body = node['body'] as Record<string, unknown> | undefined;
	const row = (node['row'] as Record<string, unknown> | undefined) ?? { id: 'r1' };
	const resultKey = node['resultKey'] as string | undefined;
	return (
		<div>
			<button onClick={() => void handler?.(body).then(r => setResult(JSON.stringify(r ?? null)), () => setResult('rejected'))}>form</button>
			<button onClick={() => void onAction(action, row)}>row</button>
			<button onClick={() => void onAction(action, { id: 'r2' })}>row-b</button>
			<button onClick={() => void onAction('nope', row)}>row-unknown</button>
			<button onClick={() => void onBatchAction(action, [{ id: 'b1' }, { id: 'b2' }])}>batch</button>
			<button onClick={() => void onBatchAction('nope', [])}>batch-unknown</button>
			<span data-testid="result">{result}</span>
			<span data-testid="items">{JSON.stringify(ctx['items'] ?? null)}</span>
			<span data-testid="other">{JSON.stringify(ctx['other'] ?? null)}</span>
			<span data-testid="extra">{resultKey ? JSON.stringify(ctx[resultKey] ?? null) : ''}</span>
			<span data-testid="loading">{String(ctx['loading'])}</span>
			<span data-testid="refreshing">{String(ctx['$refreshing'])}</span>
			<span data-testid="has-undefined-key">{String('undefined' in ctx)}</span>
			<span data-testid="pending">{JSON.stringify(ctx['$actionPending'])}</span>
			<span data-testid="pending-rows">{JSON.stringify(ctx['$actionPendingRows'])}</span>
		</div>
	);
}
// violations-suppress-end

const ProbeEntry: ComponentRegistryEntry = { name: 'Probe', category: 'atomic', tags: [], render: props => <Probe {...props} /> };
const registry = createRegistry([ProbeEntry]);

interface Calls {
	all: string[];
	items: number;
	other: number;
}

// Source GETs answer with a counter so a refetch is visible in the rendered data; everything else answers `reply`.
function makeFetcher(reply: unknown = {}) {
	const calls: Calls = { all: [], items: 0, other: 0 };
	const fetcher = vi.fn(async (url: string) => {
		calls.all.push(url);
		if (url === 'GET /api/items') {
			calls.items += 1;
			return [{ n: calls.items }];
		}
		if (url === 'GET /api/other') {
			calls.other += 1;
			return [{ n: calls.other }];
		}
		return reply;
	});
	return { fetcher, calls };
}

function renderPage(yaml: string, opts: { fetcher?: ReturnType<typeof makeFetcher>['fetcher']; entry?: string; routePath?: string } = {}) {
	const fetcher = opts.fetcher ?? makeFetcher().fetcher;
	const runner = <GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} />;
	render(
		<MemoryRouter initialEntries={[opts.entry ?? '/']}>
			{opts.routePath ? (
				<Routes>
					<Route path={opts.routePath} element={runner} />
				</Routes>
			) : (
				runner
			)}
		</MemoryRouter>
	);
	return { fetcher };
}

const SOURCES = `
$sources:
  items:
    url: GET /api/items
    cache: 5m
  other:
    url: GET /api/other
    cache: 5m
`;

// Used before asserting that something did NOT happen: one macrotask turn lets every pending promise
// continuation run first, so a late fetch or notification cannot slip in after the assertion.
async function settle() {
	await act(async () => {
		await new Promise<void>(resolve => setTimeout(resolve, 0));
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('named handler: confirm, body and return value', () => {
	const PAGE = (extra: string, body = '') => `
$actions:
  save:
    url: "POST /api/save"
${extra}
$type: Probe
handler: save
${body}
`;

	it('does nothing when the confirm is declined, and asks with the configured message', async () => {
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const { fetcher } = renderPage(PAGE('    confirm: "Really?"'));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('null'));
		expect(confirm).toHaveBeenCalledWith('Really?');
		expect(fetcher).not.toHaveBeenCalled();
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('does not ask for a confirmation when the action declares none', async () => {
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const { fetcher } = renderPage(PAGE(''));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(confirm).not.toHaveBeenCalled();
	});

	it('sends the form data as the body, resolves with the server result, and sends no body for empty data', async () => {
		const { fetcher } = renderPage(PAGE('', 'body: {name: "x"}'), { fetcher: makeFetcher({ ok: 1 }).fetcher });
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('{"ok":1}'));
		expect(fetcher).toHaveBeenCalledWith('POST /api/save', undefined, { name: 'x' }, undefined);
	});

	it('sends no body (undefined, not {}) when the form data is empty', async () => {
		const { fetcher } = renderPage(PAGE('', 'body: {}'));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		expect(fetcher).toHaveBeenCalledWith('POST /api/save', undefined, undefined, undefined);
	});

	it('rejects to the caller after reporting the failure, and frees the action for a retry', async () => {
		const fetcher = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue({});
		renderPage(PAGE(''), { fetcher: fetcher as never });
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('rejected'));
		expect(screen.getByRole('alert').textContent).toContain('boom');
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
	});
});

describe('named handler: URL placeholders come from route, then query string, then form data', () => {
	const PAGE = (body: string) => `
$actions:
  save:
    url: "POST /api/{id}/{q}/{z}"
$type: Probe
handler: save
body: ${body}
`;

	it('prefers the route param over the query string over the form data, and skips null form values', async () => {
		const { fetcher } = renderPage(PAGE('{id: "B1", q: "B2", z: "B3", skipped: null}'), {
			entry: '/p/R1?id=S1&q=Q1',
			routePath: '/p/:id',
		}) as { fetcher: ReturnType<typeof vi.fn> };
		fireEvent.click(screen.getByText('form'));
		// The whole form data is the body, null values included; only the URL placeholders skip nulls.
		await waitFor(() =>
			expect(fetcher).toHaveBeenCalledWith('POST /api/R1/Q1/B3', undefined, { id: 'B1', q: 'B2', z: 'B3', skipped: null }, undefined)
		);
	});

	it('does not use a null form value for a placeholder (it counts as missing)', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { fetcher } = renderPage(PAGE('{id: "B1", q: "B2", z: null}'));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('POST /api/B1/B2/', undefined, { id: 'B1', q: 'B2', z: null }, undefined));
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('{z}'));
	});

	it('warns about an empty placeholder once per action and key, with the strictParams hint', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { fetcher } = renderPage(PAGE('{id: "B1", q: "B2"}'));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
		const messages = warn.mock.calls.map(c => String(c[0])).filter(m => m.includes('placeholder {z}'));
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('$actions.save');
		expect(messages[0]).toContain('strictParams: true');
	});
});

describe('named handler: resultKey and local actions', () => {
	const PAGE = (spec: string, body = '') => `
$actions:
  save:
${spec}
$type: Probe
handler: save
resultKey: saved
${body}
`;

	it('stores the field named resultKey of the response under that key', async () => {
		renderPage(PAGE('    url: "POST /api/save"\n    resultKey: saved'), { fetcher: makeFetcher({ saved: { a: 1 }, noise: 1 }).fetcher });
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('extra').textContent).toBe('{"a":1}'));
	});

	it('stores the whole response when it has no field named resultKey', async () => {
		renderPage(PAGE('    url: "POST /api/save"\n    resultKey: saved'), { fetcher: makeFetcher({ other: 2 }).fetcher });
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('extra').textContent).toBe('{"other":2}'));
	});

	it('a url-less action stores the form data under resultKey, without any request', async () => {
		const { fetcher } = renderPage(PAGE('    resultKey: saved', 'body: {picked: 7}'));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('extra').textContent).toBe('{"picked":7}'));
		expect(screen.getByTestId('result').textContent).toBe('{"picked":7}');
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('a url-less action without form data stores a timestamp sentinel so watchers re-run', async () => {
		renderPage(PAGE('    resultKey: saved'));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('extra').textContent).toMatch(/^\{"_ts":\d+\}$/));
	});

	it('a url-less action without resultKey is a no-op that resolves undefined', async () => {
		const { fetcher } = renderPage(PAGE('    confirm: "ok?"'));
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('null'));
		expect(fetcher).not.toHaveBeenCalled();
	});
});

// Both sources are cached for 5 minutes: a reload that serves the cache would show the OLD counter.
describe('reloadSources after an action', () => {
	const PAGE = (reload: string) => `
${SOURCES}
$actions:
  save:
    url: "POST /api/{id}/save"
${reload}
$type: Probe
handler: save
action: save
row: {id: "r1"}
body: {id: "r1"}
`;

	async function initial(yaml: string) {
		const harness = makeFetcher();
		renderPage(yaml, { fetcher: harness.fetcher });
		await waitFor(() => expect(screen.getByTestId('items').textContent).toBe('[{"n":1}]'));
		return harness;
	}

	it('reloadSources: true refetches every source even when it is cached', async () => {
		const { calls } = await initial(PAGE('    reloadSources: true'));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('items').textContent).toBe('[{"n":2}]'));
		expect(screen.getByTestId('other').textContent).toBe('[{"n":2}]');
		expect(calls.items).toBe(2);
	});

	it('reloadSources: [name] refetches only the named source, bypassing its cache', async () => {
		const { calls } = await initial(PAGE('    reloadSources: [items]'));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByTestId('items').textContent).toBe('[{"n":2}]'));
		expect(calls.other).toBe(1);
		expect(screen.getByTestId('other').textContent).toBe('[{"n":1}]');
	});

	it('without reloadSources a named handler does not refetch anything', async () => {
		const { calls } = await initial(PAGE(''));
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Done'));
		expect(calls.items).toBe(1);
		expect(calls.other).toBe(1);
		// No resultKey: nothing may be stored in the ctx under a made-up key.
		expect(screen.getByTestId('has-undefined-key').textContent).toBe('false');
	});

	it('also shows loading (not a background refresh) while a named-source reload after a row action is in flight', async () => {
		let release: (() => void) | undefined;
		let itemsCalls = 0;
		const fetcher = vi.fn(async (url: string) => {
			if (url === 'GET /api/items') {
				itemsCalls += 1;
				if (itemsCalls === 1) {
					return [{ n: 1 }];
				}
				await new Promise<void>(resolve => {
					release = resolve;
				});
				return [{ n: 2 }];
			}
			return {};
		});
		renderPage(PAGE('    reloadSources: [items]'), { fetcher: fetcher as never });
		await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('true'));
		expect(screen.getByTestId('refreshing').textContent).toBe('false');
		await act(async () => release!());
		await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
	});

	it('shows the page as loading (not as a background refresh) while the reload after a row action is in flight', async () => {
		let release: (() => void) | undefined;
		let itemsCalls = 0;
		const fetcher = vi.fn(async (url: string) => {
			if (url === 'GET /api/items') {
				itemsCalls += 1;
				if (itemsCalls === 1) {
					return [{ n: 1 }];
				}
				await new Promise<void>(resolve => {
					release = resolve;
				});
				return [{ n: 2 }];
			}
			return {};
		});
		renderPage(PAGE(''), { fetcher: fetcher as never });
		await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('true'));
		expect(screen.getByTestId('refreshing').textContent).toBe('false');
		await act(async () => release!());
		await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
		expect(screen.getByTestId('items').textContent).toBe('[{"n":2}]');
	});

	it('a row action without reloadSources refetches all sources (cache bypassed)', async () => {
		const { calls } = await initial(PAGE(''));
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(screen.getByTestId('items').textContent).toBe('[{"n":2}]'));
		expect(calls.other).toBe(2);
	});

	it('a row action with reloadSources: [name] refetches only that source', async () => {
		const { calls } = await initial(PAGE('    reloadSources: [other]'));
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(screen.getByTestId('other').textContent).toBe('[{"n":2}]'));
		expect(calls.items).toBe(1);
	});

	it('a row action with reloadSources: true refetches every source (cache bypassed)', async () => {
		const { calls } = await initial(PAGE('    reloadSources: true'));
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(screen.getByTestId('items').textContent).toBe('[{"n":2}]'));
		expect(calls.other).toBe(2);
	});

	it('a batch action refetches every source (cache bypassed)', async () => {
		const { calls } = await initial(PAGE(''));
		fireEvent.click(screen.getByText('batch'));
		await waitFor(() => expect(screen.getByTestId('items').textContent).toBe('[{"n":2}]'));
		expect(calls.other).toBe(2);
	});

	it('a batch action with reloadSources: [name] refetches only that source, like a row action', async () => {
		const { calls } = await initial(PAGE('    reloadSources: [other]'));
		fireEvent.click(screen.getByText('batch'));
		await waitFor(() => expect(screen.getByTestId('other').textContent).toBe('[{"n":2}]'));
		expect(calls.items).toBe(1);
	});
});

describe('batch actions honour confirm', () => {
	const PAGE = `
$actions:
  bulk:
    url: "POST /api/dlq/{id}/"
    confirm: "Delete the selection?"
$type: Probe
handler: bulk
action: bulk
`;
	const posts = (fetcher: { mock: { calls: unknown[][] } }) => fetcher.mock.calls.filter(c => String(c[0]).startsWith('POST'));

	it('sends nothing, reports nothing and frees the action when the confirmation is declined', async () => {
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const { fetcher } = renderPage(PAGE);
		fireEvent.click(screen.getByText('batch'));
		await settle();
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(confirm).toHaveBeenCalledWith('Delete the selection?');
		expect(posts(fetcher)).toHaveLength(0);
		expect(screen.queryByRole('status')).toBeNull();
		expect(screen.queryByRole('alert')).toBeNull();
		// Declining must not leave the action stuck as "in flight": the next attempt asks again.
		expect(screen.getByTestId('pending').textContent).toBe('{"bulk":false}');
		confirm.mockReturnValue(true);
		fireEvent.click(screen.getByText('batch'));
		await waitFor(() => expect(posts(fetcher)).toHaveLength(1));
		expect(confirm).toHaveBeenCalledTimes(2);
	});

	it('sends the request with the selected ids once the confirmation is accepted', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const { fetcher } = renderPage(PAGE);
		fireEvent.click(screen.getByText('batch'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('POST /api/dlq', undefined, { ids: ['b1', 'b2'] }, undefined));
	});
});

describe('row actions: authoring mistakes and local rows', () => {
	it('an unknown action name is reported with the action name and where to fix it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderPage(`$type: Probe\nhandler: none\n`);
		fireEvent.click(screen.getByText('row-unknown'));
		await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('[onAction] No action spec found for "nope" - check $actions in YAML'));
		expect(error).toHaveBeenCalledWith(expect.stringContaining('row action "nope" failed'));
	});

	it('a url-less row action stores the clicked row under resultKey, without a request', async () => {
		const { fetcher } = renderPage(`
$actions:
  openEdit:
    resultKey: picked
$type: Probe
handler: openEdit
action: openEdit
resultKey: picked
row: {id: "r9", name: "Nine"}
`);
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(screen.getByTestId('extra').textContent).toBe('{"id":"r9","name":"Nine"}'));
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('a url-less row action without resultKey does nothing and shows no feedback', async () => {
		const { fetcher } = renderPage(`
$actions:
  noop:
    confirm: "x"
$type: Probe
handler: noop
action: noop
`);
		fireEvent.click(screen.getByText('row'));
		await settle();
		expect(fetcher).not.toHaveBeenCalled();
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.queryByRole('status')).toBeNull();
		expect(screen.getByTestId('has-undefined-key').textContent).toBe('false');
	});

	it('asks for the configured confirmation and proceeds only when accepted', async () => {
		const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
		const { fetcher } = renderPage(`
$actions:
  del:
    url: "DELETE /api/x/{id}"
    confirm: "Delete?"
$type: Probe
handler: del
action: del
`);
		fireEvent.click(screen.getByText('row'));
		await settle();
		expect(fetcher).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('DELETE /api/x/r1', { id: 'r1' }, undefined, undefined));
		expect(confirm).toHaveBeenCalledTimes(2);
		expect(confirm).toHaveBeenCalledWith('Delete?');
	});

	it('a declined confirmation frees the row so the next click can run', async () => {
		vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
		const { fetcher } = renderPage(`
$actions:
  del:
    url: "DELETE /api/x/{id}"
    confirm: "Delete?"
$type: Probe
handler: del
action: del
`);
		fireEvent.click(screen.getByText('row'));
		await settle();
		expect(screen.getByTestId('pending-rows').textContent).toBe('{}');
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
	});

	it('encodes row values and names the row keys and route params when a placeholder is missing', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderPage(`
$actions:
  del:
    url: "DELETE /api/x/{missing}"
$type: Probe
handler: del
action: del
row: {id: "r1"}
`);
		fireEvent.click(screen.getByText('row'));
		const text = (await screen.findByRole('alert')).textContent ?? '';
		expect(text).toContain('{missing}');
		expect(text).toContain('row keys: id');
		expect(text).toContain('route params: none');
	});

	it('names the route params in the missing-placeholder error when the route has some', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderPage(
			`
$actions:
  del:
    url: "DELETE /api/x/{missing}"
$type: Probe
handler: del
action: del
row: {id: "r1"}
`,
			{ entry: '/w/W7', routePath: '/w/:wid' }
		);
		fireEvent.click(screen.getByText('row'));
		const text = (await screen.findByRole('alert')).textContent ?? '';
		expect(text).toContain('route params: wid');
	});

	it('takes {placeholders} from the route when the row has none, and sends the row id as the params argument', async () => {
		const { fetcher } = renderPage(
			`
$actions:
  del:
    url: "DELETE /api/w/{wid}/x/{id}"
$type: Probe
handler: del
action: del
row: {id: "r1", label: "L"}
`,
			{ entry: '/w/W7', routePath: '/w/:wid' }
		);
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('DELETE /api/w/W7/x/r1', { id: 'r1' }, undefined, undefined));
	});

	it('a string action spec is a plain url and is not mistaken for an object with unknown keys', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderPage(`
$actions:
  plain: "POST /api/plain"
$type: Probe
handler: plain
`);
		expect(error).not.toHaveBeenCalledWith(expect.stringContaining('unknown action key'));
	});
});

describe('pending state per row and for batches', () => {
	const PAGE = `
$actions:
  del:
    url: "DELETE /api/x/{id}"
$type: Probe
handler: del
action: del
`;

	function deferredFetcher() {
		const resolvers: Array<() => void> = [];
		const fetcher = vi.fn(
			() =>
				new Promise<unknown>(resolve => {
					resolvers.push(() => resolve({}));
				})
		);
		return { fetcher, resolvers };
	}

	it('lists the row id while a row action runs and clears it afterwards', async () => {
		const { fetcher, resolvers } = deferredFetcher();
		renderPage(PAGE, { fetcher: fetcher as never });
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(screen.getByTestId('pending-rows').textContent).toBe('{"del":["r1"]}'));
		expect(screen.getByTestId('pending').textContent).toBe('{"del":true}');
		await act(async () => resolvers[0]!());
		await waitFor(() => expect(screen.getByTestId('pending-rows').textContent).toBe('{}'));
		expect(screen.getByTestId('pending').textContent).toBe('{"del":false}');
	});

	it('marks every row (*) while a batch action runs, and ignores a repeated batch with a warning', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { fetcher, resolvers } = deferredFetcher();
		renderPage(PAGE, { fetcher: fetcher as never });
		fireEvent.click(screen.getByText('batch'));
		await waitFor(() => expect(screen.getByTestId('pending-rows').textContent).toBe('{"del":["*"]}'));
		fireEvent.click(screen.getByText('batch'));
		await settle();
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('[GenericPageRunner] action "del" is already running - ignoring the repeated call');
		await act(async () => resolvers[0]!());
		await waitFor(() => expect(screen.getByTestId('pending-rows').textContent).toBe('{}'));
	});

	it('a refused repeated call does not release the call that is still running', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { fetcher, resolvers } = deferredFetcher();
		renderPage(PAGE, { fetcher: fetcher as never });
		fireEvent.click(screen.getByText('batch'));
		await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe('{"del":true}'));
		fireEvent.click(screen.getByText('batch'));
		await settle();
		expect(screen.getByTestId('pending').textContent).toBe('{"del":true}');
		expect(screen.getByTestId('pending-rows').textContent).toBe('{"del":["*"]}');
		await act(async () => resolvers[0]!());
	});

	it('runs the same action on two different rows in parallel, each tracked on its own', async () => {
		const { fetcher, resolvers } = deferredFetcher();
		renderPage(PAGE, { fetcher: fetcher as never });
		fireEvent.click(screen.getByText('row'));
		fireEvent.click(screen.getByText('row-b'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
		expect(screen.getByTestId('pending-rows').textContent).toBe('{"del":["r1","r2"]}');
		await act(async () => resolvers[0]!());
		await waitFor(() => expect(screen.getByTestId('pending-rows').textContent).toBe('{"del":["r2"]}'));
		expect(screen.getByTestId('pending').textContent).toBe('{"del":true}');
		await act(async () => resolvers[1]!());
		await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe('{"del":false}'));
	});
});

describe('batch actions', () => {
	it('reports an unknown batch action name with a console warning and sends nothing', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { fetcher } = renderPage(`$type: Probe\nhandler: none\n`);
		fireEvent.click(screen.getByText('batch-unknown'));
		await settle();
		expect(warn).toHaveBeenCalledWith('[GenericPageRunner] No action spec found for "nope" - check $actions in YAML');
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('skips a batch action that has no url, saying so', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { fetcher } = renderPage(`
$actions:
  bulk:
    resultKey: picked
$type: Probe
handler: bulk
action: bulk
`);
		fireEvent.click(screen.getByText('batch'));
		await settle();
		expect(warn).toHaveBeenCalledWith('[GenericPageRunner] Batch action "bulk" has no url - skipping fetcher');
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('strips the {id} placeholder and trailing slashes from the url and sends the ids as the body', async () => {
		const { fetcher } = renderPage(`
$actions:
  bulk:
    url: "POST /api/dlq/{id}/"
$type: Probe
handler: bulk
action: bulk
`);
		fireEvent.click(screen.getByText('batch'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('POST /api/dlq', undefined, { ids: ['b1', 'b2'] }, undefined));
	});
});
