import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildKnownKeysManifest, findUnknownKeys } from './unknownKeys.js';
import type { DslKeysManifest } from './unknownKeys.js';

// Shapes of the document itself and of what sits in a slot: every one of them renders nothing at runtime, so none may pass silently.

const manifest: DslKeysManifest = {
	Stack: { knownKeys: ['items'], allowedChildren: { items: ['atomic'] } },
	Label: { knownKeys: ['label'] },
	Checked: { knownKeys: ['n'], nodeSchema: z.object({ n: z.number() }).passthrough() },
	Variants: { knownKeys: ['variants'], mapSlots: { variants: { keys: ['view', 'label', 'hint'], nodeKey: 'view' } } },
};

describe('document shape', () => {
	it.each([
		['undefined (an empty file)', undefined, 'The page must be a YAML map with a $type, got undefined (an empty file?)'],
		['null (a file with only comments)', null, 'The page must be a YAML map with a $type, got null (an empty file?)'],
		['a list', [], 'The page must be a YAML map with a $type, got a list'],
		['a scalar', 'text', 'The page must be a YAML map with a $type, got string'],
	])('reports %s as an invalid-node error instead of throwing', (_name, doc, expected) => {
		const diagnostics = findUnknownKeys(doc as unknown as Record<string, unknown>, manifest);
		expect(diagnostics).toEqual([
			{
				severity: 'error',
				type: '(document)',
				nodePath: '$',
				code: 'invalid-node',
				message: expected,
			},
		]);
	});

	it('reports a page without $type (nothing would render), naming what it got', () => {
		expect(findUnknownKeys({ $route: '/x', label: 'a' }, manifest)).toEqual([
			{ severity: 'error', type: '(document)', nodePath: '$', code: 'missing-type', message: '[(document)] $ has no $type (got nothing): it renders nothing' },
		]);
		expect(findUnknownKeys({ $type: 3 }, manifest)).toEqual([expect.objectContaining({ code: 'missing-type', message: expect.stringContaining('got number') })]);
		expect(findUnknownKeys({ $type: '' }, manifest)).toEqual([expect.objectContaining({ code: 'missing-type' })]);
	});

	it('accepts a page made of page-level keys plus a typed root', () => {
		expect(findUnknownKeys({ $route: '/x', $sources: {}, $actions: {}, $vars: {}, $brains: {}, $type: 'Label', label: 'a' }, manifest)).toEqual([]);
	});
});

describe('slot content', () => {
	it('reports a child that is not a node, with the parent type and the child path', () => {
		const diagnostics = findUnknownKeys({ $type: 'Stack', items: [null, 'text', ['x'], 5, { $type: 'Label', label: 'ok' }] }, manifest);
		expect(diagnostics.map((d) => [d.code, d.type, d.nodePath])).toEqual([
			['invalid-node', 'Stack', '$.items[0]'],
			['invalid-node', 'Stack', '$.items[1]'],
			['invalid-node', 'Stack', '$.items[2]'],
			['invalid-node', 'Stack', '$.items[3]'],
		]);
		expect(diagnostics[0]!.message).toBe('[Stack] $.items[0] must be a DSL node (a map with a $type), got null: it renders nothing');
		expect(diagnostics[1]!.message).toContain('got string');
		expect(diagnostics[2]!.message).toContain('got a list');
		expect(diagnostics[3]!.message).toContain('got number');
	});

	it('reports a child map without $type (it would render nothing)', () => {
		expect(findUnknownKeys({ $type: 'Stack', items: [{ label: 'forgot the type' }] }, manifest)).toEqual([
			{
				severity: 'error',
				type: 'Stack',
				nodePath: '$.items[0]',
				code: 'missing-type',
				message: '[Stack] $.items[0] has no $type (got nothing): it renders nothing',
			},
		]);
	});

	it('reports a slot that is neither a list nor an expression string', () => {
		expect(findUnknownKeys({ $type: 'Stack', items: { $type: 'Label' } }, manifest)).toEqual([
			{
				severity: 'error',
				type: 'Stack',
				nodePath: '$',
				code: 'invalid-slot',
				message: '[Stack] "items" must be a list of nodes (or an expression string), got object: it renders nothing',
			},
		]);
		expect(findUnknownKeys({ $type: 'Stack', items: 5 }, manifest)).toEqual([expect.objectContaining({ code: 'invalid-slot', message: expect.stringContaining('got number') })]);
		expect(findUnknownKeys({ $type: 'Stack', items: null }, manifest)).toEqual([expect.objectContaining({ code: 'invalid-slot', message: expect.stringContaining('got null') })]);
	});

	it('leaves an absent slot and an expression string alone', () => {
		expect(findUnknownKeys({ $type: 'Stack' }, manifest)).toEqual([]);
		expect(findUnknownKeys({ $type: 'Stack', items: '$sources.rows' }, manifest)).toEqual([]);
		expect(findUnknownKeys({ $type: 'Stack', items: [] }, manifest)).toEqual([]);
	});
});

describe('node schema', () => {
	it('stays silent for a valid node and reports each issue with its dotted path otherwise', () => {
		expect(findUnknownKeys({ $type: 'Checked', n: 1 }, manifest)).toEqual([]);
		const diagnostics = findUnknownKeys({ $type: 'Checked', n: 'one' }, manifest);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ code: 'node-schema', type: 'Checked', nodePath: '$' });
		expect(diagnostics[0]!.message).toMatch(/^\[Checked\] node schema error: n: /);
	});

	it('names a root-level schema failure "root"', () => {
		const rootRule: DslKeysManifest = { Whole: { knownKeys: [], nodeSchema: z.object({}).refine(() => false, 'nope') } };
		expect(findUnknownKeys({ $type: 'Whole' }, rootRule)).toEqual([expect.objectContaining({ message: '[Whole] node schema error: root: nope' })]);
	});
});

