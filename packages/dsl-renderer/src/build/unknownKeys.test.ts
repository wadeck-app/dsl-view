import { describe, expect, it } from 'vitest';

import { buildKnownKeysManifest, findUnknownKeys } from './unknownKeys.js';
import type { DslKeysManifest } from './unknownKeys.js';

const manifest: DslKeysManifest = {
	VerticalStack: { knownKeys: ['gap', 'items'], allowedChildren: { items: ['layout'] } },
	Label: { knownKeys: ['label'] },
	Handwritten: {},
};

describe('findUnknownKeys (manifest only, no registry, no React)', () => {
	it('reports children under a container and suggests items', () => {
		const diagnostics = findUnknownKeys({ $type: 'VerticalStack', children: [] }, manifest);
		expect(diagnostics).toEqual([
			expect.objectContaining({ code: 'unknown-key', type: 'VerticalStack', nodePath: '$', message: expect.stringContaining('Did you mean "items"?') }),
		]);
	});

	it('recurses through allowedChildren and reports the nested path', () => {
		const diagnostics = findUnknownKeys({ $type: 'VerticalStack', items: [{ $type: 'Label', label: 'x', colour: 'red' }] }, manifest);
		expect(diagnostics).toEqual([expect.objectContaining({ code: 'unknown-key', type: 'Label', nodePath: '$.items[0]' })]);
	});

	it('strips page-level keys and $nav* like the runtime', () => {
		const diagnostics = findUnknownKeys({ $route: '/x', $navLabel: 'X', $sources: {}, $type: 'Label', label: 'hi' }, manifest);
		expect(diagnostics).toEqual([]);
	});

	it('flags an unknown component type, unless skipType says the manifest cannot describe it', () => {
		const doc = { $type: 'VerticalStack', items: [{ $type: 'mod:Custom', anything: 1 }] };
		expect(findUnknownKeys(doc, manifest)).toEqual([expect.objectContaining({ code: 'unknown-component-type', type: 'mod:Custom' })]);
		expect(findUnknownKeys(doc, manifest, { skipType: (type) => type.includes(':') })).toEqual([]);
	});

	it('warns (never silently skips) when an entry has no knownKeys', () => {
		const diagnostics = findUnknownKeys({ $type: 'Handwritten', foo: 1 }, manifest);
		expect(diagnostics).toEqual([expect.objectContaining({ severity: 'warning', code: 'unchecked-keys' })]);
	});
});

describe('buildKnownKeysManifest', () => {
	it('is sorted, omits empty allowedChildren and round-trips through JSON', () => {
		const built = buildKnownKeysManifest([
			{ name: 'Label', knownKeys: ['label', 'bind'], allowedChildren: {} },
			{ name: 'Card', knownKeys: ['items'], allowedChildren: { items: ['layout'] } },
		]);
		expect(Object.keys(built)).toEqual(['Card', 'Label']);
		expect(built['Label']).toEqual({ knownKeys: ['bind', 'label'] });
		expect(JSON.parse(JSON.stringify(built))).toEqual(built);
	});
});
