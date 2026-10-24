import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createRegistry } from './ComponentRegistry.js';
import type { ComponentRegistryEntry } from './ComponentRegistry.js';
import { computeRegistryFingerprint } from './registryHash.js';

const Label: ComponentRegistryEntry = {
	name: 'Label',
	category: 'atomic',
	tags: [],
	render: () => null,
};

const Panel: ComponentRegistryEntry = {
	name: 'Panel',
	category: 'disposition',
	tags: [],
	allowedChildren: { items: ['atomic'] },
	render: () => null,
};

describe('computeRegistryFingerprint', () => {
	it('is stable across two calls on the same registry', () => {
		const registry = createRegistry([Label, Panel]);
		expect(computeRegistryFingerprint(registry)).toBe(computeRegistryFingerprint(registry));
	});

	it('changes when a component is added', () => {
		const before = computeRegistryFingerprint(createRegistry([Label]));
		const after = computeRegistryFingerprint(createRegistry([Label, Panel]));
		expect(before).not.toBe(after);
	});

	it('changes when a component is removed', () => {
		const before = computeRegistryFingerprint(createRegistry([Label, Panel]));
		const after = computeRegistryFingerprint(createRegistry([Label]));
		expect(before).not.toBe(after);
	});

	it('changes when nodeSchema is added', () => {
		const before = computeRegistryFingerprint(createRegistry([Label]));
		const withSchema: ComponentRegistryEntry = { ...Label, nodeSchema: z.object({}) };
		const after = computeRegistryFingerprint(createRegistry([withSchema]));
		expect(before).not.toBe(after);
	});

	it('changes when ctxSchema is added', () => {
		const before = computeRegistryFingerprint(createRegistry([Label]));
		const withSchema: ComponentRegistryEntry = { ...Label, ctxSchema: z.object({}) };
		const after = computeRegistryFingerprint(createRegistry([withSchema]));
		expect(before).not.toBe(after);
	});

	it('changes when knownKeys is added', () => {
		const before = computeRegistryFingerprint(createRegistry([Label]));
		const withKeys: ComponentRegistryEntry = { ...Label, knownKeys: ['label'] };
		const after = computeRegistryFingerprint(createRegistry([withKeys]));
		expect(before).not.toBe(after);
	});

	it('changes when allowedChildren keys change', () => {
		const before = computeRegistryFingerprint(createRegistry([Panel]));
		const changed: ComponentRegistryEntry = { ...Panel, allowedChildren: { items: ['atomic'], footer: ['atomic'] } };
		const after = computeRegistryFingerprint(createRegistry([changed]));
		expect(before).not.toBe(after);
	});

	it('is unchanged when only the render body changes', () => {
		const before = computeRegistryFingerprint(createRegistry([Label]));
		const changed: ComponentRegistryEntry = { ...Label, render: () => null };
		const after = computeRegistryFingerprint(createRegistry([changed]));
		expect(before).toBe(after);
	});
});

describe('computeRegistryFingerprint mapSlots', () => {
	it('changes when a map slot is added, and is unchanged for entries without one', () => {
		const before = computeRegistryFingerprint(createRegistry([Panel]));
		const withMap: ComponentRegistryEntry = { ...Panel, mapSlots: { variants: { keys: ['view'], nodeKey: 'view' } } };
		expect(computeRegistryFingerprint(createRegistry([withMap]))).not.toBe(before);
		expect(computeRegistryFingerprint(createRegistry([{ ...Panel, mapSlots: {} }]))).toBe(before);
	});
});

describe('computeRegistryFingerprint itemKeys', () => {
	it('changes when item keys are added, and is unchanged for entries without any', () => {
		const before = computeRegistryFingerprint(createRegistry([Panel]));
		const withItems: ComponentRegistryEntry = { ...Panel, itemKeys: { columns: { keys: ['field'] } } };
		expect(computeRegistryFingerprint(createRegistry([withItems]))).not.toBe(before);
		expect(computeRegistryFingerprint(createRegistry([{ ...Panel, itemKeys: {} }]))).toBe(before);
	});
});

