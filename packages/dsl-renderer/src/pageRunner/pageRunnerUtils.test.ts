import { describe, expect, it } from 'vitest';
import {
	resolveParamValue,
	substituteUrlParams,
	topoSortSources,
	topoLevels,
	parsePollMs,
	SourceManager,
} from './pageRunnerUtils.js';

describe('resolveParamValue', () => {
	it('returns literal string unchanged (no $ prefix)', () => {
		const result = resolveParamValue('hello', {}, {});
		expect(result).toBe('hello');
	});

	it('$ctx.foo resolves from ctx["foo"]', () => {
		const result = resolveParamValue('$ctx.foo', { foo: 'bar' }, {});
		expect(result).toBe('bar');
	});

	it('$ctx.missing returns empty string when key absent', () => {
		const result = resolveParamValue('$ctx.missing', {}, {});
		expect(result).toBe('');
	});

	it('$source.books.title resolves loadedSourceData["books"]["title"]', () => {
		const result = resolveParamValue(
			'$source.books.title',
			{},
			{ books: { title: 'My Book' } }
		);
		expect(result).toBe('My Book');
	});

	it('$source.books.0.id resolves array index books[0].id', () => {
		const result = resolveParamValue(
			'$source.books.0.id',
			{},
			{ books: [{ id: '42' }, { id: '99' }] }
		);
		expect(result).toBe('42');
	});

	it('$source.missing.x returns empty string when source absent', () => {
		const result = resolveParamValue('$source.missing.x', {}, {});
		expect(result).toBe('');
	});

	it('$urlParam.page resolves from searchParams.get("page")', () => {
		const searchParams = new URLSearchParams('page=3');
		const result = resolveParamValue('$urlParam.page', {}, {}, searchParams);
		expect(result).toBe('3');
	});

	it('$urlParam.missing returns empty string when param absent', () => {
		const searchParams = new URLSearchParams();
		const result = resolveParamValue('$urlParam.missing', {}, {}, searchParams);
		expect(result).toBe('');
	});

	it('$route.id resolves from routeParams["id"]', () => {
		const result = resolveParamValue('$route.id', {}, {}, undefined, { id: '7' });
		expect(result).toBe('7');
	});

	it('$vars.currentPath resolves from ctx["$vars"]["currentPath"]', () => {
		const result = resolveParamValue('$vars.currentPath', { '$vars': { currentPath: '/documents' } }, {});
		expect(result).toBe('/documents');
	});

	it('$vars.missing returns empty string when var is absent', () => {
		const result = resolveParamValue('$vars.missing', { '$vars': {} }, {});
		expect(result).toBe('');
	});

	it('$vars.x returns empty string when $vars is absent from ctx', () => {
		const result = resolveParamValue('$vars.x', {}, {});
		expect(result).toBe('');
	});
});

describe('substituteUrlParams', () => {
	it('substitutes a single placeholder', () => {
		const result = substituteUrlParams('GET /api/books/{id}', { id: '42' });
		expect(result).toBe('GET /api/books/42');
	});

	it('substitutes multiple placeholders', () => {
		const result = substituteUrlParams('GET /api/{a}/{b}', { a: 'x', b: 'y' });
		expect(result).toBe('GET /api/x/y');
	});

	it('unmatched placeholder becomes empty string', () => {
		const result = substituteUrlParams('GET /api/{missing}', {});
		expect(result).toBe('GET /api/');
	});
});

describe('topoSortSources', () => {
	it('single source with no params returns that source', () => {
		const result = topoSortSources({ source1: { url: 'GET /api/foo' } });
		expect(result).toEqual(['source1']);
	});

	it('two independent sources returns both (order may vary)', () => {
		const result = topoSortSources({
			a: { url: 'GET /api/a' },
			b: { url: 'GET /api/b' },
		});
		expect(result).toHaveLength(2);
		expect(result).toContain('a');
		expect(result).toContain('b');
	});

	it('b depends on $source.a.id → a comes before b', () => {
		const result = topoSortSources({
			b: { url: 'GET /api/b', params: { id: '$source.a.id' } },
			a: { url: 'GET /api/a' },
		});
		expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'));
	});

	it('three-level chain c→b→a is sorted [a, b, c]', () => {
		const result = topoSortSources({
			c: { url: 'GET /c', params: { x: '$source.b.id' } },
			b: { url: 'GET /b', params: { x: '$source.a.id' } },
			a: { url: 'GET /a' },
		});
		expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'));
		expect(result.indexOf('b')).toBeLessThan(result.indexOf('c'));
	});

	it('circular dependency throws with message containing "Circular"', () => {
		expect(() =>
			topoSortSources({
				a: { url: 'GET /a', params: { x: '$source.b.id' } },
				b: { url: 'GET /b', params: { x: '$source.a.id' } },
			})
		).toThrow(/Circular/i);
	});
});

describe('topoLevels', () => {
	it('two independent keys produce one level with both', () => {
		const result = topoLevels(['a', 'b'], { a: [], b: [] });
		expect(result).toHaveLength(1);
		expect(result[0]).toContain('a');
		expect(result[0]).toContain('b');
	});

	it('b depends on a → two levels: [["a"], ["b"]]', () => {
		const result = topoLevels(['a', 'b'], { a: [], b: ['a'] });
		expect(result).toEqual([['a'], ['b']]);
	});

	it('three-chain a→b→c produces three levels', () => {
		const result = topoLevels(['a', 'b', 'c'], { a: [], b: ['a'], c: ['b'] });
		expect(result).toEqual([['a'], ['b'], ['c']]);
	});
});

describe('parsePollMs', () => {
	it('"10s" returns 10000', () => {
		expect(parsePollMs('10s')).toBe(10000);
	});

	it('"2m" returns 120000', () => {
		expect(parsePollMs('2m')).toBe(120000);
	});

	it('"bad" throws', () => {
		expect(() => parsePollMs('bad')).toThrow();
	});
});

describe('SourceManager', () => {
	it('get returns null initially', () => {
		const mgr = new SourceManager();
		expect(mgr.get('key')).toBeNull();
	});

	it('set then get returns the value', () => {
		const mgr = new SourceManager();
		mgr.set('myKey', { data: 42 }, 60_000);
		expect(mgr.get('myKey')).toEqual({ data: 42 });
	});

	it('set with TTL 1ms, after 2ms get returns null (expired)', async () => {
		const mgr = new SourceManager();
		mgr.set('expKey', 'value', 1);
		await new Promise(resolve => setTimeout(resolve, 5));
		expect(mgr.get('expKey')).toBeNull();
	});

	it('invalidateSource removes all keys with that prefix', () => {
		const mgr = new SourceManager();
		mgr.set('books:/api/books', ['a', 'b'], 60_000);
		mgr.set('books:/api/books?page=2', ['c'], 60_000);
		mgr.set('authors:/api/authors', ['d'], 60_000);
		mgr.invalidateSource('books');
		expect(mgr.get('books:/api/books')).toBeNull();
		expect(mgr.get('books:/api/books?page=2')).toBeNull();
		// authors should be unaffected
		expect(mgr.get('authors:/api/authors')).toEqual(['d']);
	});
});
