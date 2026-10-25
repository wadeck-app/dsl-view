import { afterEach, describe, expect, it, vi } from 'vitest';

import { compileDslDocument } from './dslCompiler.js';
import type { ComponentRegistry } from '../ComponentRegistry.js';
import { findUnknownKeys } from './unknownKeys.js';
import type { DslKeysManifest } from './unknownKeys.js';

// A generated registry loaded under NODE_ENV=production has `knownKeys = []` on every entry (the lists are authoring
// data that production bundles drop). Walking it would call every authored key unknown, or hide a typo; it must stop.
const stripped: DslKeysManifest = { Label: { knownKeys: [] }, Card: { knownKeys: [] }, Box: { knownKeys: [] } };
const real: DslKeysManifest = { Label: { knownKeys: ['label'] }, Card: { knownKeys: ['items'] } };
const page = { $type: 'Label', label: 'x' };

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('findUnknownKeys on a registry whose key lists were stripped by NODE_ENV=production', () => {
	it('refuses, naming the cause and the fix', () => {
		vi.stubEnv('NODE_ENV', 'production');

		expect(() => findUnknownKeys(page, stripped)).toThrow(/NODE_ENV=production.*NODE_ENV=development.*known-keys\.json/s);
	});

	it('refuses through compileDslDocument too, instead of producing an artifact', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const registry = Object.fromEntries(
			Object.keys(stripped).map((name) => [name, { name, category: 'atomic', tags: [], nodeSchema: null as never, render: () => null, knownKeys: [] }])
		) as ComponentRegistry;

		expect(() => compileDslDocument('$type: Label\nlabel: x\n', registry)).toThrow(/\[findUnknownKeys\]/);
	});

	it.each(['development', 'test'])('checks normally under NODE_ENV=%s (an empty list there means a component with no keys)', (env) => {
		vi.stubEnv('NODE_ENV', env);

		expect(findUnknownKeys({ $type: 'Label', colour: 'red' }, stripped)).toEqual([expect.objectContaining({ code: 'unknown-key', type: 'Label' })]);
	});

	it('accepts a manifest with real key lists under production (the shipped known-keys.json)', () => {
		vi.stubEnv('NODE_ENV', 'production');

		expect(findUnknownKeys(page, real)).toEqual([]);
		expect(findUnknownKeys({ $type: 'Label', colour: 'red' }, real)).toEqual([expect.objectContaining({ code: 'unknown-key' })]);
	});

	it('accepts one real list next to empty ones, and a single key-less entry on its own', () => {
		vi.stubEnv('NODE_ENV', 'production');

		expect(() => findUnknownKeys(page, { Label: { knownKeys: ['label'] }, Box: { knownKeys: [] } })).not.toThrow();
		expect(() => findUnknownKeys({ $type: 'Box' }, { Box: { knownKeys: [] } })).not.toThrow();
	});

	it('ignores entries without a key list (hand-written) when judging', () => {
		vi.stubEnv('NODE_ENV', 'production');

		expect(() => findUnknownKeys(page, { Label: { knownKeys: ['label'] }, Hand: {}, Other: {} })).not.toThrow();
	});
});
