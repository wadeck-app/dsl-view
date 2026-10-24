import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { findUnknownKeys } from './unknownKeys.js';
import type { DslKeysManifest } from './unknownKeys.js';

// The first test file asserts codes and a few messages; these pin each whole diagnostic (severity, type, path, code,
// message) because a consumer's CI reads the severity to fail the build and a person reads the message to fix the page.
const manifest: DslKeysManifest = {
	VerticalStack: { knownKeys: ['gap', 'items'], allowedChildren: { items: ['layout'] } },
	Label: { knownKeys: ['label'] },
	Variants: {
		knownKeys: ['variants'],
		mapSlots: { variants: { keys: ['label', 'view'], nodeKey: 'view' } },
	},
	Checked: { knownKeys: ['label', 'nested'], nodeSchema: z.object({ label: z.string(), nested: z.object({ deep: z.number() }).optional() }).passthrough() },
	Rootless: { knownKeys: [], nodeSchema: z.string() },
};

describe('whole diagnostics', () => {
	it('a node that is not a map', () => {
		expect(findUnknownKeys({ $type: 'VerticalStack', items: ['text', null, [1]] }, manifest)).toStrictEqual([
			{ severity: 'error', type: 'VerticalStack', nodePath: '$.items[0]', code: 'invalid-node', message: '[VerticalStack] $.items[0] must be a DSL node (a map with a $type), got string: it renders nothing' },
			{ severity: 'error', type: 'VerticalStack', nodePath: '$.items[1]', code: 'invalid-node', message: '[VerticalStack] $.items[1] must be a DSL node (a map with a $type), got null: it renders nothing' },
			{ severity: 'error', type: 'VerticalStack', nodePath: '$.items[2]', code: 'invalid-node', message: '[VerticalStack] $.items[2] must be a DSL node (a map with a $type), got a list: it renders nothing' },
		]);
	});

	it('a node without a usable $type says what it got', () => {
		const diagnostics = findUnknownKeys({ $type: 'VerticalStack', items: [{ label: 'x' }, { $type: 5 }, { $type: '' }] }, manifest);

		expect(diagnostics).toStrictEqual([
			{ severity: 'error', type: 'VerticalStack', nodePath: '$.items[0]', code: 'missing-type', message: '[VerticalStack] $.items[0] has no $type (got nothing): it renders nothing' },
			{ severity: 'error', type: 'VerticalStack', nodePath: '$.items[1]', code: 'missing-type', message: '[VerticalStack] $.items[1] has no $type (got number): it renders nothing' },
			{ severity: 'error', type: 'VerticalStack', nodePath: '$.items[2]', code: 'missing-type', message: '[VerticalStack] $.items[2] has no $type (got string): it renders nothing' },
		]);
	});

	it('an unknown component type', () => {
		expect(findUnknownKeys({ $type: 'Nope' }, manifest)).toStrictEqual([
			{ severity: 'error', type: 'Nope', nodePath: '$', code: 'unknown-component-type', message: 'Unknown component type: Nope' },
		]);
	});

	it('an unknown $ directive, once per directive', () => {
		const diagnostics = findUnknownKeys({ $type: 'Label', label: 'x', $typo: 1, $other: 2 }, manifest);

		expect(diagnostics).toStrictEqual([
			{ severity: 'error', type: 'Label', nodePath: '$', code: 'unknown-directive', message: '[Label] unknown DSL directive: $typo' },
			{ severity: 'error', type: 'Label', nodePath: '$', code: 'unknown-directive', message: '[Label] unknown DSL directive: $other' },
		]);
	});

	it('a slot that is not a list, an expression string is left alone, and an absent slot is fine', () => {
		expect(findUnknownKeys({ $type: 'VerticalStack', items: 5 }, manifest)).toStrictEqual([
			{ severity: 'error', type: 'VerticalStack', nodePath: '$', code: 'invalid-slot', message: '[VerticalStack] "items" must be a list of nodes (or an expression string), got number: it renders nothing' },
		]);
		expect(findUnknownKeys({ $type: 'VerticalStack', items: '$sources.rows' }, manifest)).toStrictEqual([]);
		expect(findUnknownKeys({ $type: 'VerticalStack' }, manifest)).toStrictEqual([]);
	});
});

describe('node schema issues', () => {
	it('each issue becomes a diagnostic carrying its dotted path, "root" when it is on the node itself', () => {
		const diagnostics = findUnknownKeys({ $type: 'Checked', label: 3, nested: { deep: 'x' } }, manifest);

		const byPath = Object.fromEntries(diagnostics.map(d => [d.message.replace(/^\[Checked\] node schema error: ([^:]+):.*$/, '$1'), d]));
		expect(Object.keys(byPath).sort()).toStrictEqual(['label', 'nested.deep']);
		for (const d of diagnostics) {
			expect(d).toMatchObject({ severity: 'error', type: 'Checked', nodePath: '$', code: 'node-schema' });
		}
	});

	it('an issue on the node itself is reported under "root"', () => {
		const diagnostics = findUnknownKeys({ $type: 'Rootless' }, manifest);

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ severity: 'error', type: 'Rootless', code: 'node-schema' });
		expect(diagnostics[0]!.message).toMatch(/^\[Rootless\] node schema error: root: .+/);
	});

	it('a valid node produces no schema diagnostic', () => {
		expect(findUnknownKeys({ $type: 'Checked', label: 'ok', nested: { deep: 1 } }, manifest)).toStrictEqual([]);
	});
});

