import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRegistry } from '../ComponentRegistry.js';
import { isDevelopment } from './devMode.js';
import { renderChildren } from './DslRenderer.js';
import { resetUnknownKeyWarnings } from './warnUnknownKeys.js';

const registry = createRegistry([]);

beforeEach(() => {
	resetUnknownKeyWarnings();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe('renderChildren authoring-mistake warnings (development only)', () => {
	it('stays quiet when the children are absent (a container without items is legitimate)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		expect(renderChildren(undefined, registry, {})).toEqual([]);
		expect(renderChildren(null, registry, {})).toEqual([]);
		expect(warn).not.toHaveBeenCalled();
	});

	it('stays quiet for a list of nodes, an empty list included', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		renderChildren([], registry, {});
		renderChildren([{ $type: 'Nope' }], registry, {});
		expect(warn).not.toHaveBeenCalled();
	});

	it('warns once when the children are an unresolved expression instead of a list, naming it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		expect(renderChildren('$sources.rows', registry, {})).toEqual([]);
		renderChildren('$sources.rows', registry, {});
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]![0]);
		expect(message).toContain('[DslRenderer]');
		expect(message).toContain('got "$sources.rows"');
		expect(message).toContain('items:');
	});

	it('warns for a mapping given instead of a list', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		expect(renderChildren({ $type: 'Label' }, registry, {})).toEqual([]);
		expect(String(warn.mock.calls[0]![0])).toContain('got object');
	});

	it('warns about a child that is not a node, and skips it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const rendered = renderChildren(['Label', null, ['nested'], 7, { $type: 'Nope' }], registry, {});
		expect(rendered).toHaveLength(1);
		const messages = warn.mock.calls.map(c => String(c[0]));
		expect(messages.some(m => m.includes('is "Label" instead of a node'))).toBe(true);
		expect(messages.some(m => m.includes('is null instead of a node'))).toBe(true);
		expect(messages.some(m => m.includes('is a nested list instead of a node'))).toBe(true);
		expect(messages.some(m => m.includes('is number instead of a node'))).toBe(true);
	});

	it('is silent in production', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		renderChildren('$sources.rows', registry, {});
		renderChildren(['x'], registry, {});
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('isDevelopment', () => {
	it('is true outside production and false in production', () => {
		vi.stubEnv('NODE_ENV', 'development');
		expect(isDevelopment()).toBe(true);
		vi.stubEnv('NODE_ENV', 'test');
		expect(isDevelopment()).toBe(true);
		vi.stubEnv('NODE_ENV', 'production');
		expect(isDevelopment()).toBe(false);
	});
});
