import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { NotifierProvider, useNotifier } from './notifier.js';
import type { Notification } from './notifier.js';

// violations-suppress-start: react/no-raw-button test stand-ins for registry entries; dsl-renderer cannot import dsl-ui's Button
// Stand-in for the generated DataTable / Form entries: calls ctx.onAction / ctx.onBatchAction like DataTable
// (not awaited) and a named `$ctx.<handler>` like a form submit (awaited, rejection swallowed to keep the test quiet).
const ActionsEntry: ComponentRegistryEntry = {
	name: 'Actions',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => {
		const onAction = ctx['onAction'] as (action: string, row: Record<string, unknown>) => void;
		const onBatchAction = ctx['onBatchAction'] as (action: string, rows: Record<string, unknown>[]) => void;
		const handler = ctx[node['handler'] as string] as (() => Promise<unknown>) | undefined;
		const pending = (ctx['$actionPending'] as Record<string, boolean> | undefined) ?? {};
		const action = node['action'] as string;
		return (
			<div>
				<button onClick={() => onAction(action, { id: 'e1' })}>row</button>
				<button onClick={() => onBatchAction(action, [{ id: 'e1' }])}>batch</button>
				<button onClick={() => void handler?.().catch(() => undefined)}>form</button>
				<span data-testid="pending">{pending[action] ? 'pending' : 'idle'}</span>
			</div>
		);
	},
};

const WidgetEntry: ComponentRegistryEntry = {
	name: 'Widget',
	category: 'atomic',
	tags: [],
	render: () => {
		const notify = useNotifier();
		return <button onClick={() => notify({ kind: 'success', message: 'from widget' })}>widget</button>;
	},
};

// violations-suppress-end

const registry = createRegistry([ActionsEntry, WidgetEntry]);

const PAGE = (actionBody: string) => `
$actions:
  clearEntry:
    url: "POST /api/dlq/{id}/clear"
${actionBody}
$type: Actions
action: clearEntry
handler: clearEntry
`;

function renderPage(yaml: string, opts: { fetcher?: ReturnType<typeof vi.fn>; notify?: (n: Notification) => void; onActionError?: (e: Error, i: unknown) => void; brainRegistry?: Record<string, () => Promise<unknown>> } = {}) {
	const fetcher = opts.fetcher ?? vi.fn().mockResolvedValue({});
	const runner = (
		<GenericPageRunner yamlText={yaml} registry={registry} fetcher={fetcher} brainRegistry={opts.brainRegistry ?? {}} onActionError={opts.onActionError} />
	);
	render(<MemoryRouter>{opts.notify ? <NotifierProvider notify={opts.notify}>{runner}</NotifierProvider> : runner}</MemoryRouter>);
	return { fetcher };
}

function failure(message: string, status: number): Error {
	return Object.assign(new Error(message), { status });
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('action feedback: default inline banner (no host notifier)', () => {
	it('shows "Done" as a status after a successful row action', async () => {
		renderPage(PAGE(''));
		fireEvent.click(screen.getByText('row'));
		const banner = await screen.findByRole('status');
		expect(banner.textContent).toContain('Done');
	});

	it('uses successMessage, and a server `message` overrides it', async () => {
		renderPage(PAGE('    successMessage: "Entry removed"'));
		fireEvent.click(screen.getByText('row'));
		expect((await screen.findByRole('status')).textContent).toContain('Entry removed');
	});

	it('lets the server response message win over successMessage', async () => {
		renderPage(PAGE('    successMessage: "Entry removed"'), { fetcher: vi.fn().mockResolvedValue({ message: '3 entries cleared' }) });
		fireEvent.click(screen.getByText('row'));
		expect((await screen.findByRole('status')).textContent).toContain('3 entries cleared');
	});

	it('shows an alert with errorPrefix, the server message and the HTTP status when the action fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetcher = vi.fn().mockRejectedValue(failure('Daemon is not running -- start it with `queue start`', 503));
		renderPage(PAGE('    errorPrefix: "Could not clear"'), { fetcher });
		fireEvent.click(screen.getByText('row'));
		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toContain('Could not clear: Daemon is not running -- start it with `queue start`');
		expect(alert.textContent).toContain('HTTP 503');
	});

	it('reports a batch action failure and a named handler (form) failure the same way', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const fetcher = vi.fn().mockRejectedValue(failure('boom', 500));
		renderPage(PAGE(''), { fetcher });
		fireEvent.click(screen.getByText('batch'));
		expect((await screen.findByRole('alert')).textContent).toContain('boom');
		fireEvent.click(screen.getByText('form'));
		await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
	});

	it('can be dismissed', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderPage(PAGE(''), { fetcher: vi.fn().mockRejectedValue(failure('boom', 500)) });
		fireEvent.click(screen.getByText('row'));
		await screen.findByRole('alert');
		fireEvent.click(screen.getByLabelText('Dismiss'));
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('notify: false silences both success and failure feedback, failures stay in the console and in onActionError', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const onActionError = vi.fn();
		const fetcher = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(failure('boom', 500));
		renderPage(PAGE('    notify: false'), { fetcher, onActionError });
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(onActionError).toHaveBeenCalledTimes(1));
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('row action "clearEntry" failed: boom'));
		expect(screen.queryByRole('status')).toBeNull();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('gives no success feedback for a local action that sent no request (confirm declined or no url)', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		const { fetcher } = renderPage(PAGE('    confirm: "Sure?"'));
		fireEvent.click(screen.getByText('row'));
		await act(async () => {
			await new Promise<void>(resolve => setTimeout(resolve, 0));
		});
		expect(fetcher).not.toHaveBeenCalled();
		expect(screen.queryByRole('status')).toBeNull();
	});
});

