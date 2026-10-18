import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Project } from 'ts-morph';

import { createRegistry } from '../ComponentRegistry.js';
import { compileDslDocument } from './dslCompiler.js';
import { buildEntriesFile, extractAllowedChildren, extractKnownKeys } from './entriesGenerator.js';

describe('entriesGenerator @registryLazy', () => {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entries-generator-test-'));
	const chartPath = path.join(tmpDir, 'Chart.tsx');
	const buttonPath = path.join(tmpDir, 'Button.tsx');
	const expandableRowPath = path.join(tmpDir, 'ExpandableRow.tsx');

	beforeAll(() => {
		fs.writeFileSync(
			chartPath,
			`export interface ChartProps { data: unknown[] }\nexport function Chart(props: ChartProps) { return null }\n`
		);
		fs.writeFileSync(
			buttonPath,
			`export interface ButtonProps { label: string }\nexport function Button(props: ButtonProps) { return null }\n`
		);
		fs.writeFileSync(
			expandableRowPath,
			[
				"import React from 'react';",
				'export interface ExpandableRowProps {',
				'  expansion?: Record<string, unknown>;',
				'  renderNode?: (node: unknown, ctx: Record<string, unknown>) => React.ReactNode;',
				'}',
				'export function ExpandableRow(props: ExpandableRowProps) { return null }',
			].join('\n')
		);
	});

	afterAll(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('emits a React.lazy() wrapper instead of a static import for a lazy component', () => {
		const outputDir = path.resolve('/tmp/test-app', 'src/generated');
		const importPath = path.relative(outputDir, chartPath.slice(0, -'.tsx'.length)).split(path.sep).join('/') + '.js';

		const output = buildEntriesFile([
			{
				name: 'Chart',
				category: 'composite',
				tags: ['chart'],
				bindPattern: null,
				lazy: true,
				allowedChildren: {},
				providesContext: [],
				requiresContext: [],
				sourcePath: chartPath,
			},
		]);

		expect(output).toContain(
			`const ChartLazy = React.lazy(() => import('${importPath}').then(m => ({ default: m.Chart })))`
		);
		// Loading AND error state are scoped to this component's own output via LazyBoundary, not the whole page.
		expect(output).toContain("import { LazyBoundary } from");
		expect(output).toContain('<LazyBoundary><ChartLazy {...props} /></LazyBoundary>');
		expect(output).not.toContain('import { Chart } from');
	});

	it('keeps a static import for a non-lazy component', () => {
		const outputDir = path.resolve('/tmp/test-app', 'src/generated');
		const importPath = path.relative(outputDir, buttonPath.slice(0, -'.tsx'.length)).split(path.sep).join('/') + '.js';

		const output = buildEntriesFile([
			{
				name: 'Button',
				category: 'atomic',
				tags: [],
				bindPattern: null,
				lazy: false,
				allowedChildren: {},
				providesContext: [],
				requiresContext: [],
				sourcePath: buttonPath,
			},
		]);

		expect(output).toContain(`import { Button } from '${importPath}'`);
		expect(output).not.toContain('React.lazy');
	});

	it('wires a (node, ctx) => ReactNode prop to re-enter renderChildren with merged ctx, not resolveExpressionValue', () => {
		const output = buildEntriesFile([
			{
				name: 'ExpandableRow',
				category: 'atomic',
				tags: [],
				bindPattern: null,
				lazy: false,
				allowedChildren: {},
				providesContext: [],
				requiresContext: [],
				sourcePath: expandableRowPath,
			},
		]);

		// Must NOT fall into the generic resolveExpressionValue(node['renderNode'], ctx) path -
		// that's exactly the bug (DataTable.tsx:797 renderNode was always undefined from YAML).
		expect(output).not.toContain(`resolveExpressionValue(node['renderNode'], ctx)`);
		expect(output).toContain(
			'const renderNode = (n: unknown, extraCtx: Record<string, unknown>) => renderChildren([n], registry, { ...ctx, ...extraCtx })[0] ?? null'
		);
		// expansion itself is plain data (the YAML sub-node), still resolved normally.
		expect(output).toContain(`resolveExpressionValue(node['expansion'], ctx)`);
	});
});

describe('extractAllowedChildren DSL key', () => {
	function extract(source: string, name: string) {
		const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
		return extractAllowedChildren(project.createSourceFile('C.tsx', source), name);
	}

	it('keys a ReactNode `children` slot by `items`, the key the generated render reads', () => {
		const result = extract(
			[
				'export interface StackProps {',
				'  /** @slot tag:layout, tag:atomic */',
				'  children: React.ReactNode;',
				'}',
			].join('\n'),
			'Stack'
		);
		expect(result).toEqual({ items: ['layout', 'atomic'] });
	});

	it('keeps the prop name for a named ReactNode slot', () => {
		const result = extract(
			['export interface CardProps {', '  /** @slot tag:action-bar */', '  actions?: React.ReactNode;', '}'].join('\n'),
			'Card'
		);
		expect(result).toEqual({ actions: ['action-bar'] });
	});

	it('keeps `children` for a non-ReactNode typed prop (e.g. FieldWrapper)', () => {
		const result = extract(
			['export interface FieldWrapperProps {', '  /** @slot tag:atomic */', '  children: unknown[];', '}'].join('\n'),
			'FieldWrapper'
		);
		expect(result).toEqual({ children: ['atomic'] });
	});
});

describe('extractKnownKeys', () => {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'known-keys-test-'));

	afterAll(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function keysOf(source: string, name: string, bindPattern: string[] | null = null) {
		const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
		return extractKnownKeys(project.createSourceFile('C.tsx', source), name, bindPattern);
	}

	it('maps a ReactNode `children` prop to `items` and drops internal/data props', () => {
		const keys = keysOf(
			[
				'export interface StackProps {',
				'  gap?: string;',
				'  className?: string;',
				"  'data-testid'?: string;",
				"  'aria-label'?: string;",
				'  actions?: React.ReactNode;',
				'  children: React.ReactNode;',
				'}',
			].join('\n'),
			'Stack'
		);
		expect(keys).toEqual(['actions', 'aria-label', 'gap', 'items']);
	});

	it('keeps `children` for a non-ReactNode typed prop', () => {
		expect(keysOf('export interface FieldWrapperProps { children: unknown[] }', 'FieldWrapper')).toEqual(['children']);
	});

	it('adds `bind` and drops value/onChange for a formData bind component', () => {
		const keys = keysOf(
			'export interface FieldProps { label: string; value: string; onChange: (v: string) => void }',
			'Field',
			['formData', 'onChange']
		);
		expect(keys).toEqual(['bind', 'label']);
	});

	it('falls back to `items` when there is no Props interface', () => {
		expect(keysOf('export function RouterProvider() { return null }', 'RouterProvider')).toEqual(['items']);
	});

	it('matches exactly the node[...] keys read by the generated render (consistency with generateSimpleEntry)', () => {
		const sources: Array<{ name: string; source: string; bindPattern: string[] | null }> = [
			{
				name: 'Mixed',
				source: [
					"import React from 'react';",
					'export interface MixedProps {',
					'  gap?: string; className?: string; style?: object;',
					"  'aria-label'?: string; 'data-x'?: string;",
					'  actions?: React.ReactNode; children: React.ReactNode;',
					'  renderNode?: (node: unknown, ctx: Record<string, unknown>) => React.ReactNode;',
					'}',
					'export function Mixed(props: MixedProps) { return null }',
				].join('\n'),
				bindPattern: null,
			},
			{
				name: 'Toggle',
				source: [
					'export interface ToggleProps { label: string; checked: boolean; onChange: (v: boolean) => void }',
					'export function Toggle(props: ToggleProps) { return null }',
				].join('\n'),
				bindPattern: ['formData', 'onChange'],
			},
		];
		for (const { name, source, bindPattern } of sources) {
			const file = path.join(tmpDir, `${name}.tsx`);
			fs.writeFileSync(file, source);
			const project = new Project({ skipFileDependencyResolution: true });
			const knownKeys = extractKnownKeys(project.addSourceFileAtPath(file), name, bindPattern);
			const output = buildEntriesFile([
				{
					name,
					category: 'atomic',
					tags: [],
					bindPattern,
					lazy: false,
					allowedChildren: {},
					knownKeys,
					providesContext: [],
					requiresContext: [],
					sourcePath: file,
				},
			]);
			const readKeys = [...new Set([...output.matchAll(/node\['([^']+)'\]/g)].map((m) => m[1]!))].sort();
			expect(readKeys).toEqual(knownKeys);
			expect(output).toContain(`${name}Entry.knownKeys = ${JSON.stringify(knownKeys)};`);
		}
	});

	it('end to end: `children:` under a generated VerticalStack-like entry fails the compiler with a hint', () => {
		const source = [
			"import React from 'react';",
			'export interface VerticalStackProps {',
			'  gap?: string;',
			'  /** @slot tag:layout, tag:atomic */',
			'  children: React.ReactNode;',
			'}',
			'export function VerticalStack(props: VerticalStackProps) { return null }',
		].join('\n');
		const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
		const sourceFile = project.createSourceFile('VerticalStack.tsx', source);
		const registry = createRegistry([
			{
				name: 'VerticalStack',
				category: 'disposition',
				tags: ['layout'],
				allowedChildren: extractAllowedChildren(sourceFile, 'VerticalStack'),
				knownKeys: extractKnownKeys(sourceFile, 'VerticalStack', null),
				render: () => null,
			},
		]);

		const broken = compileDslDocument(`$type: VerticalStack\nchildren:\n  - $type: VerticalStack\n`, registry);
		expect(broken.diagnostics).toEqual([
			expect.objectContaining({
				severity: 'error',
				code: 'unknown-key',
				message: expect.stringContaining('Did you mean "items"?'),
			}),
		]);
		const fixed = compileDslDocument(`$type: VerticalStack\nitems:\n  - $type: VerticalStack\n`, registry);
		expect(fixed.diagnostics).toEqual([]);
	});
});
