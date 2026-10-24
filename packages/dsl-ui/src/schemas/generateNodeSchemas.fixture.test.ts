import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(here, '../../scripts/generate-node-schemas.ts');

// Synthetic components exercising every TypeScript -> Zod mapping of the generator, including the ones no real
// component uses today (so the drift test alone cannot protect them).
const fixtures: Record<string, string> = {
	'Probe.tsx': `
import React from 'react';

type Tone = 'calm' | 'loud';
interface Item { id: string; note?: string }
interface Empty {}
interface Tree { label: string; children: Tree[] }
export interface Spec { a: string }

export interface ProbeProps {
	s: string;
	n: number;
	b: boolean;
	u: unknown;
	str: 'only';
	num: 5;
	yes: true;
	no: false;
	pick: 'a' | 'b';
	pickOpt?: 'a' | 'b';
	maybe: string | null;
	pickNull: 'a' | 'b' | null;
	pickUndef: 'a' | 'b' | undefined;
	either: string | number;
	eitherNull: string | number | null;
	onlyUndefined: undefined;
	list: string[];
	nested: (string | number)[];
	rec: Record<string, number>;
	arr2: Array<boolean>;
	obj: { x: number; y?: string };
	emptyObj: {};
	untypedMember: { untyped; ok: number };
	item: Item;
	empty: Empty;
	tree: Tree;
	tone: Tone;
	when: Date;
	loose;
	onThing: () => void;
	handler?: (v: string) => void;
	either2: string | (() => void);
	/** @default 5 */
	withDefault?: number;
	/** @default 'abc' - the label */
	withQuoted?: string;
	/** @default true - updates every minute */
	withToken?: boolean;
	/** @default */
	emptyDefault?: number;
	optAny?: unknown;
	/** @itemKeys Spec */
	cols: Spec[];
}

/**
 * @registryCategory atomic
 */
export function Probe(props: ProbeProps) { return null; }
`,
	'Slots.tsx': `
import React from 'react';

export interface SlotsProps {
	footer?: React.ReactNode;
	children: React.ReactNode;
}

/**
 * @registryCategory composite
 */
export function Slots(props: SlotsProps) { return null; }
`,
	'Wrapper.tsx': `
import React from 'react';

export interface WrapperProps {
	label: string;
	children: React.ReactNode | ((id: string) => React.ReactNode);
}

/**
 * @registryCategory composite
 */
export function Wrapper(props: WrapperProps) { return null; }
`,
	'Bound.tsx': `
export interface BoundProps { value: string; onChange: (v: string) => void; label?: string }

/**
 * @registryCategory atomic
 * @registryBind formData onChange
 */
export function Bound(props: BoundProps) { return null; }
`,
	'Toggle.tsx': `
export interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; label?: string }

/**
 * @registryCategory atomic
 * @registryBind formData onChange
 */
export function Toggle(props: ToggleProps) { return null; }
`,
	'Valued.tsx': `
export interface ValuedProps { value: string; checked: boolean; onChange: (v: string) => void }

/**
 * @registryCategory atomic
 * @registryBind formData onChange
 */
export function Valued(props: ValuedProps) { return null; }
`,
	'Filters.tsx': `
export interface FiltersProps { value: string[]; onChange: (v: string[]) => void }

/**
 * @registryCategory atomic
 * @registryBind filters setFilter
 */
export function Filters(props: FiltersProps) { return null; }
`,
	// `children` is a node slot only when EVERY union member is a ReactNode, a render function, undefined or null.
	'Mixed.tsx': `
import React from 'react';

export interface MixedProps { children: React.ReactNode | string }

/**
 * @registryCategory composite
 */
export function Mixed(props: MixedProps) { return null; }
`,
	'NullableSlot.tsx': `
import React from 'react';

export interface NullableSlotProps { children: React.ReactNode | null | undefined }

/**
 * @registryCategory composite
 */
export function NullableSlot(props: NullableSlotProps) { return null; }
`,
	// An anonymous default export has no name: skipped, not a crash.
	'Anonymous.tsx': `
/**
 * @registryCategory atomic
 */
export default function () { return null; }
`,
	'Nothing.tsx': `
export interface NothingProps {}

/**
 * @registryCategory atomic
 */
export function Nothing(props: NothingProps) { return null; }
`,
	// None of these produce a schema.
	'NoTag.tsx': `export interface NoTagProps { a: string }\n/** just a doc */\nexport function NoTag(props: NoTagProps) { return null; }\n`,
	'NoDoc.tsx': `export interface NoDocProps { a: string }\nexport function NoDoc(props: NoDocProps) { return null; }\n`,
	'lower.tsx': `export interface lowerProps { a: string }\n/** @registryCategory atomic */\nexport function lower(props: lowerProps) { return null; }\n`,
	'NotExported.tsx': `interface HiddenProps { a: string }\n/** @registryCategory atomic */\nfunction Hidden(props: HiddenProps) { return null; }\nexport const x = Hidden;\n`,
	'NoProps.tsx': `/** @registryCategory atomic */\nexport function NoProps() { return null; }\n`,
	'Ignored.test.tsx': `export interface IgnoredProps { a: string }\n/** @registryCategory atomic */\nexport function Ignored(props: IgnoredProps) { return null; }\n`,
	'Ignored.stories.tsx': `export interface StoryProps { a: string }\n/** @registryCategory atomic */\nexport function Story(props: StoryProps) { return null; }\n`,
};

