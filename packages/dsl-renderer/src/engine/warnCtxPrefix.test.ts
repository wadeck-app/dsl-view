import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveExpressionValue } from './DslRenderer.js';
import { resetCtxPrefixWarnings, warnMissingCtxPrefix } from './warnCtxPrefix.js';

// The page state keys start with `$`, and `$name` in YAML reads ctx["name"]: `$initialLoading` silently resolved to
// undefined while `$ctx.$initialLoading` works. These tests pin the working form and the one warning for the other.
const ctx = { $initialLoading: true, $refreshing: false, $actionPending: { clear: true }, books: [1, 2] };

describe('page state keys that start with $', () => {
	let warn: ReturnType<typeof vi.spyOn>;
	beforeEach(() => {
		resetCtxPrefixWarnings();
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});
	afterEach(() => {
		warn.mockRestore();
	});

	it('$ctx.$initialLoading reads the page state, with no warning', () => {
		expect(resolveExpressionValue('$ctx.$initialLoading', ctx)).toBe(true);
		expect(resolveExpressionValue('$ctx.$refreshing', ctx)).toBe(false);
		expect(resolveExpressionValue('$ctx.$actionPending.clear', ctx)).toBe(true);
		expect(warn).not.toHaveBeenCalled();
	});

	it('$initialLoading (no $ctx.) resolves to undefined and names the working form in one warning', () => {
		expect(resolveExpressionValue('$initialLoading', ctx)).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]![0]);
		expect(message).toContain('[DslRenderer]');
		expect(message).toContain('"$initialLoading"');
		expect(message).toContain('ctx["initialLoading"]');
		expect(message).toContain('"$ctx.$initialLoading"');
	});

	it('warns once per name, however many times it resolves, and once for each different name', () => {
		resolveExpressionValue('$initialLoading', ctx);
		resolveExpressionValue('$initialLoading', ctx);
		expect(warn).toHaveBeenCalledTimes(1);
		resolveExpressionValue('$actionPending.clear', ctx);
		expect(warn).toHaveBeenCalledTimes(2);
		expect(String(warn.mock.calls[1]![0])).toContain('"$ctx.$actionPending"');
	});

	it('still returns undefined (the value never changes) for the nested form', () => {
		expect(resolveExpressionValue('$actionPending.clear', ctx)).toBeUndefined();
	});

	it('does not warn for a name that exists in ctx, a name that exists nowhere, or an own key without $', () => {
		expect(resolveExpressionValue('$books', ctx)).toEqual([1, 2]);
		expect(resolveExpressionValue('$nothingHere', ctx)).toBeUndefined();
		expect(resolveExpressionValue('$ctx.$nothingHere', ctx)).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
	});

	it('does not warn when both ctx.name and ctx.$name exist (the author reads the plain one on purpose)', () => {
		expect(resolveExpressionValue('$loading', { loading: undefined, $loading: true })).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
	});

	it('is silent in production and for an empty root', () => {
		vi.stubEnv('NODE_ENV', 'production');
		try {
			warnMissingCtxPrefix('initialLoading', ctx);
			expect(warn).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllEnvs();
		}
		warnMissingCtxPrefix(undefined, ctx);
		warnMissingCtxPrefix('', ctx);
		expect(warn).not.toHaveBeenCalled();
	});

	it('does not mistake an inherited property for page state', () => {
		resolveExpressionValue('$toString', ctx);
		resolveExpressionValue('$constructor', ctx);
		expect(warn).not.toHaveBeenCalled();
	});
});
