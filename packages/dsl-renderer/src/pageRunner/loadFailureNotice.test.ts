import { describe, expect, it, vi } from 'vitest';

import { reportLoadFailure, toSourceError } from './loadFailureNotice.js';

function run(overrides: Partial<Parameters<typeof reportLoadFailure>[0]> = {}) {
	const notify = vi.fn();
	const namedSources = new Set<string>();
	const args = {
		notify,
		error: Object.assign(new Error('daemon-not-running'), { status: 503 }),
		source: 'jobs',
		trigger: 'initial' as const,
		shouldNotify: undefined as unknown,
		namedSources,
		...overrides,
	};
	reportLoadFailure(args);
	return { notify, namedSources, args };
}

describe('reportLoadFailure', () => {
	it('notifies with the usual message and status when no callback is given', () => {
		const { notify } = run();
		expect(notify).toHaveBeenCalledExactlyOnceWith({ kind: 'error', message: 'Could not load the data: daemon-not-running', status: 503 });
	});

	it('a callback answering false notifies nothing and names the source once in the console', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const namedSources = new Set<string>();
		const first = run({ shouldNotify: () => false, namedSources });
		run({ shouldNotify: () => false, namedSources, error: new Error('another message') });
		run({ shouldNotify: () => false, namedSources, source: 'stats' });

		expect(first.notify).not.toHaveBeenCalled();
		const messages = warn.mock.calls.map(c => String(c[0]));
		expect(messages).toHaveLength(2);
		expect(messages[0]).toContain('source "jobs"');
		expect(messages[1]).toContain('source "stats"');
	});

	it('a failure not tied to a source is named "(unknown)" and points at the whole map', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		run({ shouldNotify: () => false, source: undefined, error: 'plain text' });
		const message = String(warn.mock.calls[0]![0]);
		expect(message).toContain('source "(unknown)"');
		expect(message).toContain('$ctx.$sourceErrors');
		expect(message).not.toContain('HTTP');
	});

	it('hands the callback a failure with no status when the error carries none', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const shouldNotify = vi.fn(() => false);
		const error = new Error('boom');
		run({ shouldNotify, error, trigger: 'poll' });
		expect(shouldNotify).toHaveBeenCalledExactlyOnceWith({ source: 'jobs', status: undefined, message: 'boom', error, trigger: 'poll' });
	});

	it('a truthy non-boolean never suppresses', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { notify } = run({ shouldNotify: () => 'false' });
		expect(notify).toHaveBeenCalledTimes(1);
	});
});

describe('toSourceError', () => {
	it('keeps only a numeric status', () => {
		expect(toSourceError(Object.assign(new Error('x'), { status: 404 }))).toStrictEqual({ message: 'x', status: 404 });
		expect(toSourceError(Object.assign(new Error('x'), { status: '404' }))).toStrictEqual({ message: 'x' });
		expect(toSourceError('text')).toStrictEqual({ message: 'text' });
	});
});