// Independent FNV-1a 32 (BigInt), checked against the published test vectors, so the fingerprint is pinned to the
// algorithm and not only to its own output: a stored compiled artifact is compared against this value across versions.
function referenceFnv1a(input: string): string {
	let hash = 0x811c9dc5n;
	for (const byte of new TextEncoder().encode(input)) {
		hash = ((hash ^ BigInt(byte)) * 0x01000193n) & 0xffffffffn;
	}
	return hash.toString(16).padStart(8, '0');
}

describe('computeRegistryFingerprint algorithm', () => {
	it('the reference FNV-1a matches the published vectors', () => {
		expect(referenceFnv1a('')).toBe('811c9dc5');
		expect(referenceFnv1a('a')).toBe('e40c292c');
		expect(referenceFnv1a('foobar')).toBe('bf9cf968');
	});

	it('hashes "name|category|nodeSchema|ctxSchema|knownKeys|allowedChildren keys", one line per entry, sorted by name', () => {
		const Beta: ComponentRegistryEntry = { ...Panel, name: 'Beta', knownKeys: ['items'], allowedChildren: { items: ['atomic'], footer: ['atomic'] } };
		const registry = createRegistry([Beta, Label]);
		expect(computeRegistryFingerprint(registry)).toBe(referenceFnv1a('Label|atomic|0|0|0|\nBeta|disposition|0|0|1|footer,items'.split('\n').sort().join('\n')));
	});

	it('pins known fingerprints (a change here invalidates every stored compiled artifact on purpose)', () => {
		const Beta: ComponentRegistryEntry = { ...Panel, name: 'Beta', knownKeys: ['items'], allowedChildren: { items: ['atomic'], footer: ['atomic'] } };
		expect(computeRegistryFingerprint(createRegistry([]))).toBe('811c9dc5');
		expect(computeRegistryFingerprint(createRegistry([{ ...Label, name: 'Alpha' }, Beta]))).toBe('9fd7e9f3');
		// Map slots and item keys append one more segment, only when present.
		expect(computeRegistryFingerprint(createRegistry([{ ...Beta, mapSlots: { variants: { keys: ['view'], nodeKey: 'view' } } }]))).toBe('92c83d88');
		expect(computeRegistryFingerprint(createRegistry([{ ...Beta, itemKeys: { columns: { keys: ['field'] } } }]))).toBe('f1f7f44f');
		expect(computeRegistryFingerprint(createRegistry([{ ...Label, name: 'Alpha', nodeSchema: z.object({}), ctxSchema: z.object({}) }]))).toBe('1d637ac8');
	});

	it('does not depend on the order entries or their keys were declared in', () => {
		const a: ComponentRegistryEntry = {
			...Panel,
			allowedChildren: { b: ['atomic'], a: ['atomic'] },
			mapSlots: { y: { keys: ['v'], nodeKey: 'v' }, x: { keys: ['v'], nodeKey: 'v' } },
			itemKeys: { q: { keys: ['k'] }, p: { keys: ['k'] } },
		};
		const b: ComponentRegistryEntry = {
			...Panel,
			allowedChildren: { a: ['atomic'], b: ['atomic'] },
			mapSlots: { x: { keys: ['v'], nodeKey: 'v' }, y: { keys: ['v'], nodeKey: 'v' } },
			itemKeys: { p: { keys: ['k'] }, q: { keys: ['k'] } },
		};
		expect(computeRegistryFingerprint(createRegistry([a, Label]))).toBe(computeRegistryFingerprint(createRegistry([Label, b])));
	});

	it('distinguishes what the entry hashes: category, and which of map slots / item keys is present', () => {
		const base = computeRegistryFingerprint(createRegistry([Panel]));
		expect(computeRegistryFingerprint(createRegistry([{ ...Panel, category: 'atomic' }]))).not.toBe(base);
		const withMap = computeRegistryFingerprint(createRegistry([{ ...Panel, mapSlots: { columns: { keys: ['v'], nodeKey: 'v' } } }]));
		const withItems = computeRegistryFingerprint(createRegistry([{ ...Panel, itemKeys: { columns: { keys: ['v'] } } }]));
		expect(withMap).not.toBe(withItems);
	});
});
