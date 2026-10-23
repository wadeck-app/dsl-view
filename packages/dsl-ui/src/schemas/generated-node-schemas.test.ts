import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as generated from './generated-node-schemas.js';

const componentsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components');

function listComponentFiles(dir: string): string[] {
	return fs
		.readdirSync(dir, { recursive: true, encoding: 'utf-8' })
		.filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx') && !f.endsWith('.stories.tsx'))
		.map((f) => path.join(dir, f));
}

// Returns the body of `export interface <name> { ... }` (brace-matched), or null.
function interfaceBody(source: string, name: string): string | null {
	const start = source.search(new RegExp(`export interface ${name}\\s*(<[^>]*>)?\\s*\\{`));
	if (start === -1) return null;
	const open = source.indexOf('{', start);
	let depth = 0;
	for (let i = open; i < source.length; i++) {
		if (source[i] === '{') depth++;
		if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
	}
	return null;
}

describe('generated node schemas vs the key the renderer reads', () => {
	const sources = listComponentFiles(componentsDir).map((file) => fs.readFileSync(file, 'utf-8'));
	const schemas = Object.entries(generated).filter(([name]) => name.endsWith('NodeSchema')) as Array<
		[string, { shape: Record<string, unknown> }]
	>;

	it('exports a schema per component (guards against an empty or truncated regeneration)', () => {
		expect(schemas.length).toBeGreaterThan(40);
	});

	it('declares `items`, never `children`, for a component whose `children` prop is a plain ReactNode', () => {
		let checked = 0;
		for (const [schemaName, schema] of schemas) {
			const component = schemaName.replace(/NodeSchema$/, '');
			const body = sources.map((s) => interfaceBody(s, `${component}Props`)).find((b) => b !== null);
			if (!body) continue;
			if (!/^\s*children\??:\s*(React\.)?ReactNode;/m.test(body)) continue;
			checked++;
			expect(Object.keys(schema.shape), `${schemaName}: the renderer reads this slot from \`items\``).toContain('items');
			expect(Object.keys(schema.shape), `${schemaName}: \`children\` is not a DSL key here`).not.toContain('children');
		}
		expect(checked).toBeGreaterThan(5);
	});

	it('keeps `children` for FieldWrapper, whose `children` prop is not a plain ReactNode', () => {
		expect(Object.keys(generated.FieldWrapperNodeSchema.shape)).toContain('children');
		expect(Object.keys(generated.FieldWrapperNodeSchema.shape)).not.toContain('items');
	});

	it('accepts a VerticalStack authored with `items` and exposes the real gap enum', () => {
		expect(generated.VerticalStackNodeSchema.safeParse({ $type: 'VerticalStack', items: [] }).success).toBe(true);
		expect(generated.VerticalStackNodeSchema.safeParse({ $type: 'VerticalStack', gap: 'gap-99' }).success).toBe(false);
	});
});

// DslRenderer / dslCompiler call `entry.nodeSchema.safeParse(node)` on the node AS AUTHORED: `$type` instead of
// `type`, `$`-directives, and `$expressions` where a literal is expected. These fixtures are shaped like the parsed
// YAML of real pages (capability-framework books/logs/dashboard pages, queue History).
describe('generated node schemas accept nodes as authored in YAML', () => {
	const schemas = generated as unknown as Record<string, { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] } } }>;

	function validateTree(node: unknown, path = '$', problems: string[] = []): string[] {
		if (!node || typeof node !== 'object') return problems;
		const record = node as Record<string, unknown>;
		const type = record['$type'];
		if (typeof type === 'string') {
			const schema = schemas[`${type}NodeSchema`];
			if (schema) {
				const result = schema.safeParse(record);
				if (!result.success) problems.push(`${path} ${type}: ${JSON.stringify(result.error?.issues)}`);
			}
		}
		const items = record['items'];
		if (Array.isArray(items)) items.forEach((child, i) => validateTree(child, `${path}.items[${i}]`, problems));
		return problems;
	}

	const page = {
		$type: 'VerticalStack',
		$if: '$vars.showHistory',
		$id: 'history',
		gap: 'gap-4',
		items: [
			{ $type: 'SearchBar', urlParam: 'event', placeholder: 'Event', resetUrlParams: ['page'] },
			{
				$type: 'DataTable',
				rows: '$sources.history.items',
				loading: '$ctx.$initialLoading',
				emptyMessage: 'No events',
				columns: [
					{ field: 'event', label: 'Event', truncate: true, width: 200 },
					{ field: 'createdAt', label: 'When', format: 'datetime', nowrap: true },
					{ type: 'actions', items: [{ label: 'Replay', action: 'replay', variant: 'danger-outline' }] },
				],
				onAction: '$onAction',
			},
			{
				$type: 'Chart',
				data: '$sources.activity.items',
				xAxisKey: 'hour',
				xAxisType: 'category',
				yFormat: 'number',
				variant: 'sparkline',
				series: [{ key: 'count', name: 'Events', type: 'bar' }],
			},
			{ $type: 'ButtonAction', label: 'Save', action: 'save', type: 'submit' },
			{ $type: 'CheckboxGroup', bind: 'tags', label: 'Tags', options: [{ value: 'a', label: 'A' }] },
		],
	};

	it('accepts a realistic page: $type, $directives, $expressions, bound inputs and YAML column shapes', () => {
		expect(validateTree(page)).toEqual([]);
	});

	it('still rejects a wrong literal prop type (the schemas are not vacuous)', () => {
		const bad = { ...page, items: [{ $type: 'Chart', xAxisKey: 'hour', xAxisType: 'category', series: [], height: 'tall' }] };
		expect(validateTree(bad)).toEqual([expect.stringContaining('Chart')]);
		const badRows = { $type: 'DataTable', rows: 'not-an-expression', columns: [] };
		expect(schemas['DataTableNodeSchema']!.safeParse(badRows).success).toBe(false);
	});

	it('rejects a node authored with `type:` instead of `$type:`', () => {
		expect(schemas['VerticalStackNodeSchema']!.safeParse({ type: 'VerticalStack', items: [] }).success).toBe(false);
	});

	it('declares exactly the directives the renderer knows (KNOWN_DSL_KEYS in dsl-renderer)', async () => {
		const dslKeysPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../dsl-renderer/dist/dslKeys.js');
		if (!fs.existsSync(dslKeysPath)) {
			throw new Error(`dsl-renderer is not built (${dslKeysPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { KNOWN_DSL_KEYS } = await import(/* @vite-ignore */ dslKeysPath);
		const declared = Object.keys(generated.VerticalStackNodeSchema.shape).filter((k) => k.startsWith('$'));
		expect(new Set(declared)).toEqual(new Set(KNOWN_DSL_KEYS));
	});
});
