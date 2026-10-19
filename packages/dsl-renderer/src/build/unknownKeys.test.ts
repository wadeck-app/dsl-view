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

	it('reports an unknown $actions key with a suggestion, and accepts the feedback knobs', () => {
		const diagnostics = findUnknownKeys(
			{
				$actions: {
					ok: { url: 'POST /a', successMessage: 'Done', errorPrefix: 'Could not', notify: false, reloadSources: true, confirm: 'Sure?', resultKey: 'k' },
					typo: { url: 'POST /b', sucessMessage: 'x' },
					shorthand: 'POST /c',
				},
				$type: 'Label',
				label: 'hi',
			},
			manifest
		);
		expect(diagnostics).toEqual([
			expect.objectContaining({
				code: 'unknown-action-key',
				severity: 'error',
				nodePath: '$actions.typo',
				message: expect.stringContaining('Did you mean "successMessage"?'),
			}),
		]);
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

describe('mapSlots (a map of named entries that each carry a nested node)', () => {
	const mapManifest: DslKeysManifest = {
		...manifest,
		Experiment: {
			knownKeys: ['id', 'initial', 'label', 'variants'],
			mapSlots: { variants: { keys: ['hint', 'label', 'view'], nodeKey: 'view' } },
		},
	};
	const variant = (view: unknown, extra: Record<string, unknown> = {}) => ({ label: 'A', hint: 'a', view, ...extra });

	it('recurses into each entry node and reports the nested path', () => {
		const doc = { $type: 'Experiment', id: 't', label: 'T', initial: 'a', variants: { a: variant({ $type: 'Label', label: 'x', colour: 'red' }) } };
		expect(findUnknownKeys(doc, mapManifest)).toEqual([
			expect.objectContaining({ code: 'unknown-key', type: 'Label', nodePath: '$.variants.a.view' }),
		]);
	});

	it('reports an unknown key inside an entry and suggests the closest one', () => {
		const doc = { $type: 'Experiment', variants: { a: variant({ $type: 'Label', label: 'x' }, { hnt: 'typo' }) } };
		expect(findUnknownKeys(doc, mapManifest)).toEqual([
			expect.objectContaining({ code: 'unknown-key', type: 'Experiment', nodePath: '$.variants.a', message: expect.stringContaining('Did you mean "hint"?') }),
		]);
	});

	it('reports an entry without its node, an entry that is not a map, and a slot that is not a map', () => {
		const noView = { $type: 'Experiment', variants: { a: { label: 'A', hint: 'a' } } };
		expect(findUnknownKeys(noView, mapManifest)).toEqual([
			expect.objectContaining({ code: 'invalid-map-slot', nodePath: '$.variants.a', message: expect.stringContaining('no "view"') }),
		]);
		const scalarEntry = { $type: 'Experiment', variants: { a: 'oops' } };
		expect(findUnknownKeys(scalarEntry, mapManifest)).toEqual([expect.objectContaining({ code: 'invalid-map-slot', nodePath: '$.variants.a' })]);
		const arraySlot = { $type: 'Experiment', variants: [] };
		expect(findUnknownKeys(arraySlot, mapManifest)).toEqual([expect.objectContaining({ code: 'invalid-map-slot', nodePath: '$' })]);
	});

	it('does not report anything for a valid experiment, nested ones included', () => {
		const inner = { $type: 'Experiment', variants: { x: variant({ $type: 'Label', label: 'deep' }) } };
		const doc = { $type: 'Experiment', variants: { a: variant({ $type: 'Label', label: 'x' }), b: variant(inner) } };
		expect(findUnknownKeys(doc, mapManifest)).toEqual([]);
	});

	it('is carried by buildKnownKeysManifest and survives JSON', () => {
		const built = buildKnownKeysManifest([{ name: 'Experiment', knownKeys: ['variants'], mapSlots: { variants: { keys: ['view'], nodeKey: 'view' } } }]);
		expect(JSON.parse(JSON.stringify(built))['Experiment'].mapSlots).toEqual({ variants: { keys: ['view'], nodeKey: 'view' } });
	});
});
