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