describe('map slots', () => {
	it('a map slot that is not a map', () => {
		for (const bad of ['text', 5, null, ['a']]) {
			expect(findUnknownKeys({ $type: 'Variants', variants: bad }, manifest)).toStrictEqual([
				{ severity: 'error', type: 'Variants', nodePath: '$', code: 'invalid-map-slot', message: '[Variants] "variants" must be a map of named entries, each with: label, view' },
			]);
		}
	});

	it('an entry that is not a map, with the entry in the path', () => {
		expect(findUnknownKeys({ $type: 'Variants', variants: { a: 'text' } }, manifest)).toStrictEqual([
			{ severity: 'error', type: 'Variants', nodePath: '$.variants.a', code: 'invalid-map-slot', message: '[Variants] "variants.a" must be a map with: label, view' },
		]);
	});

	it('an unknown entry key gets a suggestion and the sorted known keys; an entry without its node is reported', () => {
		const diagnostics = findUnknownKeys({ $type: 'Variants', variants: { a: { label: 'A', views: { $type: 'Label' } } } }, manifest);

		expect(diagnostics).toStrictEqual([
			{
				severity: 'error',
				type: 'Variants',
				nodePath: '$.variants.a',
				code: 'unknown-key',
				message: '[Variants] unknown key "views" in "variants.a" - the renderer ignores it, so it has no effect. Did you mean "view"? Known keys: label, view',
			},
			{ severity: 'error', type: 'Variants', nodePath: '$.variants.a', code: 'invalid-map-slot', message: '[Variants] "variants.a" has no "view": nothing to render for this entry' },
		]);
	});

	it('walks the nested node of each entry, with a path that names the entry and the node key', () => {
		const diagnostics = findUnknownKeys({ $type: 'Variants', variants: { a: { view: { $type: 'Label', colour: 'red' } } } }, manifest);

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ code: 'unknown-key', type: 'Label', nodePath: '$.variants.a.view' });
	});

	it('an entry key with a suggestion-less typo still lists the known keys', () => {
		const diagnostics = findUnknownKeys({ $type: 'Variants', variants: { a: { zzzzzzzz: 1, view: { $type: 'Label' } } } }, manifest);

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]!.message).toBe('[Variants] unknown key "zzzzzzzz" in "variants.a" - the renderer ignores it, so it has no effect. Known keys: label, view');
	});
});

describe('page-level $actions', () => {
	it('nothing is reported for an empty $actions, a string, a null entry or the url shorthand', () => {
		for (const $actions of [null, 'POST /x', { a: null }, { a: 'POST /x' }, { a: { url: 'POST /x' } }]) {
			expect(findUnknownKeys({ $actions, $type: 'Label', label: 'x' }, manifest)).toStrictEqual([]);
		}
	});

	it('an unknown action key is one whole diagnostic with the known keys in declaration order', () => {
		const diagnostics = findUnknownKeys({ $actions: { save: { url: 'POST /x', zzzzzzzz: 1 } }, $type: 'Label', label: 'x' }, manifest);

		expect(diagnostics).toStrictEqual([
			{
				severity: 'error',
				type: '$actions',
				nodePath: '$actions.save',
				code: 'unknown-action-key',
				message:
					'[$actions.save] unknown action key "zzzzzzzz" - it has no effect. Known keys: url, resultKey, requestKey, reloadSources, confirm, successMessage, errorPrefix, notify, strictParams',
			},
		]);
	});
});

describe('the document itself', () => {
	it('an empty or non-map document is reported with a hint when it is empty', () => {
		expect(findUnknownKeys(undefined as never, manifest)).toStrictEqual([
			{ severity: 'error', type: '(document)', nodePath: '$', code: 'invalid-node', message: 'The page must be a YAML map with a $type, got undefined (an empty file?)' },
		]);
		expect(findUnknownKeys(null as never, manifest)[0]!.message).toBe('The page must be a YAML map with a $type, got null (an empty file?)');
		expect(findUnknownKeys(['x'] as never, manifest)[0]!.message).toBe('The page must be a YAML map with a $type, got a list');
		expect(findUnknownKeys('text' as never, manifest)[0]!.message).toBe('The page must be a YAML map with a $type, got string');
	});

	it('skipType leaves the matching types unchecked and unrecursed', () => {
		const diagnostics = findUnknownKeys(
			{ $type: 'VerticalStack', items: [{ $type: 'mod:Thing', whatever: 1, items: [{ $type: 'Nope' }] }] },
			manifest,
			{ skipType: type => type.includes(':') }
		);

		expect(diagnostics).toStrictEqual([]);
	});
});
