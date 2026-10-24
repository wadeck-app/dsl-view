import { describe, expect, it } from 'vitest';

import { resolveParamValue, SourceManager } from './pageRunnerUtils.js';

// Found by the first Stryker campaign on pageRunnerUtils.ts: the anchors of every expression pattern, the traversal
// of $source paths and the cache invalidation methods were not pinned by any test.
const noSources = {};

describe('resolveParamValue: an expression only counts at the start AND the end of the value', () => {
	const ctx = { name: 'ada', $vars: { who: 'grace' } };
	const sources = { users: [{ id: 7 }], one: { a: { b: 'deep' } } };
	const params = new URLSearchParams('q=found');
	const route = { id: '42' };

	it.each([
		['text before', 'x$ctx.name'],
		['a newline after', '$ctx.name\nmore'],
	])('$ctx with %s stays literal', (_label, value) => {
		expect(resolveParamValue(value, ctx, noSources)).toBe(value);
	});

	it.each([
		['text before', 'x$vars.who'],
		['a newline after', '$vars.who\nmore'],
	])('$vars with %s stays literal', (_label, value) => {
		expect(resolveParamValue(value, ctx, noSources)).toBe(value);
	});

	it.each([
		['text before', 'x$source.one.a.b'],
		['a newline after', '$source.one.a.b\nmore'],
	])('$source with %s stays literal', (_label, value) => {
		expect(resolveParamValue(value, ctx, sources)).toBe(value);
	});

	it.each([
		['text before', 'x$urlParam.q'],
		['a newline after', '$urlParam.q\nmore'],
	])('$urlParam with %s stays literal', (_label, value) => {
		expect(resolveParamValue(value, ctx, noSources, params)).toBe(value);
	});

	it.each([
		['text before', 'x$route.id'],
		['a newline after', '$route.id\nmore'],
	])('$route with %s stays literal', (_label, value) => {
		expect(resolveParamValue(value, ctx, noSources, undefined, route)).toBe(value);
	});

	it('each expression resolves when it stands alone, and a plain value passes through', () => {
		expect(resolveParamValue('$ctx.name', ctx, noSources)).toBe('ada');
		expect(resolveParamValue('$vars.who', ctx, noSources)).toBe('grace');
		expect(resolveParamValue('$source.one.a.b', ctx, sources)).toBe('deep');
		expect(resolveParamValue('$urlParam.q', ctx, noSources, params)).toBe('found');
		expect(resolveParamValue('$route.id', ctx, noSources, undefined, route)).toBe('42');
		expect(resolveParamValue('plain', ctx, noSources)).toBe('plain');
	});
});

describe('resolveParamValue: $source paths', () => {
	const sources = {
		users: [{ id: 7, tags: ['a', 'b'] }, { id: 8 }],
		cfg: { nested: { n: 0, flag: false, empty: null, text: '' } },
		missing: null,
	};

	it('walks objects and array indices, in any mix', () => {
		expect(resolveParamValue('$source.users.0.id', {}, sources)).toBe('7');
		expect(resolveParamValue('$source.users.1.id', {}, sources)).toBe('8');
		expect(resolveParamValue('$source.users.0.tags.1', {}, sources)).toBe('b');
	});

	it('is empty for a source that is absent or null, whatever the path', () => {
		expect(resolveParamValue('$source.nope.id', {}, sources)).toBe('');
		expect(resolveParamValue('$source.missing.id', {}, sources)).toBe('');
	});

	it('is empty as soon as the path leaves the data (missing key, index past the end, step into null)', () => {
		expect(resolveParamValue('$source.cfg.nested.absent', {}, sources)).toBe('');
		expect(resolveParamValue('$source.cfg.nested.empty.deeper', {}, sources)).toBe('');
		expect(resolveParamValue('$source.users.5.id', {}, sources)).toBe('');
		expect(resolveParamValue('$source.users.0.id.more.again', {}, sources)).toBe('');
	});

	it('keeps falsy values that are real: 0, false and the empty string are returned as text, only null/undefined are empty', () => {
		expect(resolveParamValue('$source.cfg.nested.n', {}, sources)).toBe('0');
		expect(resolveParamValue('$source.cfg.nested.flag', {}, sources)).toBe('false');
		expect(resolveParamValue('$source.cfg.nested.text', {}, sources)).toBe('');
		expect(resolveParamValue('$source.cfg.nested.empty', {}, sources)).toBe('');
	});

	it('an array source with a non-numeric segment resolves to nothing instead of throwing', () => {
		expect(resolveParamValue('$source.users.first.id', {}, sources)).toBe('');
	});
});

describe('resolveParamValue: values that are not there', () => {
	it('$urlParam without search params, and an absent param, are empty', () => {
		expect(resolveParamValue('$urlParam.q', {}, noSources, undefined)).toBe('');
		expect(resolveParamValue('$urlParam.q', {}, noSources, new URLSearchParams('other=1'))).toBe('');
	});

	it('$route without route params, and an absent param, are empty', () => {
		expect(resolveParamValue('$route.id', {}, noSources, undefined, undefined)).toBe('');
		expect(resolveParamValue('$route.id', {}, noSources, undefined, { other: 'x' })).toBe('');
	});

	it('$ctx and $vars give empty for null, undefined and missing, but real falsy values as text', () => {
		const ctx = { zero: 0, off: false, nothing: null, $vars: { zero: 0, nothing: null } };

		expect(resolveParamValue('$ctx.zero', ctx, noSources)).toBe('0');
		expect(resolveParamValue('$ctx.off', ctx, noSources)).toBe('false');
		expect(resolveParamValue('$ctx.nothing', ctx, noSources)).toBe('');
		expect(resolveParamValue('$ctx.absent', ctx, noSources)).toBe('');
		expect(resolveParamValue('$vars.zero', ctx, noSources)).toBe('0');
		expect(resolveParamValue('$vars.nothing', ctx, noSources)).toBe('');
		expect(resolveParamValue('$vars.absent', ctx, noSources)).toBe('');
		expect(resolveParamValue('$vars.any', {}, noSources)).toBe('');
	});
});

describe('SourceManager invalidation', () => {
	function filled() {
		const manager = new SourceManager();
		manager.set('a:/one', 1, 60_000);
		manager.set('a:/two', 2, 60_000);
		manager.set('b:/one', 3, 60_000);
		return manager;
	}

	it('invalidate drops exactly one entry', () => {
		const manager = filled();

		manager.invalidate('a:/one');

		expect(manager.get('a:/one')).toBeNull();
		expect(manager.get('a:/two')).toBe(2);
		expect(manager.get('b:/one')).toBe(3);
	});

	it('invalidateAll drops exactly the listed entries', () => {
		const manager = filled();

		manager.invalidateAll(['a:/one', 'b:/one']);

		expect(manager.get('a:/one')).toBeNull();
		expect(manager.get('b:/one')).toBeNull();
		expect(manager.get('a:/two')).toBe(2);
	});

	it('invalidateAll with nothing to drop changes nothing', () => {
		const manager = filled();

		manager.invalidateAll([]);

		expect(manager.get('a:/one')).toBe(1);
	});

	it('invalidateSource drops every url of one source and leaves the others, and a prefix is not enough', () => {
		const manager = filled();
		manager.set('ab:/one', 4, 60_000);

		manager.invalidateSource('a');

		expect(manager.get('a:/one')).toBeNull();
		expect(manager.get('a:/two')).toBeNull();
		expect(manager.get('b:/one')).toBe(3);
		// "ab" starts with "a" but is another source: only keys with the "a:" prefix go.
		expect(manager.get('ab:/one')).toBe(4);
	});
});
