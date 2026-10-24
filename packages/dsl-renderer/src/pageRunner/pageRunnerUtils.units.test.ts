import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Notification } from '../notifier.js';
import {
	SourceManager,
	normalizeAction,
	normalizeSource,
	notifyFailure,
	notifyLoadFailure,
	notifySuccess,
	parsePollMs,
	resolveAuthHeaders,
	resolveParamValue,
	topoLevels,
} from './pageRunnerUtils.js';

afterEach(() => {
	vi.useRealTimers();
});

describe('normalizeAction / normalizeSource', () => {
	it('turns a url string into a spec object and passes an object through unchanged', () => {
		expect(normalizeAction('POST /api/x')).toEqual({ url: 'POST /api/x' });
		expect(normalizeSource('GET /api/x')).toEqual({ url: 'GET /api/x' });
		const spec = { url: 'POST /api/x', confirm: 'sure?' };
		expect(normalizeAction(spec)).toBe(spec);
		const source = { url: 'GET /api/x', poll: '5s' };
		expect(normalizeSource(source)).toBe(source);
	});
});

describe('durations ("30s" / "5m")', () => {
	it('parses seconds and minutes for the poll interval and the cache TTL, with the same value', () => {
		const sm = new SourceManager();
		expect(parsePollMs('1s')).toBe(1000);
		expect(parsePollMs('90s')).toBe(90_000);
		expect(parsePollMs('2m')).toBe(120_000);
		expect(sm.parseDuration('30s')).toBe(30_000);
		expect(sm.parseDuration('5m')).toBe(300_000);
	});

	it.each(['', '10', 's', '1h', '1.5s', '-1s', ' 1s', '1s ', '1S', '1ms'])('rejects "%s" with an actionable message', value => {
		expect(() => parsePollMs(value)).toThrow(`Unparseable poll interval: "${value}". Expected format like "10s" or "1m".`);
		expect(() => new SourceManager().parseDuration(value)).toThrow(`Unparseable cache duration: "${value}". Expected format like "30s" or "5m".`);
	});
});

describe('SourceManager TTL', () => {
	it('serves an entry strictly before its TTL elapses and drops it exactly at the TTL', () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		const sm = new SourceManager();
		sm.set('k', 'v', 1000);
		vi.setSystemTime(1_000_999);
		expect(sm.get('k')).toBe('v');
		vi.setSystemTime(1_001_000);
		expect(sm.get('k')).toBeNull();
		// Expired entries are removed, not just hidden.
		vi.setSystemTime(1_000_500);
		expect(sm.get('k')).toBeNull();
	});

	it('invalidateSource drops only the entries of that source', () => {
		const sm = new SourceManager();
		sm.set(SourceManager.buildKey('books', 'GET /b'), 1, 60_000);
		sm.set(SourceManager.buildKey('books', 'GET /b?x=1'), 2, 60_000);
		sm.set(SourceManager.buildKey('booksExtra', 'GET /e'), 3, 60_000);
		sm.invalidateSource('books');
		expect(sm.get('books:GET /b')).toBeNull();
		expect(sm.get('books:GET /b?x=1')).toBeNull();
		expect(sm.get('booksExtra:GET /e')).toBe(3);
	});
});

describe('resolveParamValue', () => {
	it('returns an empty string for a $source whose data is missing, and for a path that runs out', () => {
		expect(resolveParamValue('$source.files.0.id', {}, {})).toBe('');
		expect(resolveParamValue('$source.files.0.id', {}, { files: [] })).toBe('');
		expect(resolveParamValue('$source.files.0.id', {}, { files: [{ id: 7 }] })).toBe('7');
		expect(resolveParamValue('$source.files.0.meta.owner', {}, { files: [{ id: 7 }] })).toBe('');
	});

	it('returns a literal untouched when it is not a known expression', () => {
		expect(resolveParamValue('plain', {}, {})).toBe('plain');
		expect(resolveParamValue('$unknown.x', {}, {})).toBe('$unknown.x');
	});
});

describe('resolveAuthHeaders', () => {
	it('is undefined without a token provider or without a token, and a Bearer header otherwise', async () => {
		expect(await resolveAuthHeaders(undefined)).toBeUndefined();
		expect(await resolveAuthHeaders(async () => null)).toBeUndefined();
		expect(await resolveAuthHeaders(async () => '')).toBeUndefined();
		expect(await resolveAuthHeaders(async () => 'abc')).toEqual({ Authorization: 'Bearer abc' });
	});
});

