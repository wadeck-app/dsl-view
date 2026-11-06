import { describe, expect, it } from 'vitest';

import { nestedAboveParent } from './abOrder.js';
import type { AbTest } from './abTypes.js';

const t = (id: string, parentId?: string): AbTest => ({
	id,
	label: id,
	summary: id,
	options: [],
	value: '',
	onSelect: () => {},
	...(parentId === undefined ? {} : { parentId }),
});

const ids = (tests: readonly AbTest[]): string[] => tests.map((x) => x.id);

describe('nestedAboveParent', () => {
	it('returns an empty list for an empty list', () => {
		expect(nestedAboveParent([])).toEqual([]);
	});

	it('keeps the given order when nothing is nested', () => {
		expect(ids(nestedAboveParent([t('b'), t('a'), t('c')]))).toEqual(['b', 'a', 'c']);
	});

	it('puts a nested test above its parent even though it registered after it', () => {
		expect(ids(nestedAboveParent([t('parent'), t('child', 'parent')]))).toEqual(['child', 'parent']);
	});

	it('puts a grandchild above its child above the parent, and leaves the siblings in place', () => {
		const out = nestedAboveParent([t('a'), t('parent'), t('child', 'parent'), t('grand', 'child'), t('z')]);
		expect(ids(out)).toEqual(['a', 'grand', 'child', 'parent', 'z']);
	});

	it('keeps several children of one parent in the given order, all above it', () => {
		expect(ids(nestedAboveParent([t('p'), t('c1', 'p'), t('c2', 'p')]))).toEqual(['c1', 'c2', 'p']);
	});

	it('leaves a test whose parent is not in the list where it is', () => {
		expect(ids(nestedAboveParent([t('a'), t('orphan', 'missing'), t('b')]))).toEqual(['a', 'orphan', 'b']);
	});

	it('does not loop on a test that is its own parent', () => {
		expect(ids(nestedAboveParent([t('a', 'a'), t('b')]))).toEqual(['a', 'b']);
	});

	it('keeps every member of a parent cycle exactly once', () => {
		const out = ids(nestedAboveParent([t('a', 'b'), t('b', 'a'), t('c')]));
		expect([...out].sort()).toEqual(['a', 'b', 'c']);
	});

	it('does not modify its input', () => {
		const input = [t('p'), t('c', 'p')];
		nestedAboveParent(input);
		expect(ids(input)).toEqual(['p', 'c']);
	});
});
