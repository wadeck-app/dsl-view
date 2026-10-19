import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Project } from 'ts-morph';

import { createRegistry } from '../ComponentRegistry.js';
import { compileDslDocument } from './dslCompiler.js';
import { buildEntriesFile, extractAllowedChildren, extractKnownKeys, extractMapSlots } from './entriesGenerator.js';

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

describe('extractMapSlots', () => {
	function mapSlotsOf(source: string, name: string) {
		const project = new Project({ useInMemoryFileSystem: true, skipFileDependencyResolution: true });
		return extractMapSlots(project.createSourceFile('C.tsx', source), name);
	}
	const entry = ['export interface VariantSpec {', '  label: string;', '  hint: string;', '  view: unknown;', '}'];

	it('derives the entry keys from the Record value interface and keeps the node key', () => {
		const result = mapSlotsOf([...entry, 'export interface XProps {', '  /** @mapSlot view */', '  variants: Record<string, VariantSpec>;', '}'].join('\n'), 'X');
		expect(result).toEqual({ variants: { keys: ['label', 'hint', 'view'], nodeKey: 'view' } });
	});

	it('returns nothing for a component without @mapSlot', () => {
		expect(mapSlotsOf('export interface XProps { gap?: string }', 'X')).toEqual({});
	});

	it('fails loudly when the shape cannot be derived (never a silently unchecked slot)', () => {
		const props = (decl: string, tag = '@mapSlot view') => [...entry, 'export interface XProps {', `  /** ${tag} */`, `  ${decl}`, '}'].join('\n');
		expect(() => mapSlotsOf(props('variants: Record<string, Unknown>;'), 'X')).toThrow(/same file/);
		expect(() => mapSlotsOf(props('variants: string[];'), 'X')).toThrow(/Record<string, SomeInterface>/);
		expect(() => mapSlotsOf(props('variants: Record<string, VariantSpec>;', '@mapSlot'), 'X')).toThrow(/needs the key/);
		expect(() => mapSlotsOf(props('variants: Record<string, VariantSpec>;', '@mapSlot node'), 'X')).toThrow(/not a property of VariantSpec/);
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

describe('@ctxDefault (a callback prop that defaults to the same-named ctx entry)', () => {
	const source = [
		'export interface GridProps {',
		'  /** @ctxDefault */',
		'  onAction?: (action: string, row: unknown) => void;',
		'  onRowClick?: (row: unknown) => void;',
		'}',
		'export function Grid(props: GridProps) { return null }',
	].join('\n');
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-default-test-'));
	const sourcePath = path.join(tmpDir, 'Grid.tsx');
	fs.writeFileSync(sourcePath, source);
	afterAll(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('falls back to ctx only for the tagged prop; an untagged callback stays YAML-only', () => {
		const output = buildEntriesFile([
			{ name: 'Grid', category: 'composite', tags: [], bindPattern: null, lazy: false, allowedChildren: {}, providesContext: [], requiresContext: [], sourcePath },
		]);
		expect(output).toContain(`const onAction = (resolveExpressionValue(node['onAction'], ctx) ?? ctx['onAction'])`);
		expect(output).toContain(`const onRowClick = (resolveExpressionValue(node['onRowClick'], ctx))`);
		expect(output).not.toContain(`ctx['onRowClick']`);
	});
});

describe('@mapSlot end to end (a prop that is a map of named entries carrying a nested node)', () => {
	const source = [
		"import React from 'react';",
		'export interface ExperimentVariant { label: string; hint: string; view: unknown }',
		'export interface ExperimentProps {',
		'  id: string;',
		'  /** @mapSlot view */',
		'  variants: Record<string, ExperimentVariant>;',
		'  renderNode: (node: unknown, ctx: Record<string, unknown>) => React.ReactNode;',
		'}',
		'export function Experiment(props: ExperimentProps) { return null }',
	].join('\n');
	// buildEntriesFile re-reads the component from disk.
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'map-slot-test-'));
	const sourcePath = path.join(tmpDir, 'Experiment.tsx');
	fs.writeFileSync(sourcePath, source);
	afterAll(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});
	const project = new Project({ skipFileDependencyResolution: true });
	const sourceFile = project.addSourceFileAtPath(sourcePath);
	const mapSlots = extractMapSlots(sourceFile, 'Experiment');
	const knownKeys = extractKnownKeys(sourceFile, 'Experiment', null);

	it('emits the metadata and wires the callback (not a YAML key) to the DSL renderer', () => {
		expect(knownKeys).toEqual(['id', 'variants']);
		const output = buildEntriesFile([
			{ name: 'Experiment', category: 'disposition', tags: [], bindPattern: null, lazy: false, allowedChildren: {}, knownKeys, mapSlots, providesContext: [], requiresContext: [], sourcePath: sourcePath },
		]);
		expect(output).toContain(`ExperimentEntry.mapSlots = ${JSON.stringify(mapSlots)};`);
		expect(output).toContain('renderNode={renderNode}');
		expect(output).toContain('renderChildren([n], registry, { ...ctx, ...extraCtx })');
	});

	it('the compiler recurses into the nested nodes and rejects unknown keys at every level', () => {
		const registry = createRegistry([
			{ name: 'Experiment', category: 'disposition', tags: [], knownKeys, mapSlots, render: () => null },
			{ name: 'Label', category: 'atomic', tags: [], knownKeys: ['label'], render: () => null },
		]);
		const yaml = (variant: string) => `$type: Experiment\nid: t\nvariants:\n  a:\n    label: A\n    hint: a\n${variant}`;
		expect(compileDslDocument(yaml('    view:\n      $type: Label\n      label: hi\n'), registry).diagnostics).toEqual([]);
		expect(compileDslDocument(yaml('    view:\n      $type: Label\n      lable: hi\n'), registry).diagnostics).toEqual([
			expect.objectContaining({ code: 'unknown-key', type: 'Label', nodePath: '$.variants.a.view', message: expect.stringContaining('Did you mean "label"?') }),
		]);
		expect(compileDslDocument(yaml('    views:\n      $type: Label\n'), registry).diagnostics).toEqual([
			expect.objectContaining({ code: 'unknown-key', type: 'Experiment', nodePath: '$.variants.a' }),
			expect.objectContaining({ code: 'invalid-map-slot', nodePath: '$.variants.a' }),
		]);
	});
});