let dir: string;
let log: string;
let output: string;

// The block of one generated node schema: from its `export const` line to the next blank line (blocks are separated by one).
function schemaOf(name: string): string {
	const start = output.indexOf(`export const ${name}NodeSchema = `);
	expect(start, `${name}NodeSchema is generated`).toBeGreaterThanOrEqual(0);
	const end = output.indexOf('\n\n', start);
	return output.slice(start, end === -1 ? undefined : end);
}

beforeAll(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-schemas-fixture-'));
	const components = path.join(dir, 'components');
	fs.mkdirSync(components);
	for (const [file, source] of Object.entries(fixtures)) {
		fs.writeFileSync(path.join(components, file), source);
	}
	const out = path.join(dir, 'out.ts');
	log = execFileSync(process.execPath, [script, '--components', components, '--out', out], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
	output = fs.readFileSync(out, 'utf-8');
}, 120_000);

afterAll(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('generate-node-schemas on synthetic components', () => {
	it('generates a schema only for exported, capitalised, @registryCategory components with a Props interface', () => {
		expect(log).toMatch(/with 10 schemas/);
		const names = [...output.matchAll(/^export const (\w+)NodeSchema = /gm)].map(m => m[1]);
		expect(names).toEqual(['Bound', 'Filters', 'Mixed', 'Nothing', 'NullableSlot', 'Probe', 'Slots', 'Toggle', 'Valued', 'Wrapper']);
	});

	it('writes the shared header: baseNode with $type and every directive, the expression escape hatch', () => {
		expect(output).toContain("import { z } from 'zod';");
		expect(output).toContain('\t$type: z.string(),');
		for (const key of ['$if', '$source', '$context', '$route', '$extends', '$id', '$outputs']) {
			expect(output).toContain(`\t${key}: z.unknown().optional(),`);
		}
		expect(output).toContain("const expr = z.string().startsWith('$');");
		expect(output).toContain('const dsl = <T extends z.ZodType>(schema: T) => z.union([schema, expr]);');
	});

	describe('primitive and literal types', () => {
		it.each([
			['s', '\ts: z.string(),'],
			['n', '\tn: dsl(z.number()),'],
			['b', '\tb: dsl(z.boolean()),'],
			['u', '\tu: z.unknown(),'],
			['str', "\tstr: dsl(z.literal('only')),"],
			['num', '\tnum: dsl(z.literal(5)),'],
			['yes', '\tyes: dsl(z.literal(true)),'],
			['no', '\tno: dsl(z.literal(false)),'],
		])('%s', (_name, line) => {
			expect(schemaOf('Probe')).toContain(line);
		});
	});

	describe('unions, nullability and optionality', () => {
		it.each([
			['a union of string literals is an enum', "\tpick: dsl(z.enum(['a', 'b'])),"],
			['an optional enum', "\tpickOpt: dsl(z.enum(['a', 'b'])).optional(),"],
			['string | null is nullable', '\tmaybe: z.string().nullable(),'],
			['an enum | null is a nullable enum', "\tpickNull: dsl(z.enum(['a', 'b'])).nullable(),"],
			['an enum | undefined is an optional enum', "\tpickUndef: dsl(z.enum(['a', 'b'])).optional(),"],
			['a mixed union is z.union', '\teither: dsl(z.union([z.string(), z.number()])),'],
			['a nullable mixed union', '\teitherNull: dsl(z.union([z.string(), z.number()])).nullable(),'],
			['a lone undefined is unknown', '\tonlyUndefined: z.unknown(),'],
			['an optional unknown stays unknown', '\toptAny: z.unknown().optional(),'],
			['a union with a callback keeps the other member', '\teither2: z.string(),'],
		])('%s', (_name, line) => {
			expect(schemaOf('Probe')).toContain(line);
		});
	});

	describe('containers and references', () => {
		it.each([
			['T[]', '\tlist: dsl(z.array(z.string())),'],
			['(A | B)[]', '\tnested: dsl(z.array(z.union([z.string(), z.number()]))),'],
			['Record<K, V>', '\trec: dsl(z.record(z.string(), z.number())),'],
			['Array<T>', '\tarr2: dsl(z.array(z.boolean())),'],
			['an empty object literal', '\temptyObj: dsl(z.object({})),'],
			['a same-file interface', '\titem: dsl(ItemSchema),'],
			['a same-file empty interface', '\tempty: dsl(EmptySchema),'],
			['a self-referencing interface', '\ttree: dsl(TreeSchema),'],
			['a same-file type alias resolves to its enum', "\ttone: dsl(z.enum(['calm', 'loud'])),"],
			['an unknown external type', '\twhen: z.unknown(),'],
			['a property with no type annotation', '\tloose: z.unknown(),'],
			['an object member with no type annotation', '\tuntypedMember: dsl(z.object({\n\t\tuntyped: z.unknown(),\n\t\tok: z.number(),\n\t})),'],
		])('%s', (_name, line) => {
			expect(schemaOf('Probe')).toContain(line);
		});

		it('an object literal keeps its members, optional ones included, indented', () => {
			expect(schemaOf('Probe')).toContain('\tobj: dsl(z.object({\n\t\tx: z.number(),\n\t\ty: z.string().optional(),\n\t})),');
		});

		it('sub-schemas for referenced interfaces: plain objects, empty one included, recursion cut to unknown', () => {
			expect(output).toContain('const ItemSchema = z.object({\n\tid: z.string(),\n\tnote: z.string().optional(),\n});');
			expect(output).toContain('const EmptySchema = z.object({});');
			expect(output).toContain('const TreeSchema = z.object({\n\tlabel: z.string(),\n\tchildren: z.array(z.unknown()),\n});');
		});

		it('callbacks are not serialisable and are left out', () => {
			expect(schemaOf('Probe')).not.toMatch(/\bonThing\b|\bhandler\b/);
		});
	});

	describe('@default and @itemKeys', () => {
		it.each([
			['a number default replaces .optional()', '\twithDefault: dsl(z.number()).default(5),'],
			['a quoted default keeps only the quoted value', "\twithQuoted: z.string().default('abc'),"],
			['a default with a trailing description keeps the first token', '\twithToken: dsl(z.boolean()).default(true),'],
			['an empty @default is ignored', '\temptyDefault: dsl(z.number()).optional(),'],
			['@itemKeys turns an array of typed items into a free array', '\tcols: dsl(z.array(z.unknown())),'],
		])('%s', (_name, line) => {
			expect(schemaOf('Probe')).toContain(line);
		});
	});

	describe('slots', () => {
		it('a ReactNode `children` is authored under `items`, a named ReactNode slot keeps its name', () => {
			const slots = schemaOf('Slots');
			expect(slots).toContain('\tfooter: dsl(z.array(z.unknown())).optional(),');
			expect(slots).toContain('\titems: dsl(z.array(z.unknown())).optional(),');
			expect(slots).not.toContain('children');
		});

		it('`children` is a node slot only when every union member is node-like: ReactNode | string keeps `children`', () => {
			const mixed = schemaOf('Mixed');
			expect(mixed).toContain('\tchildren: ');
			expect(mixed).not.toContain('\titems:');
		});

		it('`children` typed ReactNode | null | undefined is still a node slot', () => {
			const nullable = schemaOf('NullableSlot');
			expect(nullable).toContain('\titems: ');
			expect(nullable).not.toContain('children');
		});

		it('`children` typed ReactNode | render function is a node slot too (YAML cannot author a function)', () => {
			const wrapper = schemaOf('Wrapper');
			expect(wrapper).toContain('\titems: dsl(z.array(z.unknown())).optional(),');
			expect(wrapper).not.toContain('children');
			expect(wrapper).toContain('\tlabel: z.string(),');
		});
	});

	describe('bound inputs (@registryBind formData onChange)', () => {
		it('replaces value/onChange by an optional `bind`', () => {
			const bound = schemaOf('Bound');
			expect(bound).toContain('\tbind: z.string().optional(),');
			expect(bound).toContain('\tlabel: z.string().optional(),');
			expect(bound).not.toMatch(/\bvalue\b/);
			expect(bound).not.toMatch(/\bonChange\b/);
		});

		it('a toggle (checked without value) loses `checked` too', () => {
			const toggle = schemaOf('Toggle');
			expect(toggle).toContain('\tbind: z.string().optional(),');
			expect(toggle).not.toMatch(/\bchecked\b/);
		});

		it('keeps `checked` when the component also has a `value`', () => {
			const valued = schemaOf('Valued');
			expect(valued).toContain('\tbind: z.string().optional(),');
			expect(valued).toContain('\tchecked: dsl(z.boolean()),');
			expect(valued).not.toMatch(/\bvalue\b/);
		});

		it('a different bind pattern adds no `bind` and keeps value', () => {
			const filters = schemaOf('Filters');
			expect(filters).not.toContain('bind:');
			expect(filters).toContain('\tvalue: dsl(z.array(z.string())),');
		});
	});

	it('a component without props still gets an (empty) node schema', () => {
		expect(schemaOf('Nothing')).toBe('export const NothingNodeSchema = baseNode.extend({});');
	});
});

describe('generate-node-schemas CLI', () => {
	it.each(['--components', '--out'])('%s without a value fails with an actionable message', flag => {
		expect(() => execFileSync(process.execPath, [script, flag], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })).toThrow(
			new RegExp(`${flag} needs a path`)
		);
	}, 60_000);
});
