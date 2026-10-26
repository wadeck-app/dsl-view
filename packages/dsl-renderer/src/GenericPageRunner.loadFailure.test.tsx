import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { createRegistry } from './ComponentRegistry.js';
import { resolveExpressionValue } from './engine/DslRenderer.js';
import { GenericPageRunner } from './GenericPageRunner.js';
import { NotifierProvider } from './notifier.js';

// `shouldNotifyLoadFailure` decides whether a failed `$sources` load raises the "Could not load the data" notification.
// Every path that raises it is tested separately (initial load, poll tick, URL-param refetch, `$refresh`), and the two
// reload paths that do NOT raise it (brain `$reload`, action `reloadSources`) are pinned too. Whatever the host answers,
// the failure stays readable as `$ctx.$sourceErrors.<source>`.

function Controls({ ctx }: { ctx: Record<string, unknown> }) {
	const [, setSearchParams] = useSearchParams();
	const refresh = ctx['$refresh'] as (source?: string) => Promise<void>;
	const save = ctx['save'] as () => Promise<unknown>;
	return (
		<div>
			<button onClick={() => void refresh('jobs')}>refresh-jobs</button>
			<button onClick={() => void save().catch(() => undefined)}>save</button>
			<button onClick={() => setSearchParams({ q: 'next' })}>change-q</button>
		</div>
	);
}

const PageEntry: ComponentRegistryEntry = {
	name: 'Page',
	category: 'atomic',
	tags: [],
	render: ({ node, ctx }) => (
		<div>
			<Controls ctx={ctx} />
			<span data-testid="errors">{JSON.stringify(ctx['$sourceErrors'])}</span>
			<span data-testid="jobs">{JSON.stringify(resolveExpressionValue(node['jobs'], ctx) ?? null)}</span>
		</div>
	),
};
const registry = createRegistry([PageEntry]);

const DOWN = () => Object.assign(new Error('daemon-not-running'), { status: 503 });

function page(extra = '', jobsExtra = '') {
	return `
$sources:
  jobs:
    url: GET /api/jobs
${jobsExtra}
$actions:
  save:
    url: "POST /api/save"
    reloadSources: [jobs]
${extra}
$type: Page
jobs: $sources.jobs
`;
}

/** Answers GET /api/jobs while `state.down` is false; POST /api/save always works. */
function makeFetcher(initiallyDown = false) {
	const state = { down: initiallyDown, gets: 0 };
	const fetcher = vi.fn(async (url: string) => {
		if (url.startsWith('GET /api/jobs')) {
			state.gets += 1;
			if (state.down) {
				throw DOWN();
			}
			return { n: state.gets };
		}
		return {};
	});
	return { fetcher, state };
}

function renderPage(
	fetcher: ReturnType<typeof makeFetcher>['fetcher'],
	options: { shouldNotifyLoadFailure?: unknown; yaml?: string; brainRegistry?: Record<string, never> } = {}
) {
	const notify = vi.fn();
	const props: Record<string, unknown> = {};
	if ('shouldNotifyLoadFailure' in options) {
		props['shouldNotifyLoadFailure'] = options.shouldNotifyLoadFailure;
	}
	render(
		<MemoryRouter>
			<NotifierProvider notify={notify}>
				<GenericPageRunner
					yamlText={options.yaml ?? page()}
					registry={registry}
					fetcher={fetcher}
					brainRegistry={(options.brainRegistry ?? {}) as never}
					{...props}
				/>
			</NotifierProvider>
		</MemoryRouter>
	);
	return { notify };
}

const errorsOf = () => JSON.parse(screen.getByTestId('errors').textContent || 'null') as Record<string, unknown> | null;
const loadNotices = (notify: ReturnType<typeof vi.fn>) =>
	notify.mock.calls.map(c => c[0] as { message: string; action?: string }).filter(n => n.message.startsWith('Could not load the data'));

