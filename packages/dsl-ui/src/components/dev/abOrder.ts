import { createContext } from 'react';

import type { AbTest } from './abTypes.js';

// Id of the AbTest whose chosen variant is being rendered, null outside any. An AbTest read from it declares itself nested.
export const AbParentContext = createContext<string | null>(null);

/**
 * Puts every nested test (see `AbTest.parentId`) ABOVE its parent, recursively; the rest keeps the given order.
 *
 * The dock is anchored by its bottom edge, so a row only keeps its screen position when whatever appears beside it
 * appears above it: choosing a variant that brings its own rows must not push the row just clicked away from the pointer.
 * A parent that is not in the list (or a cycle) leaves the test where the given order puts it.
 */
export function nestedAboveParent(tests: readonly AbTest[]): AbTest[] {
	const ids = new Set(tests.map((t) => t.id));
	const children = new Map<string, AbTest[]>();
	const roots: AbTest[] = [];
	for (const t of tests) {
		if (t.parentId !== undefined && t.parentId !== t.id && ids.has(t.parentId)) {
			children.set(t.parentId, [...(children.get(t.parentId) ?? []), t]);
		} else {
			roots.push(t);
		}
	}
	const out: AbTest[] = [];
	const seen = new Set<string>();
	const visit = (t: AbTest): void => {
		if (seen.has(t.id)) {
			return;
		}
		seen.add(t.id);
		for (const child of children.get(t.id) ?? []) {
			visit(child);
		}
		out.push(t);
	};
	roots.forEach(visit);
	// Members of a parent cycle are nobody's root: keep them, in the given order.
	tests.forEach(visit);
	return out;
}
