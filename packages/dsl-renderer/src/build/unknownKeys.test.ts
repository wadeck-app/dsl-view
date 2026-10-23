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
					ok: { url: 'POST /a', successMessage: 'Done', errorPrefix: 'Could not', notify: false, reloadSources: true, confirm: 'Sure?', resultKey: 'k', strictParams: true },
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

describe('itemKeys (an array of plain objects authored in YAML, e.g. DataTable columns)', () => {
	const itemManifest: DslKeysManifest = {
		Table: {
			knownKeys: ['columns'],
			itemKeys: {
				columns: {
					keys: ['field', 'label', 'width'],
					byType: { actions: { keys: ['type', 'items'], arrays: { items: { keys: ['label', 'action'] } } } },
				},
			},
		},
	};

	it('accepts supported column keys, an expression string, and a missing prop', () => {
		expect(findUnknownKeys({ $type: 'Table', columns: [{ field: 'a', label: 'A', width: 4 }] }, itemManifest)).toEqual([]);
		expect(findUnknownKeys({ $type: 'Table', columns: '$sources.cols' }, itemManifest)).toEqual([]);
		expect(findUnknownKeys({ $type: 'Table' }, itemManifest)).toEqual([]);
	});

	it('reports an ignored column key with its path, a suggestion and the known keys', () => {
		const diagnostics = findUnknownKeys({ $type: 'Table', columns: [{ field: 'a' }, { field: 'b', widht: 4 }] }, itemManifest);
		expect(diagnostics).toEqual([
			expect.objectContaining({
				code: 'unknown-key',
				type: 'Table',
				nodePath: '$.columns[1]',
				message: expect.stringContaining('Did you mean "width"?'),
			}),
		]);
		expect(diagnostics[0]!.message).toContain('Known keys: field, label, width');
	});

	it('uses the variant selected by type and follows nested arrays', () => {
		const diagnostics = findUnknownKeys(
			{ $type: 'Table', columns: [{ type: 'actions', items: [{ label: 'Go', action: 'go', colour: 'red' }], label: 'x' }] },
			itemManifest
		);
		expect(diagnostics.map((d) => [d.nodePath, d.message.match(/unknown key "(\w+)"/)?.[1]])).toEqual([
			['$.columns[0]', 'label'],
			['$.columns[0].items[0]', 'colour'],
		]);
	});

	it('flags a type the default item does not declare, and a non-list or non-map value', () => {
		expect(findUnknownKeys({ $type: 'Table', columns: [{ type: 'text', field: 'a' }] }, itemManifest)).toEqual([
			expect.objectContaining({ code: 'unknown-key', nodePath: '$.columns[0]' }),
		]);
		expect(findUnknownKeys({ $type: 'Table', columns: { field: 'a' } }, itemManifest)).toEqual([
			expect.objectContaining({ code: 'invalid-item-keys', nodePath: '$.columns' }),
		]);
		expect(findUnknownKeys({ $type: 'Table', columns: ['a'] }, itemManifest)).toEqual([
			expect.objectContaining({ code: 'invalid-item-keys', nodePath: '$.columns[0]' }),
		]);
	});

	it('survives the JSON round trip of buildKnownKeysManifest', () => {
		const built = buildKnownKeysManifest([{ name: 'Table', knownKeys: ['columns'], itemKeys: { columns: { keys: ['field'] } } }]);
		expect(JSON.parse(JSON.stringify(built))['Table'].itemKeys).toEqual({ columns: { keys: ['field'] } });
	});
});