describe('action feedback: host NotifierProvider', () => {
	it('receives the notification instead of the inline banner', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const notify = vi.fn();
		const fetcher = vi.fn().mockRejectedValue(failure('Daemon is not running', 503));
		renderPage(PAGE('    errorPrefix: "Could not clear"'), { fetcher, notify });
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
		expect(notify).toHaveBeenCalledWith({ kind: 'error', message: 'Could not clear: Daemon is not running', status: 503, action: 'clearEntry' });
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.queryByTestId('action-banner')).toBeNull();
	});

	it('is also what widgets get from useNotifier()', () => {
		const notify = vi.fn();
		renderPage('$type: Widget\n', { notify });
		fireEvent.click(screen.getByText('widget'));
		expect(notify).toHaveBeenCalledWith({ kind: 'success', message: 'from widget' });
	});

	it('useNotifier() inside the runner without a host provider reaches the inline banner', async () => {
		renderPage('$type: Widget\n');
		fireEvent.click(screen.getByText('widget'));
		expect((await screen.findByRole('status')).textContent).toContain('from widget');
	});
});

describe('action feedback: in-flight state', () => {
	it('ignores a repeated call while the action runs and exposes $actionPending', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		let resolveFetch: (value: unknown) => void = () => undefined;
		const fetcher = vi.fn().mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
		renderPage(PAGE(''), { fetcher });
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe('pending'));
		fireEvent.click(screen.getByText('row'));
		expect(fetcher).toHaveBeenCalledTimes(1);
		resolveFetch({});
		await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe('idle'));
		// The same action can run again once the first finished.
		fireEvent.click(screen.getByText('row'));
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
	});
});

describe('action feedback: brains and authoring mistakes', () => {
	const BRAIN_PAGE = (extra: string) => `
$brains:
  saveThing:
    $brain: failing
${extra}
$type: Actions
action: clearEntry
`;

	it('shows a failed brain as an alert carrying the brain error message', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failing = vi.fn().mockRejectedValue(failure('Brain exploded', 502));
		renderPage(BRAIN_PAGE(''), { brainRegistry: { failing } });
		expect((await screen.findByRole('alert')).textContent).toContain('Brain exploded');
	});

	it('keeps a $notify: false brain failure out of the feedback', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const failing = vi.fn().mockRejectedValue(failure('Brain exploded', 502));
		renderPage(BRAIN_PAGE('    $notify: false'), { brainRegistry: { failing } });
		await waitFor(() => expect(consoleError).toHaveBeenCalledWith('[useBrains] brain "saveThing" failed:', 'Brain exploded'));
		// One macrotask turn: a banner for this failure would be on screen by now.
		await act(async () => {
			await new Promise<void>(resolve => setTimeout(resolve, 0));
		});
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('logs an unknown action key instead of silently using the default behaviour', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderPage(PAGE('    sucessMessage: "typo"'));
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('unknown action key "sucessMessage"'));
	});
});
