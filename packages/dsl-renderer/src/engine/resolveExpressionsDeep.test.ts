import { describe, expect, it } from 'vitest';

import { resolveExpressionsDeep, resolveExpressionValue } from './DslRenderer.js';

const ctx = { $vars: { name: 'ping', n: 0, flag: false }, event: { name: 'a b', tags: ['x', 'y'] } };

describe('resolveExpressionsDeep', () => {
	it('resolves the expressions held by the values of a map, keeping keys and literals', () => {
		expect(resolveExpressionsDeep({ name: '$vars.name', source: '$sources.event.name', literal: 'plain', price: 'cost $5' }, ctx)).toStrictEqual({
			name: 'ping',
			source: 'a b',
			literal: 'plain',
			price: 'cost $5',
		});
	});

	it('goes through nested maps and lists', () => {
		expect(resolveExpressionsDeep({ a: { b: ['$vars.name', { c: '$sources.event.tags' }] } }, ctx)).toStrictEqual({
			a: { b: ['ping', { c: ['x', 'y'] }] },
		});
	});

	it('keeps falsy resolved values (0, false) and turns an unresolvable expression into undefined', () => {
		expect(resolveExpressionsDeep({ n: '$vars.n', flag: '$vars.flag', missing: '$vars.nope' }, ctx)).toStrictEqual({
			n: 0,
			flag: false,
			missing: undefined,
		});
	});

	it('returns non-container values as they are and agrees with resolveExpressionValue on a bare string', () => {
		expect(resolveExpressionsDeep(undefined, ctx)).toBeUndefined();
		expect(resolveExpressionsDeep(null, ctx)).toBeNull();
		expect(resolveExpressionsDeep(42, ctx)).toBe(42);
		expect(resolveExpressionsDeep('$vars.name', ctx)).toBe(resolveExpressionValue('$vars.name', ctx));
	});

	it('does not mutate its input', () => {
		const input = { name: '$vars.name' };
		resolveExpressionsDeep(input, ctx);
		expect(input).toStrictEqual({ name: '$vars.name' });
	});
});
