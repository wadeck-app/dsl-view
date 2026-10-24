import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { findUnknownKeys } from './unknownKeys.js';
import type { DslKeysManifest } from './unknownKeys.js';

// Same shape as the generated schemas: a prop is `dsl(literal)` = the literal or an `$expression`, possibly optional.
const dsl = <T extends z.ZodType>(literal: T) => z.union([literal, z.string().startsWith('$')]);

const BoxSchema = z.object({
	gap: dsl(z.enum(['gap-1', 'gap-2'])).optional(),
	label: dsl(z.string()),
	count: dsl(z.number()).optional(),
	items: z.array(z.unknown()).optional(),
});

const manifest: DslKeysManifest = {
	Box: {
		knownKeys: ['gap', 'label', 'count', 'items'],
		allowedChildren: { items: ['layout'] },
		propSchema: BoxSchema,
	},
};

const check = (doc: Record<string, unknown>, which: DslKeysManifest = manifest) => findUnknownKeys(doc, which);

describe('findUnknownKeys, literal prop values against the generated prop schema', () => {
	it('reports an enum value outside the allowed ones as an error that names the prop, the allowed values and what was written', () => {
		const diagnostics = check({ $type: 'Box', label: 'x', gap: 'gap-9' });

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ severity: 'error', code: 'invalid-prop-value', type: 'Box', nodePath: '$' });
		expect(diagnostics[0]!.message).toBe(
			'[Box] "gap" expects one of "gap-1", "gap-2" but the YAML has string: the component ignores it or renders something unexpected'
		);
	});

	it('reports a wrong type, describing a map or a list in the words of a YAML author', () => {
		const asNumber = check({ $type: 'Box', label: 42 });
		const asMap = check({ $type: 'Box', label: { a: 1 } });

		expect(asNumber.map((d) => d.message)).toEqual(['[Box] "label" expects a string but the YAML has number: the component ignores it or renders something unexpected']);
		expect(asMap[0]!.message).toContain('but the YAML has a map');
	});

	// An expression only has a value at runtime: judging it here would blame every page that binds data.
	it('never judges an $expression, whatever the prop type', () => {
		expect(check({ $type: 'Box', label: '$sources.title', gap: '$sources.gap', count: '$ctx.n' })).toEqual([]);
	});

	it('treats null (a YAML key with nothing) as "no value", not as a wrong value', () => {
		expect(check({ $type: 'Box', label: null, gap: null })).toEqual([]);
	});

	it('warns, without failing, that a required prop is not set', () => {
		const diagnostics = check({ $type: 'Box' });

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ severity: 'warning', code: 'missing-required-prop' });
		expect(diagnostics[0]!.message).toContain('"label" is required (a string)');
	});

	// `$extends` / `$source` can supply props at runtime: not setting one here is not a mistake we can see.
	it.each(['$extends', '$source'])('does not blame a node for a required prop when it may inherit props through %s', (directive) => {
		expect(check({ $type: 'Box', [directive]: 'base' })).toEqual([]);
	});

	it('still judges the values a node that inherits does set', () => {
		const diagnostics = check({ $type: 'Box', $extends: 'base', gap: 'gap-9' });

		expect(diagnostics.map((d) => d.code)).toEqual(['invalid-prop-value']);
	});

	it('checks nested nodes too and reports the path of the node that is wrong', () => {
		const diagnostics = check({ $type: 'Box', label: 'outer', items: [{ $type: 'Box', label: 'inner', gap: 'bad' }] });

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ code: 'invalid-prop-value', nodePath: '$.items[0]' });
	});

	// A JSON manifest (what a CLI ships) has key names only: no schema, so no value check and no pretend-check either.
	it('does nothing for a component whose manifest entry has no prop schema', () => {
		const noSchema: DslKeysManifest = { Box: { knownKeys: ['gap', 'label', 'count', 'items'] } };

		expect(check({ $type: 'Box', gap: 'gap-9', label: 42 }, noSchema)).toEqual([]);
	});

	it('keeps reporting unknown keys next to the value errors', () => {
		const diagnostics = check({ $type: 'Box', label: 'x', gapp: 'gap-1', gap: 'nope' });

		expect(diagnostics.map((d) => d.code).sort()).toEqual(['invalid-prop-value', 'unknown-key']);
	});
});