describe('topoLevels', () => {
	it('groups independent keys together and dependent keys in later levels', () => {
		expect(topoLevels(['a', 'b', 'c'], { a: [], b: ['a'], c: ['a', 'b'] })).toEqual([['a'], ['b'], ['c']]);
		expect(topoLevels(['a', 'b', 'c'], { a: [], b: [], c: ['a'] })).toEqual([['a', 'b'], ['c']]);
	});

	it('stops (without looping forever) when the remaining keys can never be placed', () => {
		expect(topoLevels(['a', 'b'], { a: ['b'], b: ['a'] })).toEqual([]);
	});

	it('treats a key without a dependency entry as independent', () => {
		expect(topoLevels(['a'], {})).toEqual([['a']]);
	});
});

function collect() {
	const seen: Notification[] = [];
	return { seen, notify: (n: Notification) => seen.push(n) };
}

describe('notifySuccess', () => {
	it('uses a non-empty string `message` from the response over successMessage, which wins over "Done"', () => {
		const { seen, notify } = collect();
		notifySuccess(notify, 'a', { successMessage: 'Saved' }, { message: 'Server says hi' });
		notifySuccess(notify, 'a', { successMessage: 'Saved' }, { message: '' });
		notifySuccess(notify, 'a', { successMessage: 'Saved' }, { message: 42 });
		notifySuccess(notify, 'a', { successMessage: 'Saved' }, null);
		notifySuccess(notify, 'a', { successMessage: 'Saved' }, 'plain string response');
		notifySuccess(notify, 'a', {}, undefined);
		expect(seen.map(n => n.message)).toEqual(['Server says hi', 'Saved', 'Saved', 'Saved', 'Saved', 'Done']);
		expect(seen.every(n => n.kind === 'success' && n.action === 'a')).toBe(true);
	});

	it('is silent with notify: false', () => {
		const { seen, notify } = collect();
		notifySuccess(notify, 'a', { notify: false }, {});
		expect(seen).toEqual([]);
	});
});

describe('notifyFailure / notifyLoadFailure', () => {
	it('carries the numeric HTTP status of the thrown error and ignores anything else', () => {
		const { seen, notify } = collect();
		notifyFailure(notify, 'a', undefined, Object.assign(new Error('boom'), { status: 503 }));
		notifyFailure(notify, 'a', undefined, Object.assign(new Error('boom'), { status: '503' }));
		notifyFailure(notify, 'a', undefined, new Error('boom'));
		notifyFailure(notify, 'a', undefined, 'just a string');
		notifyFailure(notify, 'a', undefined, null);
		expect(seen.map(n => n.status)).toEqual([503, undefined, undefined, undefined, undefined]);
		expect(seen.map(n => n.message)).toEqual(['boom', 'boom', 'boom', 'just a string', 'null']);
	});

	it('prefixes the message with errorPrefix, and notify: false (success only) never hides a failure', () => {
		const { seen, notify } = collect();
		notifyFailure(notify, 'a', { errorPrefix: 'Could not replay' }, new Error('Daemon is not running'));
		notifyFailure(notify, 'a', { notify: false }, new Error('still shown'));
		expect(seen).toEqual([
			{ kind: 'error', message: 'Could not replay: Daemon is not running', status: undefined, action: 'a' },
			{ kind: 'error', message: 'still shown', status: undefined, action: 'a' },
		]);
	});

	it('reports a failure that happened before the spec was known (unknown action name)', () => {
		const { seen, notify } = collect();
		notifyFailure(notify, 'nope', undefined, new Error('No action spec found'));
		expect(seen).toHaveLength(1);
	});

	it('describes a failed load with its status and no action', () => {
		const { seen, notify } = collect();
		notifyLoadFailure(notify, Object.assign(new Error('Service Unavailable'), { status: 503 }));
		notifyLoadFailure(notify, 'offline');
		notifyLoadFailure(notify, Object.assign(new Error('x'), { status: 'bad' }));
		expect(seen).toEqual([
			{ kind: 'error', message: 'Could not load the data: Service Unavailable', status: 503 },
			{ kind: 'error', message: 'Could not load the data: offline', status: undefined },
			{ kind: 'error', message: 'Could not load the data: x', status: undefined },
		]);
	});
});
