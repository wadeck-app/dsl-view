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
		expect(generated.VerticalStackNodeSchema.safeParse({ type: 'VerticalStack', items: [] }).success).toBe(true);
		expect(generated.VerticalStackNodeSchema.safeParse({ type: 'VerticalStack', gap: 'gap-99' }).success).toBe(false);
	});
});
