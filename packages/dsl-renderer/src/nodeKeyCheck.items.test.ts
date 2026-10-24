import { describe, expect, it } from 'vitest';

import { checkItemKeys } from './nodeKeyCheck.js';
import type { CompiledDslDiagnostic } from './compiledDslArtifact.js';
import type { ItemKeysSpec } from './dslKeys.js';

// Found by the first Stryker campaign: the severity of the item diagnostics and the way an item's `type` selects its
// variant were not pinned.
const spec: ItemKeysSpec = {
	keys: ['field', 'label', 'type'],
	byType: { actions: { keys: ['type', 'items'] } },
};

function check(value: unknown, itemSpec: ItemKeysSpec = spec): CompiledDslDiagnostic[] {
	const diagnostics: CompiledDslDiagnostic[] = [];
	checkItemKeys(value, 'columns', itemSpec, 'DataTable', '$.columns', diagnostics);
	return diagnostics;
}

describe('checkItemKeys shape errors', () => {
	it('a value that is not a list of maps is one whole error diagnostic', () => {
		expect(check({ field: 'a' })).toStrictEqual([
			{ severity: 'error', type: 'DataTable', nodePath: '$.columns', code: 'invalid-item-keys', message: '[DataTable] "columns" must be a list of maps' },
		]);
	});

	it('an item that is not a map is one whole error diagnostic with its index', () => {
		expect(check([{ field: 'a' }, 'text', null, ['x']])).toStrictEqual([
			{ severity: 'error', type: 'DataTable', nodePath: '$.columns[1]', code: 'invalid-item-keys', message: '[DataTable] "columns[1]" must be a map' },
			{ severity: 'error', type: 'DataTable', nodePath: '$.columns[2]', code: 'invalid-item-keys', message: '[DataTable] "columns[2]" must be a map' },
			{ severity: 'error', type: 'DataTable', nodePath: '$.columns[3]', code: 'invalid-item-keys', message: '[DataTable] "columns[3]" must be a map' },
		]);
	});

	it('an expression string and an absent value are accepted', () => {
		expect(check('$sources.columns')).toStrictEqual([]);
		expect(check(undefined)).toStrictEqual([]);
	});
});

describe('checkItemKeys unknown keys', () => {
	it('is an error diagnostic with the item path, a suggestion, and the sorted known keys', () => {
		expect(check([{ field: 'a', lable: 'A' }])).toStrictEqual([
			{
				severity: 'error',
				type: 'DataTable',
				nodePath: '$.columns[0]',
				code: 'unknown-key',
				message: '[DataTable] unknown key "lable" in "columns[0]" - the renderer ignores it, so it has no effect. Did you mean "label"? Known keys: field, label, type',
			},
		]);
	});
});

describe('checkItemKeys item variants', () => {
	it('a typed item is checked against its own key list, not the base one', () => {
		const diagnostics = check([{ type: 'actions', items: [], field: 'a' }]);

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ code: 'unknown-key', message: expect.stringContaining('unknown key "field"') });
		expect(diagnostics[0]!.message).toContain('Known keys: items, type');
	});

	it('a type with no variant of its own, or a type that is not a string, uses the base key list', () => {
		expect(check([{ type: 'text', field: 'a', label: 'A' }])).toStrictEqual([]);
		expect(check([{ type: 5, field: 'a' }])).toStrictEqual([]);
		expect(check([{ type: null, field: 'a' }])).toStrictEqual([]);
		expect(check([{ type: ['actions'], items: [] }]).map(d => d.code)).toStrictEqual(['unknown-key']);
	});

	it('a spec without any variants works with a string type', () => {
		expect(check([{ type: 'actions', field: 'a' }], { keys: ['type', 'field'] })).toStrictEqual([]);
	});

	it('a type that is a prototype key is not mistaken for a variant', () => {
		expect(check([{ type: 'constructor', field: 'a' }])).toStrictEqual([]);
	});

	it('nested arrays are checked with their own spec and a path through the parent item', () => {
		const nested: ItemKeysSpec = { keys: ['type', 'items'], arrays: { items: { keys: ['label', 'action'] } } };

		const diagnostics = check([{ items: [{ label: 'ok', actoin: 'x' }, 'not a map'] }], nested);

		expect(diagnostics.map(d => [d.code, d.nodePath])).toStrictEqual([
			['unknown-key', '$.columns[0].items[0]'],
			['invalid-item-keys', '$.columns[0].items[1]'],
		]);
	});
});