describe('map slots', () => {
	it('leaves an absent map slot alone', () => {
		expect(findUnknownKeys({ $type: 'Variants' }, manifest)).toEqual([]);
	});

	it('rejects a null or scalar map slot, listing the keys an entry may carry', () => {
		for (const variants of [null, 'oops', 4]) {
			expect(findUnknownKeys({ $type: 'Variants', variants }, manifest)).toEqual([
				expect.objectContaining({ code: 'invalid-map-slot', nodePath: '$', message: '[Variants] "variants" must be a map of named entries, each with: view, label, hint' }),
			]);
		}
	});

	it('rejects null and scalar entries', () => {
		const diagnostics = findUnknownKeys({ $type: 'Variants', variants: { a: null, b: 'x' } }, manifest);
		expect(diagnostics.map((d) => [d.code, d.nodePath, d.message])).toEqual([
			['invalid-map-slot', '$.variants.a', '[Variants] "variants.a" must be a map with: view, label, hint'],
			['invalid-map-slot', '$.variants.b', '[Variants] "variants.b" must be a map with: view, label, hint'],
		]);
	});

	it('lists the entry keys sorted, and only suggests a close one', () => {
		const diagnostics = findUnknownKeys(
			{ $type: 'Variants', variants: { a: { view: { $type: 'Label', label: 'x' }, hnt: 1, zzzzzz: 2 } } },
			manifest
		);
		expect(diagnostics.map((d) => d.message)).toEqual([
			'[Variants] unknown key "hnt" in "variants.a" - the renderer ignores it, so it has no effect. Did you mean "hint"? Known keys: hint, label, view',
			'[Variants] unknown key "zzzzzz" in "variants.a" - the renderer ignores it, so it has no effect. Known keys: hint, label, view',
		]);
	});

	it('reports a missing nested node once, and an entry whose node is not a node', () => {
		expect(findUnknownKeys({ $type: 'Variants', variants: { a: { label: 'A' } } }, manifest)).toEqual([
			expect.objectContaining({ code: 'invalid-map-slot', message: '[Variants] "variants.a" has no "view": nothing to render for this entry' }),
		]);
		expect(findUnknownKeys({ $type: 'Variants', variants: { a: { view: 'text' } } }, manifest)).toEqual([
			expect.objectContaining({ code: 'invalid-node', type: 'Variants', nodePath: '$.variants.a.view' }),
		]);
		expect(findUnknownKeys({ $type: 'Variants', variants: { a: { view: { label: 'no type' } } } }, manifest)).toEqual([
			expect.objectContaining({ code: 'missing-type', nodePath: '$.variants.a.view' }),
		]);
	});
});

describe('$actions', () => {
	it('tolerates `$actions:` with nothing under it (YAML null) and non-map values', () => {
		for (const $actions of [null, undefined, 'POST /x', 5]) {
			expect(findUnknownKeys({ $actions, $type: 'Label', label: 'a' }, manifest)).toEqual([]);
		}
	});

	it('reports an unknown action key with sorted-known-keys text, without a suggestion when nothing is close', () => {
		const [diagnostic] = findUnknownKeys({ $actions: { go: { url: 'POST /x', qqqqqqqqqq: 1 } }, $type: 'Label', label: 'a' }, manifest);
		expect(diagnostic).toMatchObject({ severity: 'error', type: '$actions', nodePath: '$actions.go', code: 'unknown-action-key' });
		expect(diagnostic!.message).toBe(
			'[$actions.go] unknown action key "qqqqqqqqqq" - it has no effect. Known keys: url, resultKey, reloadSources, confirm, successMessage, errorPrefix, notify, strictParams'
		);
	});
});

describe('buildKnownKeysManifest content', () => {
	it('keeps an entry without any metadata as an empty object, and omits empty metadata maps', () => {
		const built = buildKnownKeysManifest([
			{ name: 'Bare' },
			{ name: 'Empty', knownKeys: [], allowedChildren: {}, mapSlots: {}, itemKeys: {} },
		]);
		expect(built).toEqual({ Bare: {}, Empty: { knownKeys: [] } });
	});

	it('keeps allowedChildren, mapSlots and itemKeys when they hold a single entry', () => {
		const built = buildKnownKeysManifest([
			{
				name: 'Full',
				knownKeys: ['b', 'a'],
				allowedChildren: { items: ['layout'] },
				mapSlots: { variants: { keys: ['view'], nodeKey: 'view' } },
				itemKeys: { columns: { keys: ['field'] } },
			},
		]);
		expect(built['Full']).toEqual({
			knownKeys: ['a', 'b'],
			allowedChildren: { items: ['layout'] },
			mapSlots: { variants: { keys: ['view'], nodeKey: 'view' } },
			itemKeys: { columns: { keys: ['field'] } },
		});
	});

	it('does not reorder the entries array it was given', () => {
		const entries = [{ name: 'B' }, { name: 'A' }];
		buildKnownKeysManifest(entries);
		expect(entries.map((e) => e.name)).toEqual(['B', 'A']);
	});
});