function spyConsole() {
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
	return vi.spyOn(console, 'warn').mockImplementation(() => undefined);
}
const suppressedWarnings = (warn: ReturnType<typeof spyConsole>) =>
	warn.mock.calls.map(c => String(c[0])).filter(m => m.includes('shouldNotifyLoadFailure') && m.includes('not announced'));

afterEach(() => {
	vi.restoreAllMocks();
});

describe('shouldNotifyLoadFailure: initial load', () => {
	it('without the prop, a failed load notifies exactly as before', async () => {
		spyConsole();
		const { notify } = renderPage(makeFetcher(true).fetcher);
		await waitFor(() => expect(loadNotices(notify)).toHaveLength(1));
		expect(notify).toHaveBeenCalledWith({ kind: 'error', message: 'Could not load the data: daemon-not-running', status: 503 });
	});

	it('true notifies; false does not, and the callback receives source, status, message, error and trigger', async () => {
		spyConsole();
		const yes = vi.fn(() => true);
		const first = renderPage(makeFetcher(true).fetcher, { shouldNotifyLoadFailure: yes });
		await waitFor(() => expect(loadNotices(first.notify)).toHaveLength(1));
		expect(yes).toHaveBeenCalledTimes(1);

		const no = vi.fn(() => false);
		const second = renderPage(makeFetcher(true).fetcher, { shouldNotifyLoadFailure: no });
		await waitFor(() => expect(no).toHaveBeenCalledTimes(1));
		expect(no).toHaveBeenCalledWith({
			source: 'jobs',
			status: 503,
			message: 'daemon-not-running',
			error: expect.objectContaining({ message: 'daemon-not-running', status: 503 }),
			trigger: 'initial',
		});
		expect(loadNotices(second.notify)).toHaveLength(0);
	});

	it('a suppressed failure stays readable by the page as $ctx.$sourceErrors.<source> and the source stays undefined', async () => {
		spyConsole();
		renderPage(makeFetcher(true).fetcher, { shouldNotifyLoadFailure: () => false });
		await waitFor(() => expect(errorsOf()).toStrictEqual({ jobs: { message: 'daemon-not-running', status: 503 } }));
		expect(screen.getByTestId('jobs').textContent).toBe('null');
	});

	it('a notified failure is exposed to the page too (same state whatever the host answers)', async () => {
		spyConsole();
		renderPage(makeFetcher(true).fetcher);
		await waitFor(() => expect(errorsOf()).toStrictEqual({ jobs: { message: 'daemon-not-running', status: 503 } }));
	});

	it('a source that loads has no entry', async () => {
		const { fetcher } = makeFetcher(false);
		renderPage(fetcher, { shouldNotifyLoadFailure: () => false });
		await waitFor(() => expect(screen.getByTestId('jobs').textContent).toBe('{"n":1}'));
		expect(errorsOf()).toStrictEqual({});
	});

	it('names the suppressed failure in the development console once per source, with the way to read it', async () => {
		const warn = spyConsole();
		renderPage(makeFetcher(true).fetcher, { shouldNotifyLoadFailure: () => false });
		await waitFor(() => expect(suppressedWarnings(warn)).toHaveLength(1));
		const message = suppressedWarnings(warn)[0]!;
		expect(message).toContain('source "jobs"');
		expect(message).toContain('daemon-not-running');
		expect(message).toContain('503');
		expect(message).toContain('$ctx.$sourceErrors.jobs');
	});
});

