import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createRegistry } from '../ComponentRegistry.js';
import type { ComponentRegistryEntry } from '../ComponentRegistry.js';
import { coerceProp, DslRenderer } from './DslRenderer.js';
import { resetCoercionWarnings } from './coerceProp.js';
import { resetInvalidPropWarnings } from './warnInvalidNodeProps.js';

// The shape the generator produces: every prop accepts its literal or an expression, as in generated-node-schemas.ts.
const expr = z.string().regex(/^\s*(?:\$|!+\s*[$(])/);
const dsl = <T extends z.ZodType>(schema: T) => z.union([schema, expr]);
const PropSchema = z.object({
	$type: z.string(),
	gap: dsl(z.enum(['gap-1', 'gap-2'])).optional(),
	rows: dsl(z.array(z.object({ id: z.string() }))).optional(),
	count: dsl(z.number()).optional(),
	label: z.string(),
	// A prop with a default value (the generator writes `.default(x)` for a @default tag) may be left out.
	width: dsl(z.enum(['sm', 'lg'])).default('sm'),
	// A prop the generator could not type is `z.unknown()`; unlike the others zod still requires the key to be present.
	visible: z.unknown().optional(),
	mustSet: z.unknown(),
});

const seen: Array<Record<string, unknown>> = [];

const boxEntry: ComponentRegistryEntry = {
	name: 'Box',
	category: 'atomic',
	tags: [],
	knownKeys: ['gap', 'rows', 'count', 'label'],
	propSchema: PropSchema,
	render: ({ node }) => {
		seen.push(node);
		return <div data-testid="box">{String(node['label'])}</div>;
	},
};
const registry = createRegistry([boxEntry]);

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	seen.length = 0;
	resetInvalidPropWarnings();
	resetCoercionWarnings();
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllEnvs();
});

const messages = () => warn.mock.calls.map((call) => String(call[0]));
const schemaMessages = () => messages().filter((message) => message.includes('expects') || message.includes('is required'));

function show(node: Record<string, unknown>, ctx: Record<string, unknown> = {}) {
	return render(<DslRenderer node={{ $type: 'Box', label: 'x', mustSet: true, ...node }} registry={registry} ctx={ctx} />);
}

describe('warnInvalidNodeProps', () => {
	it('names the component, the prop, what it accepts and what arrived', () => {
		show({ gap: 'huge' });

		expect(schemaMessages()).toEqual([
			'[DslRenderer] Box.gap expects one of "gap-1", "gap-2" but received string: check the YAML value, the component may ignore it or render something unexpected.',
		]);
	});

	it('says a map is not a list, and a text is not a number', () => {
		show({ rows: { id: 'a' }, count: 'many' });

		expect(schemaMessages()).toEqual([
			expect.stringContaining('Box.rows expects a list but received a map'),
			expect.stringContaining('Box.count expects a number but received string'),
		]);
	});

	it('points at the entry of a list that has the wrong shape', () => {
		show({ rows: [{ id: 1 }] });

		expect(schemaMessages()).toEqual([expect.stringMatching(/Box\.rows expects a string \(at 0\.id\) but received number/)]);
	});

	it('warns once per component, prop and kind of mistake, however many nodes carry it', () => {
		show({ gap: 'huge' });
		show({ gap: 'huge' });
		show({ gap: 'bigger' });
		show({ count: 'many' });

		expect(schemaMessages()).toHaveLength(2);
	});

	it('checks the RESOLVED value of an expression', () => {
		show({ rows: '$sources.rows', gap: '$vars.gap' }, { rows: { not: 'a list' }, $vars: { gap: 'gap-2' } });

		expect(schemaMessages()).toEqual([expect.stringContaining('Box.rows expects a list but received a map')]);
	});

	it('judges the RESOLVED value of an operator expression too, and a "!" expression is not a literal', () => {
		show({ count: '$vars.a == $vars.b', visible: '!$vars.flag' }, { $vars: { a: 1, b: 1, flag: false } });

		// A comparison resolves to a boolean, which a number prop does not accept; `visible` is untyped.
		expect(schemaMessages()).toEqual([expect.stringContaining('Box.count expects a number but received boolean')]);
	});

	it('a text that merely starts with a bang is a literal and is judged as one', () => {
		show({ gap: '!important' });

		expect(schemaMessages()).toEqual([expect.stringContaining('Box.gap expects one of "gap-1", "gap-2" but received string')]);
	});

	it('does not judge an expression that does not resolve yet (a source still loading), nor null', () => {
		show({ rows: '$sources.rows', count: '$sources.count' }, {});
		show({ gap: null, rows: null });

		expect(schemaMessages()).toEqual([]);
	});

	it('is quiet for every valid value, including an expression that resolves to the right shape', () => {
		show({ gap: 'gap-1', rows: [{ id: 'a' }], count: 3 });
		show({ rows: '$sources.rows' }, { rows: [{ id: 'b' }] });

		expect(schemaMessages()).toEqual([]);
	});

	it('reports a required prop the node does not set, but not an optional one nor one with a default value', () => {
		render(<DslRenderer node={{ $type: 'Box', mustSet: true }} registry={registry} ctx={{}} />);

		expect(schemaMessages()).toEqual([expect.stringContaining('Box.label is required (a string) but the node does not set it')]);
	});

	it('requires a prop typed z.unknown() to be present, with no type to quote', () => {
		render(<DslRenderer node={{ $type: 'Box', label: 'x' }} registry={registry} ctx={{}} />);

		expect(schemaMessages()).toEqual(['[DslRenderer] Box.mustSet is required (a value) but the node does not set it: the component may render nothing useful.']);
	});

	it('still checks the value of a prop that has a default', () => {
		show({ width: 'huge', mustSet: 1 });

		expect(schemaMessages()).toEqual([expect.stringContaining('Box.width expects one of "sm", "lg" but received string')]);
	});

	it('never changes what renders: the component still gets the authored node', () => {
		show({ gap: 'huge' });

		expect(screen.getByTestId('box')).toHaveTextContent('x');
		expect(seen).toEqual([{ $type: 'Box', label: 'x', mustSet: true, gap: 'huge' }]);
	});

	it('is silent outside development', () => {
		vi.stubEnv('NODE_ENV', 'production');
		show({ gap: 'huge', rows: 'text' });

		expect(schemaMessages()).toEqual([]);
		expect(screen.getByTestId('box')).toBeInTheDocument();
	});

	it('does nothing for an entry without a prop schema (a hand-written component)', () => {
		const plain = createRegistry([{ name: 'Plain', category: 'atomic', tags: [], render: () => <p>plain</p> }]);
		render(<DslRenderer node={{ $type: 'Plain', gap: 'huge' }} registry={plain} ctx={{}} />);

		expect(schemaMessages()).toEqual([]);
	});

	it('leaves a prop to coerceProp when the schema already reported it, so the author reads one warning', () => {
		show({ count: 'many' });
		coerceProp('many', 'Box.count', 'primitive', false);
		coerceProp({ a: 1 }, 'Box.count', 'string', false);
		coerceProp({ a: 1 }, 'Box.other', 'string', false);

		const afterSchema = messages().filter((message) => message.startsWith('[Box.'));
		expect(afterSchema).toEqual([expect.stringContaining('[Box.other] expected a string')]);
	});
});
