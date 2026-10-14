import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildEntriesFile } from './entriesGenerator.js';

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
