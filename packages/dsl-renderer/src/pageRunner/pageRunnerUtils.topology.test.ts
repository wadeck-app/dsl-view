import { describe, expect, it, vi } from 'vitest';

import { collectRowUrlParams, notifyFailure, notifyLoadFailure, topoLevels, topoSortSources } from './pageRunnerUtils.js';
import type { ActionSpec } from './pageRunnerUtils.js';

// Found by the first Stryker campaign on pageRunnerUtils.ts: dependency detection, the cycle message, undefined
// errors and missing search params were not pinned by any test.
const GET = (params?: Record<string, string>) => ({ url: 'GET /x', ...(params ? { params } : {}) });

describe('topoSortSources dependency detection', () => {
	it('a source whose param reads another source loads after it, whatever the name length and the declaration order', () => {
		const sorted = topoSortSources({
			orders: GET({ userId: '$source.users.0.id' }),
			users: GET(),
		});

		expect(sorted).toStrictEqual(['users', 'orders']);
	});

	it('only a $source reference at the START of the value is a dependency', () => {
		const sorted = topoSortSources({
			first: GET({ label: 'see $source.second.name' }),
			second: GET(),
		});

		// Not a dependency: declaration order is kept (second would have been forced first otherwise).
		expect(sorted).toStrictEqual(['first', 'second']);
	});

	it('a reference with no field path is not a dependency either', () => {
		expect(topoSortSources({ a: GET({ x: '$source.b' }), b: GET() })).toStrictEqual(['a', 'b']);
	});

	it('a shared dependency (diamond) is loaded once and is not mistaken for a cycle', () => {
		const sorted = topoSortSources({
			top: GET({ b: '$source.left.id', c: '$source.right.id' }),
			left: GET({ d: '$source.base.id' }),
			right: GET({ d: '$source.base.id' }),
			base: GET(),
		});

		expect(sorted).toHaveLength(4);
		expect(new Set(sorted).size).toBe(4);
		expect(sorted.indexOf('base')).toBeLessThan(sorted.indexOf('left'));
		expect(sorted.indexOf('base')).toBeLessThan(sorted.indexOf('right'));
		expect(sorted.indexOf('left')).toBeLessThan(sorted.indexOf('top'));
		expect(sorted.indexOf('right')).toBeLessThan(sorted.indexOf('top'));
	});

	it('a cycle is named with the full chain that closes it', () => {
		expect(() => topoSortSources({ a: GET({ x: '$source.b.id' }), b: GET({ y: '$source.a.id' }) })).toThrow('Circular $sources dependency: a -> b -> a');
		expect(() => topoSortSources({ a: GET({ x: '$source.a.id' }) })).toThrow('Circular $sources dependency: a -> a');
		expect(() =>
			topoSortSources({ a: GET({ x: '$source.b.id' }), b: GET({ y: '$source.c.id' }), c: GET({ z: '$source.a.id' }) })
		).toThrow('Circular $sources dependency: a -> b -> c -> a');
	});

	it('a cycle that does not include the first source reports only its own members', () => {
		expect(() =>
			topoSortSources({ first: GET(), a: GET({ x: '$source.b.id' }), b: GET({ y: '$source.a.id' }) })
		).toThrow('Circular $sources dependency: a -> b -> a');
	});

	it('a param that reads a source nobody declared fails with a message naming both sources, not an opaque TypeError', () => {
		expect(() => topoSortSources({ orders: GET({ userId: '$source.ghost.id' }) })).toThrow(
			'$sources.orders reads $source.ghost, which is not declared in $sources'
		);
	});
});

