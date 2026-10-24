import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import type { ComponentRegistryEntry, RegistryRenderProps } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';

// violations-suppress-start: react/no-raw-button test stand-in for the generated Form / DataTable entries; dsl-renderer cannot import dsl-ui's Button
// Edge paths of the action handlers that the main flows test does not reach: a repeated named-handler call, rows without
// an id, a rejection that is not an Error, and an action that settles after the page was unmounted.
function Probe({ node, ctx }: RegistryRenderProps) {
	const [result, setResult] = React.useState<string>('(none)');
	const handler = ctx['save'] as (body?: Record<string, unknown>) => Promise<unknown>;
	const onAction = ctx['onAction'] as (action: string, row: Record<string, unknown>) => Promise<void>;
	const rows = (node['rows'] as Record<string, unknown>[] | undefined) ?? [];
	return (
		<div>
			<button onClick={() => void handler().then(r => setResult(JSON.stringify(r ?? null)), () => setResult('rejected'))}>form</button>
			{rows.map((row, i) => (
				<button key={i} onClick={() => void onAction('clear', row)}>{`row-${i}`}</button>
			))}
			<span data-testid="result">{result}</span>
		</div>
	);
}
// violations-suppress-end

const ProbeEntry: ComponentRegistryEntry = { name: 'Probe', category: 'atomic', tags: [], render: props => <Probe {...props} /> };
const registry = createRegistry([ProbeEntry]);

const PAGE = `
$actions:
  save:
    url: "POST /api/save"
  clear:
    url: "POST /api/rows/{id}/clear"
$type: Probe
rows: [{id: "a"}, {id: "b"}]
`;

const NO_ID_PAGE = `
$actions:
  clear:
    url: "POST /api/rows/{id}/clear"
$type: Probe
rows: [{name: "no id here"}]
`;

const NO_PLACEHOLDER_PAGE = `
$actions:
  clear:
    url: "POST /api/clear-all"
$type: Probe
rows: [{name: "no id here"}]
`;

// A promise the test resolves or rejects by hand, so the action stays in flight for as long as the test needs.
function deferred<T = unknown>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function renderPage(yaml: string, fetcher: (url: string, params?: unknown, body?: unknown, headers?: unknown) => Promise<unknown>, onActionError?: (e: Error, i: unknown) => void) {
	return render(
		<MemoryRouter>
			<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={{}} onActionError={onActionError} />
		</MemoryRouter>
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('named form handler called twice while the first call is still running', () => {
	it('sends one request, warns by name, and resolves the second call with undefined', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const first = deferred();
		const fetcher = vi.fn(() => first.promise);
		let secondResult: unknown = 'not-set';
		function Twice({ ctx }: RegistryRenderProps) {
			const save = ctx['save'] as () => Promise<unknown>;
			return (
				<div>
					<button onClick={() => void save()}>first</button>
					<button onClick={() => void save().then(r => { secondResult = r; })}>second</button>
				</div>
			);
		}
		const twiceRegistry = createRegistry([{ name: 'Twice', category: 'atomic', tags: [], render: props => <Twice {...props} /> }]);
		render(
			<MemoryRouter>
				<GenericPageRunner yamlText={'$actions:\n  save:\n    url: "POST /api/save"\n$type: Twice\n'} registry={twiceRegistry} fetcher={fetcher} brainRegistry={{}} />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByText('first'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		fireEvent.click(screen.getByText('second'));
		await waitFor(() => expect(secondResult).toBeUndefined());

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('[GenericPageRunner] action "save" is already running - ignoring the repeated call');

		// Once the first call settles the action can run again.
		await act(async () => {
			first.resolve({ ok: true });
			await first.promise;
		});
		fireEvent.click(screen.getByText('first'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
	});
});

describe('row actions on rows without an id', () => {
	it('fails with a named error, before any request, when the url needs {id} and the row has none', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetcher = vi.fn().mockResolvedValue({});
		const onActionError = vi.fn();
		renderPage(NO_ID_PAGE, fetcher, onActionError);

		fireEvent.click(screen.getByText('row-0'));

		await waitFor(() => expect(onActionError).toHaveBeenCalledTimes(1));
		const [error, info] = onActionError.mock.calls[0]!;
		expect((error as Error).message).toContain('action "clear": URL placeholder {id} has no value in "POST /api/rows/{id}/clear"');
		expect((error as Error).message).toContain('row keys: name');
		expect(info).toStrictEqual({ action: 'clear', kind: 'row' });
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('still runs a url without placeholders, handing the fetcher an empty id', async () => {
		const fetcher = vi.fn().mockResolvedValue({});
		renderPage(NO_PLACEHOLDER_PAGE, fetcher);

		fireEvent.click(screen.getByText('row-0'));

		await waitFor(() => expect(fetcher).toHaveBeenCalledWith('POST /api/clear-all', { id: '' }, undefined, undefined));
	});
});

describe('row action rejected with something that is not an Error', () => {
	it('wraps a string rejection into an Error carrying that text, for the host hook and the console', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetcher = vi.fn().mockRejectedValue('503 daemon is not running');
		const onActionError = vi.fn();
		renderPage(PAGE, fetcher, onActionError);

		fireEvent.click(screen.getByText('row-0'));

		await waitFor(() => expect(onActionError).toHaveBeenCalledTimes(1));
		const [error] = onActionError.mock.calls[0]!;
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe('503 daemon is not running');
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('row action "clear" failed: 503 daemon is not running'));
	});
});

describe('an action that settles after the page was unmounted', () => {
	it('neither throws nor logs a React error, and the same action can run on a fresh page', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const slow = deferred();
		const fetcher = vi.fn().mockReturnValueOnce(slow.promise).mockResolvedValue({});
		const onActionError = vi.fn();
		const { unmount } = renderPage(PAGE, fetcher, onActionError);

		fireEvent.click(screen.getByText('row-0'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		unmount();

		await act(async () => {
			slow.resolve({ ok: true });
			await slow.promise;
		});
		// One macrotask turn so any state update queued by the settled action would have run.
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 0));
		});

		expect(consoleError).not.toHaveBeenCalled();
		expect(onActionError).not.toHaveBeenCalled();

		renderPage(PAGE, fetcher, onActionError);
		fireEvent.click(screen.getByText('row-0'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
	});

	it('a rejection after unmount is still reported to the host hook, not lost', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const slow = deferred();
		const fetcher = vi.fn().mockReturnValue(slow.promise);
		const onActionError = vi.fn();
		const { unmount } = renderPage(PAGE, fetcher, onActionError);

		fireEvent.click(screen.getByText('row-0'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		unmount();

		await act(async () => {
			slow.reject(new Error('late failure'));
			await slow.promise.catch(() => undefined);
		});

		await waitFor(() => expect(onActionError).toHaveBeenCalledTimes(1));
		expect((onActionError.mock.calls[0]![0] as Error).message).toBe('late failure');
	});
});
