// A slot that allows a tag no component carries can never take anything: the constraint is dead and a page built against it
// is blocked for nothing (or, the other way, the author typed the wrong word). Every tag a `@slot` names must be a tag or a
// category of at least one component of the library.
import { describe, expect, it } from 'vitest';

import manifest from './known-keys.json' with { type: 'json' };

type Entry = { category?: string; tags?: string[]; allowedChildren?: Record<string, string[]> };
const entries = manifest as unknown as Record<string, Entry>;

describe('slot vocabulary', () => {
	it('the manifest carries the category and tags the check compares against', () => {
		expect(entries['ButtonAction']!.category).toBe('atomic');
		expect(entries['ButtonAction']!.tags).toEqual(expect.arrayContaining(['button']));
	});

	it('every tag a slot allows is carried by at least one component', () => {
		const carried = new Set(Object.values(entries).flatMap(entry => [...(entry.tags ?? []), ...(entry.category ? [entry.category] : [])]));
		const dead: string[] = [];
		for (const [name, entry] of Object.entries(entries)) {
			for (const [slot, allowed] of Object.entries(entry.allowedChildren ?? {})) {
				for (const tag of allowed) {
					if (!carried.has(tag)) {
						dead.push(`${name}.${slot} allows "${tag}", which no component carries`);
					}
				}
			}
		}
		expect(dead, 'Fix the @slot tag in the component, or add the tag to the @registryTags of the components it should take').toEqual([]);
	});
});
