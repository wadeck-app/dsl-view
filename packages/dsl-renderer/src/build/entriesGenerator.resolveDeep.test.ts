import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { buildEntriesFile } from './entriesGenerator.js';

describe('@resolveDeep (a map prop whose values are expressions)', () => {
	const source = [
		'export interface PanelProps {',
		'  /** @resolveDeep */',
		'  params?: Record<string, unknown>;',
		'  extra?: Record<string, unknown>;',
		'}',
		'export function Panel(props: PanelProps) { return null }',
	].join('\n');
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-deep-test-'));
	const sourcePath = path.join(tmpDir, 'Panel.tsx');
	fs.writeFileSync(sourcePath, source);
	afterAll(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	const entry = { name: 'Panel', category: 'composite', tags: [], bindPattern: null, lazy: false, allowedChildren: {}, providesContext: [], requiresContext: [], sourcePath };

	it('resolves the expressions inside only the tagged prop; an untagged map keeps literal strings', () => {
		const output = buildEntriesFile([entry]);
		expect(output).toContain(`const params = coerceProp(resolveExpressionsDeep(node['params'], ctx), 'Panel.params',`);
		expect(output).toContain(`const extra = coerceProp(resolveExpressionValue(node['extra'], ctx), 'Panel.extra',`);
		expect(output).not.toContain(`resolveExpressionsDeep(node['extra']`);
	});

	it('imports the deep resolver only when a prop uses it', () => {
		const withTag = buildEntriesFile([entry]);
		expect(withTag).toMatch(/import \{[^}]*\bresolveExpressionsDeep\b[^}]*\} from /);

		const plainSource = path.join(tmpDir, 'Plain.tsx');
		fs.writeFileSync(plainSource, ['export interface PlainProps {', '  extra?: Record<string, unknown>;', '}', 'export function Plain(props: PlainProps) { return null }'].join('\n'));
		const withoutTag = buildEntriesFile([{ ...entry, name: 'Plain', sourcePath: plainSource }]);
		expect(withoutTag).not.toContain('resolveExpressionsDeep');
	});
});
