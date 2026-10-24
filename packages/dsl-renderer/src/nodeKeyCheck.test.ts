import { describe, expect, it } from 'vitest';

import type { CompiledDslDiagnostic } from './compiledDslArtifact.js';
import { checkItemKeys, checkNodeKeys, editDistance, suggestKey } from './nodeKeyCheck.js';

describe('editDistance', () => {
	it.each([
		['kitten', 'sitting', 3],
		['flaw', 'lawn', 2],
		['same', 'same', 0],
		['', 'abc', 3],
		['abc', '', 3],
		['', '', 0],
		['ab', 'ba', 2],
		['gap', 'gaps', 1],
	])('%j -> %j is %i', (a, b, expected) => {
		expect(editDistance(a, b)).toBe(expected);
		// Symmetric: the order of the arguments must not matter for a suggestion.
		expect(editDistance(b, a)).toBe(expected);
	});
});

describe('suggestKey', () => {
	it('always suggests items for children when the component reads items', () => {
		expect(suggestKey('children', ['gap', 'items'])).toBe('items');
	});

	it('does not invent items when the component has none, nor for another key', () => {
		expect(suggestKey('children', ['gap'])).toBeUndefined();
		// `items` is known but the typo is closer to `gap`: the children shortcut must not apply to other keys.
		expect(suggestKey('gapp', ['gap', 'items'])).toBe('gap');
	});

	it('suggests the closest key and ignores case', () => {
		expect(suggestKey('Widht', ['width', 'label'])).toBe('width');
		expect(suggestKey('labl', ['width', 'label'])).toBe('label');
	});

	it('picks the closest of several candidates, the first on a tie', () => {
		expect(suggestKey('abcdef', ['abcdxx', 'abcdex', 'abcxxx'])).toBe('abcdex');
		expect(suggestKey('abcd', ['abcx', 'abcy'])).toBe('abcx');
	});

	it('accepts a distance of 2 for a long key but never 3', () => {
		expect(suggestKey('abcdefgh', ['abcdefxy'])).toBe('abcdefxy');
		expect(suggestKey('abcdefgh', ['abcdexyz'])).toBeUndefined();
	});

	it('gives short keys no random suggestion (distance must stay under half the key length)', () => {
		expect(suggestKey('ab', ['xy'])).toBeUndefined();
		// 3 letters: distance 1 is the most that is allowed.
		expect(suggestKey('abc', ['abd'])).toBe('abd');
		expect(suggestKey('abc', ['axy'])).toBeUndefined();
	});

	it('returns nothing without candidates', () => {
		expect(suggestKey('anything', [])).toBeUndefined();
	});
});

describe('checkNodeKeys', () => {
	it('reports each unknown authored key, sorted known keys, and a suggestion when one is close', () => {
		const diagnostics = checkNodeKeys({ $type: 'Label', labl: 'x', zzzzzz: 1 }, 'Label', '$.items[2]', { knownKeys: ['width', 'label'] });
		expect(diagnostics).toHaveLength(2);
		expect(diagnostics[0]).toEqual({
			severity: 'error',
			type: 'Label',
			nodePath: '$.items[2]',
			code: 'unknown-key',
			message: '[Label] unknown key "labl" - the renderer ignores it, so it has no effect. Did you mean "label"? Known keys: label, width',
		});
		// No close key: no "Did you mean" at all (never `undefined` printed as a suggestion).
		expect(diagnostics[1]!.message).toBe('[Label] unknown key "zzzzzz" - the renderer ignores it, so it has no effect. Known keys: label, width');
	});

	it('does not mutate the knownKeys it was given when sorting for the message', () => {
		const knownKeys = ['b', 'a'];
		checkNodeKeys({ zz: 1 }, 'T', '$', { knownKeys });
		expect(knownKeys).toEqual(['b', 'a']);
	});

	it('says (none) when the component reads no key at all', () => {
		const [diagnostic] = checkNodeKeys({ anything: 1 }, 'Bare', '$', { knownKeys: [] });
		expect(diagnostic!.message).toBe('[Bare] unknown key "anything" - the renderer ignores it, so it has no effect. Known keys: (none)');
	});

	it('ignores $-directives and accepts known keys', () => {
		expect(checkNodeKeys({ $type: 'Label', $if: 'x', label: 'a' }, 'Label', '$', { knownKeys: ['label'] })).toEqual([]);
	});

	it('warns (never skips silently) when a hand-written entry has no knownKeys and the node carries keys', () => {
		expect(checkNodeKeys({ $type: 'Raw', a: 1 }, 'Raw', '$.x', {})).toEqual([
			{
				severity: 'warning',
				type: 'Raw',
				nodePath: '$.x',
				code: 'unchecked-keys',
				message: '[Raw] keys not checked: the registry entry has no knownKeys metadata (generated entries have it)',
			},
		]);
	});

	it('does not warn about a hand-written entry whose node carries only $-directives', () => {
		expect(checkNodeKeys({ $type: 'Raw', $if: 'x' }, 'Raw', '$', {})).toEqual([]);
	});
});