describe('topoLevels', () => {
	it('puts independent sources in the same level and dependants in the next one', () => {
		expect(topoLevels(['a', 'b', 'c', 'd'], { a: [], b: [], c: ['a', 'b'], d: ['c'] })).toStrictEqual([['a', 'b'], ['c'], ['d']]);
	});

	it('a source with no entry in the dependency map has no dependencies', () => {
		expect(topoLevels(['a', 'b'], { b: ['a'] })).toStrictEqual([['a'], ['b']]);
	});

	it('a cycle that slipped through stops the grouping instead of looping, keeping the levels found so far', () => {
		expect(topoLevels(['ok', 'x', 'y'], { ok: [], x: ['y'], y: ['x'] })).toStrictEqual([['ok']]);
	});
});

describe('collectRowUrlParams without search params', () => {
	it('works with only a row, and with row + route params', () => {
		expect(collectRowUrlParams({ id: 7, name: 'n', flag: false, nested: { a: 1 }, nothing: null })).toStrictEqual({ id: '7', name: 'n', flag: 'false' });
		expect(collectRowUrlParams({ id: 7 }, { id: 'route', other: 'o' })).toStrictEqual({ id: '7', other: 'o' });
	});

	it('route params beat search params, and the row beats both', () => {
		const search = new URLSearchParams('id=search&other=search&only=search');

		expect(collectRowUrlParams({ id: 'row' }, { other: 'route' }, search)).toStrictEqual({ id: 'row', other: 'route', only: 'search' });
	});
});

describe('failure notifications', () => {
	const spec = (over: Partial<ActionSpec> = {}) => ({ url: 'POST /x', ...over }) as ActionSpec;

	it('carries a numeric status found on the error, and ignores a status that is not a number', () => {
		const notify = vi.fn();

		notifyFailure(notify, 'save', spec(), Object.assign(new Error('boom'), { status: 503 }));
		notifyFailure(notify, 'save', spec(), Object.assign(new Error('boom'), { status: '503' }));

		expect(notify.mock.calls[0]![0]).toStrictEqual({ kind: 'error', message: 'boom', status: 503, action: 'save' });
		expect(notify.mock.calls[1]![0]).toStrictEqual({ kind: 'error', message: 'boom', status: undefined, action: 'save' });
	});

	it('does not choke on errors that are not objects (undefined, null, string)', () => {
		const notify = vi.fn();

		expect(() => notifyFailure(notify, 'save', spec(), undefined)).not.toThrow();
		expect(() => notifyFailure(notify, 'save', spec(), null)).not.toThrow();
		expect(() => notifyFailure(notify, 'save', spec(), 'plain text')).not.toThrow();
		expect(() => notifyLoadFailure(notify, undefined)).not.toThrow();

		expect(notify).toHaveBeenCalledTimes(4);
		for (const [notification] of notify.mock.calls) {
			expect(notification.status).toBeUndefined();
		}
	});

	it('prefixes the message with errorPrefix, and notify: false does not hide a failure', () => {
		const notify = vi.fn();

		notifyFailure(notify, 'save', spec({ errorPrefix: 'Could not save' }), new Error('disk full'));
		expect(notify.mock.calls[0]![0].message).toBe('Could not save: disk full');

		notifyFailure(notify, 'save', spec({ notify: false, errorPrefix: 'Could not save' }), new Error('disk full'));
		expect(notify).toHaveBeenCalledTimes(2);
		expect(notify.mock.calls[1]![0]).toEqual({ kind: 'error', message: 'Could not save: disk full', status: undefined, action: 'save' });
	});

	it('a failure before the spec could be read (unknown action) is always reported', () => {
		const notify = vi.fn();

		notifyFailure(notify, 'nope', undefined, new Error('No action spec found'));

		expect(notify).toHaveBeenCalledWith({ kind: 'error', message: 'No action spec found', status: undefined, action: 'nope' });
	});

	it('a load failure says the data could not be loaded and carries the status', () => {
		const notify = vi.fn();

		notifyLoadFailure(notify, Object.assign(new Error('Daemon is not running'), { status: 503 }));

		expect(notify).toHaveBeenCalledWith({ kind: 'error', message: 'Could not load the data: Daemon is not running', status: 503 });
	});
});
