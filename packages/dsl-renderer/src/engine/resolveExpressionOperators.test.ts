import { describe, expect, it } from 'vitest';

import { resolveExpressionValue } from './DslRenderer.js';

// The renderer-level contract of the operator grammar (the grammar itself is pinned in ../expression.test.ts):
// paths resolve through the real resolver, and strings that are not expressions come back untouched.
const ctx = {
	$vars: { payload: 'edited', search: '' },
	validated: { payload: 'sent' },
	validation: { valid: true },
	event: { name: 'ping' },
};

describe('resolveExpressionValue with operators', () => {
	it('compares two page values', () => {
		expect(resolveExpressionValue('$vars.payload != $validated.payload', ctx)).toBe(true);
		expect(resolveExpressionValue('$vars.payload == $validated.payload', ctx)).toBe(false);
	});

	it('resolves $sources paths, $vars paths and ctx names in the same expression', () => {
		expect(resolveExpressionValue("$sources.event.name == 'ping' && $validation.valid", ctx)).toBe(true);
		expect(resolveExpressionValue('!$validation.valid || $vars.search', ctx)).toBe('');
	});

	it('the disabled rule from the queue page', () => {
		const disabled = '!$validation.valid || $vars.payload != $validated.payload';
		expect(resolveExpressionValue(disabled, ctx)).toBe(true);
		expect(resolveExpressionValue(disabled, { ...ctx, $vars: { payload: 'sent' } })).toBe(false);
		expect(resolveExpressionValue(disabled, { ...ctx, validation: undefined })).toBe(true);
	});

	it('a plain path still resolves exactly as before, including a missing one', () => {
		expect(resolveExpressionValue('$sources.event.name', ctx)).toBe('ping');
		expect(resolveExpressionValue('$vars.search', ctx)).toBe('');
		expect(resolveExpressionValue('$sources.event.missing.deeper', ctx)).toBeUndefined();
	});

	it.each(['!important', 'plain text', '5 == 5', '(a)', '!5', '$vars.payload =='])('%s that is not an expression is returned as is, or as the old path lookup', source => {
		const resolved = resolveExpressionValue(source, ctx);
		if (source.startsWith('$')) {
			expect(resolved).toBeUndefined();
		} else {
			expect(resolved).toBe(source);
		}
	});

	it('leaves non-strings alone', () => {
		const value = { a: 1 };
		expect(resolveExpressionValue(value, ctx)).toBe(value);
		expect(resolveExpressionValue(5, ctx)).toBe(5);
		expect(resolveExpressionValue(undefined, ctx)).toBeUndefined();
	});
});