describe('shouldNotifyLoadFailure: invalid callbacks fail visible', () => {
	it('a callback that throws is reported naming the prop, then the failure is notified', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { notify } = renderPage(makeFetcher(true).fetcher, {
			shouldNotifyLoadFailure: () => {
				throw new Error('host bug');
			},
		});
		await waitFor(() => expect(loadNotices(notify)).toHaveLength(1));
		const reported = error.mock.calls.map(c => String(c[0])).filter(m => m.includes('shouldNotifyLoadFailure'));
		expect(reported).toHaveLength(1);
		expect(reported[0]).toContain('threw');
		expect(reported[0]).toContain('host bug');
	});

	it.each([['no'], [undefined], [null], [0], [1]])('a callback returning %j is reported naming the prop, then the failure is notified', async answer => {
		const warn = spyConsole();
		const { notify } = renderPage(makeFetcher(true).fetcher, { shouldNotifyLoadFailure: () => answer });
		await waitFor(() => expect(loadNotices(notify)).toHaveLength(1));
		const reported = warn.mock.calls.map(c => String(c[0])).filter(m => m.includes('shouldNotifyLoadFailure') && m.includes('boolean'));
		expect(reported).toHaveLength(1);
	});

	it('a prop that is not a function is reported naming the prop, then the failure is notified', async () => {
		const warn = spyConsole();
		const { notify } = renderPage(makeFetcher(true).fetcher, { shouldNotifyLoadFailure: 'yes' });
		await waitFor(() => expect(loadNotices(notify)).toHaveLength(1));
		expect(warn.mock.calls.map(c => String(c[0])).some(m => m.includes('shouldNotifyLoadFailure') && m.includes('function'))).toBe(true);
	});
});

describe('shouldNotifyLoadFailure: poll tick', () => {
	it('is asked once per distinct failure with trigger "poll"; the development message is not repeated per tick', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const warn = spyConsole();
		const { fetcher, state } = makeFetcher(false);
		const decide = vi.fn(() => false);
		const { notify } = renderPage(fetcher, { shouldNotifyLoadFailure: decide, yaml: page('', '    poll: 1s') });
		await waitFor(() => expect(screen.getByTestId('jobs').textContent).toBe('{"n":1}'));

		state.down = true;
		await act(async () => {
			await vi.advanceTimersByTimeAsync(3500);
		});

		expect(decide).toHaveBeenCalledTimes(1);
		expect(decide).toHaveBeenCalledWith(expect.objectContaining({ source: 'jobs', trigger: 'poll', status: 503 }));
		expect(loadNotices(notify)).toHaveLength(0);
		expect(suppressedWarnings(warn)).toHaveLength(1);
		// The previous data stays (poll semantics) and the failure is visible to the page.
		expect(screen.getByTestId('jobs').textContent).toBe('{"n":1}');
		expect(errorsOf()).toStrictEqual({ jobs: { message: 'daemon-not-running', status: 503 } });
	});

	it('the entry disappears when a later poll succeeds', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		spyConsole();
		const { fetcher, state } = makeFetcher(true);
		renderPage(fetcher, { shouldNotifyLoadFailure: () => false, yaml: page('', '    poll: 1s') });
		await waitFor(() => expect(errorsOf()).toStrictEqual({ jobs: { message: 'daemon-not-running', status: 503 } }));

		state.down = false;
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1500);
		});
		await waitFor(() => expect(screen.getByTestId('jobs').textContent).toContain('"n"'));
		expect(errorsOf()).toStrictEqual({});
	});
});

describe('shouldNotifyLoadFailure: URL-param refetch', () => {
	it('is asked with trigger "params" when a query-param change refetches a failing source', async () => {
		spyConsole();
		const { fetcher, state } = makeFetcher(false);
		const decide = vi.fn(() => false);
		const { notify } = renderPage(fetcher, { shouldNotifyLoadFailure: decide, yaml: page('', '    params:\n      q: $urlParam.q') });
		await waitFor(() => expect(screen.getByTestId('jobs').textContent).toBe('{"n":1}'));

		state.down = true;
		fireEvent.click(screen.getByText('change-q'));

		await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
		expect(decide).toHaveBeenCalledWith(expect.objectContaining({ source: 'jobs', trigger: 'params' }));
		expect(loadNotices(notify)).toHaveLength(0);
		expect(errorsOf()).toStrictEqual({ jobs: { message: 'daemon-not-running', status: 503 } });
	});
});