describe('checkItemKeys', () => {
	const run = (value: unknown, spec: Parameters<typeof checkItemKeys>[2]): CompiledDslDiagnostic[] => {
		const diagnostics: CompiledDslDiagnostic[] = [];
		checkItemKeys(value, 'columns', spec, 'Table', '$.columns', diagnostics);
		return diagnostics;
	};

	it('leaves an absent prop and an expression string alone', () => {
		expect(run(undefined, { keys: ['field'] })).toEqual([]);
		expect(run('$sources.columns', { keys: ['field'] })).toEqual([]);
	});

	it('flags a value that is neither a list nor an expression', () => {
		expect(run({ field: 'a' }, { keys: ['field'] })).toEqual([
			{ severity: 'error', type: 'Table', nodePath: '$.columns', code: 'invalid-item-keys', message: '[Table] "columns" must be a list of maps' },
		]);
		expect(run(42, { keys: ['field'] })).toHaveLength(1);
		expect(run(null, { keys: ['field'] })).toHaveLength(1);
	});

	it('flags an item that is not a map (null, scalar, nested list) with its index', () => {
		const diagnostics = run([null, 'a', ['x'], { field: 'ok' }], { keys: ['field'] });
		expect(diagnostics.map((d) => [d.nodePath, d.message])).toEqual([
			['$.columns[0]', '[Table] "columns[0]" must be a map'],
			['$.columns[1]', '[Table] "columns[1]" must be a map'],
			['$.columns[2]', '[Table] "columns[2]" must be a map'],
		]);
	});

	it('reports sorted known keys and only suggests a close one', () => {
		const diagnostics = run([{ widht: 1, qqqqqq: 2 }], { keys: ['width', 'field'] });
		expect(diagnostics.map((d) => d.message)).toEqual([
			'[Table] unknown key "widht" in "columns[0]" - the renderer ignores it, so it has no effect. Did you mean "width"? Known keys: field, width',
			'[Table] unknown key "qqqqqq" in "columns[0]" - the renderer ignores it, so it has no effect. Known keys: field, width',
		]);
	});

	it('picks the variant named by a string type, falls back to the default for an unknown or non-string type', () => {
		const spec = { keys: ['field', 'type'], byType: { actions: { keys: ['type', 'items'] } } };
		expect(run([{ type: 'actions', items: [] }], spec)).toEqual([]);
		// `field` belongs to the default item only.
		expect(run([{ type: 'actions', field: 'a' }], spec)).toHaveLength(1);
		expect(run([{ type: 'text', field: 'a' }], spec)).toEqual([]);
		expect(run([{ type: 5, field: 'a' }], spec)).toEqual([]);
	});

	it('follows nested arrays with a dotted label and path', () => {
		const spec = { keys: ['items'], arrays: { items: { keys: ['label'] } } };
		const diagnostics = run([{ items: [{ label: 'ok' }, { colour: 'red' }] }], spec);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]!.nodePath).toBe('$.columns[0].items[1]');
		expect(diagnostics[0]!.message).toContain('in "columns[0].items[1]"');
	});
});