describe('shouldNotifyLoadFailure: $refresh', () => {
	it('is asked every time the user refreshes (no deduplication), with trigger "refresh" and the refreshed source', async () => {
		const warn = spyConsole();
		const { fetcher, state } = makeFetcher(false);
		const decide = vi.fn(() => false);
		const { notify } = renderPage(fetcher, { shouldNotifyLoadFailure: decide });
		await waitFor(() => expect(screen.getByTestId('jobs').textContent).toBe('{"n":1}'));

		state.down = true;
		fireEvent.click(screen.getByText('refresh-jobs'));
		await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
		fireEvent.click(screen.getByText('refresh-jobs'));
		await waitFor(() => expect(decide).toHaveBeenCalledTimes(2));

		expect(decide).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'jobs', trigger: 'refresh', status: 503, message: 'daemon-not-running' }));
		expect(loadNotices(notify)).toHaveLength(0);
		expect(suppressedWarnings(warn)).toHaveLength(1);
		expect(errorsOf()).toStrictEqual({ jobs: { message: 'daemon-not-running', status: 503 } });
	});

	it('true keeps notifying on every refresh', async () => {
		spyConsole();
		const { fetcher, state } = makeFetcher(false);
		const { notify } = renderPage(fetcher, { shouldNotifyLoadFailure: () => true });
		await waitFor(() => expect(screen.getByTestId('jobs').textContent).toBe('{"n":1}'));
		state.down = true;
		fireEvent.click(screen.getByText('refresh-jobs'));
		await waitFor(() => expect(loadNotices(notify)).toHaveLength(1));
		fireEvent.click(screen.getByText('refresh-jobs'));
		await waitFor(() => expect(loadNotices(notify)).toHaveLength(2));
	});
});

describe('shouldNotifyLoadFailure: reloads that do not raise the load banner', () => {
	it('an action reloadSources failure is reported as the action failure, never asks the callback, and is exposed in $sourceErrors', async () => {
		spyConsole();
		const { fetcher, state } = makeFetcher(false);
		const decide = vi.fn(() => false);
		const { notify } = renderPage(fetcher, { shouldNotifyLoadFailure: decide });
		await waitFor(() => expect(screen.getByTestId('jobs').textContent).toBe('{"n":1}'));

		state.down = true;
		fireEvent.click(screen.getByText('save'));

		await waitFor(() => expect(notify.mock.calls.some(c => (c[0] as { action?: string }).action === 'save' && c[0].kind === 'error')).toBe(true));
		expect(decide).not.toHaveBeenCalled();
		expect(loadNotices(notify)).toHaveLength(0);
		expect(errorsOf()).toStrictEqual({ jobs: { message: 'daemon-not-running', status: 503 } });
	});

	it('a brain $reload failure is reported as the brain failure, never asks the callback, and is exposed in $sourceErrors', async () => {
		spyConsole();
		const { fetcher, state } = makeFetcher(false);
		const decide = vi.fn(() => false);
		const brainRegistry = {
			flip: async () => {
				// Waits for the initial load's fetch, so only the brain's own reload fails.
				await vi.waitFor(() => expect(state.gets).toBeGreaterThan(0));
				state.down = true;
				return {};
			},
		};
		const yaml = page().replace('$type: Page', '$brains:\n  reloader:\n    $brain: flip\n    $reload: [jobs]\n$type: Page');
		const { notify } = renderPage(fetcher, { shouldNotifyLoadFailure: decide, yaml, brainRegistry: brainRegistry as never });

		await waitFor(() => expect(notify.mock.calls.some(c => (c[0] as { action?: string }).action === 'reloader')).toBe(true));
		expect(decide).not.toHaveBeenCalled();
		expect(loadNotices(notify)).toHaveLength(0);
		expect(errorsOf()).toStrictEqual({ jobs: { message: 'daemon-not-running', status: 503 } });
	});
});
