import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createRegistry } from '../ComponentRegistry.js';
import type { ComponentRegistryEntry } from '../ComponentRegistry.js';
import { computeRegistryFingerprint } from '../registryHash.js';
import { compileDslDocument, compileDslPagesDir, COMPILED_DSL_FORMAT_VERSION } from './dslCompiler.js';

const Label: ComponentRegistryEntry = {
	name: 'Label',
	category: 'atomic',
	tags: [],
	knownKeys: ['label'],
	render: () => null,
};

const Validated: ComponentRegistryEntry = {
	name: 'Validated',
	category: 'atomic',
	tags: [],
	knownKeys: ['required'],
	nodeSchema: z.object({ $type: z.literal('Validated'), required: z.string() }),
	render: () => null,
};

const Panel: ComponentRegistryEntry = {
	name: 'Panel',
	category: 'disposition',
	tags: [],
	allowedChildren: { items: ['atomic'] },
	knownKeys: ['items'],
	render: () => null,
};

const registry = createRegistry([Label, Validated, Panel]);

describe('compileDslDocument', () => {
	it('produces zero diagnostics for a valid document and matching registry', () => {
		const artifact = compileDslDocument(`$type: Label\nlabel: hi\n`, registry);
		expect(artifact.diagnostics).toEqual([]);
		expect(artifact.formatVersion).toBe(COMPILED_DSL_FORMAT_VERSION);
		expect(artifact.registryFingerprint).toBe(computeRegistryFingerprint(registry));
		expect(artifact.doc).toEqual({ $type: 'Label', label: 'hi' });
	});

	it('flags an unknown $type', () => {
		const artifact = compileDslDocument(`$type: Nope\n`, registry);
		expect(artifact.diagnostics).toEqual([
			expect.objectContaining({ code: 'unknown-component-type', nodePath: '$', type: 'Nope' }),
		]);
	});

	it('flags an unknown $-prefixed directive', () => {
		const artifact = compileDslDocument(`$type: Label\n$typo: oops\n`, registry);
		expect(artifact.diagnostics).toEqual([expect.objectContaining({ code: 'unknown-directive', type: 'Label' })]);
	});

	it('ignores page-level $nav* keys (consumed by routesGenerator)', () => {
		const artifact = compileDslDocument(`$route: /x\n$navLabel: X\n$navBadge: 3\n$type: Label\nlabel: hi\n`, registry);
		expect(artifact.diagnostics).toEqual([]);
	});

	it('flags a node that fails its nodeSchema', () => {
		const artifact = compileDslDocument(`$type: Validated\n`, registry);
		expect(artifact.diagnostics).toEqual([expect.objectContaining({ code: 'node-schema', type: 'Validated' })]);
	});

	it('does not recurse into ExtensionSlot items', () => {
		const artifact = compileDslDocument(`$type: ExtensionSlot\nitems: $sources.contributions\n`, registry);
		expect(artifact.diagnostics).toEqual([]);
	});

	it('recurses into items via allowedChildren with a correct nodePath', () => {
		const artifact = compileDslDocument(
			`$type: Panel\nitems:\n  - $type: Label\n    label: ok\n  - $type: Nope\n`,
			registry
		);
		expect(artifact.diagnostics).toEqual([
			expect.objectContaining({ code: 'unknown-component-type', type: 'Nope', nodePath: '$.items[1]' }),
		]);
	});

	it('does not descend into props of a component with no allowedChildren', () => {
		const artifact = compileDslDocument(`$type: Label\nchildren:\n  - $type: Nope\n`, registry);
		expect(artifact.diagnostics.map((d) => d.code)).toEqual(['unknown-key']);
	});

	it('flags children used instead of items with an actionable message', () => {
		const artifact = compileDslDocument(`$type: Panel\nchildren:\n  - $type: Label\n`, registry);
		expect(artifact.diagnostics).toEqual([
			expect.objectContaining({
				severity: 'error',
				code: 'unknown-key',
				type: 'Panel',
				nodePath: '$',
				message: expect.stringMatching(/unknown key "children".*Did you mean "items"\?.*Known keys: items/),
			}),
		]);
	});

	it('suggests the closest known key for a typo', () => {
		const artifact = compileDslDocument(`$type: Label\nlabl: hi\n`, registry);
		expect(artifact.diagnostics).toEqual([
			expect.objectContaining({ code: 'unknown-key', message: expect.stringContaining('Did you mean "label"?') }),
		]);
	});

	it('does not flag $-directives or known keys', () => {
		const artifact = compileDslDocument(`$type: Label\n$if: $x\nlabel: hi\n`, registry);
		expect(artifact.diagnostics).toEqual([]);
	});

	it('reports an explicit warning (not a silent skip) when the entry has no knownKeys', () => {
		const unchecked = createRegistry([{ name: 'Raw', category: 'atomic', tags: [], render: () => null }]);
		const artifact = compileDslDocument(`$type: Raw\nanything: 1\n`, unchecked);
		expect(artifact.diagnostics).toEqual([
			expect.objectContaining({ severity: 'warning', code: 'unchecked-keys', type: 'Raw' }),
		]);
	});
});

describe('compileDslPagesDir', () => {
	let dir: string;

	afterEach(() => {
		if (dir) fs.rmSync(dir, { recursive: true, force: true });
	});

	it('identifies the broken file and reports hasErrors', () => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsl-compiler-test-'));
		fs.writeFileSync(path.join(dir, 'good.yaml'), `$type: Label\nlabel: hi\n`);
		fs.writeFileSync(path.join(dir, 'bad.yaml'), `$type: Nope\n`);

		const { results, hasErrors } = compileDslPagesDir(dir, registry);

		expect(hasErrors).toBe(true);
		const bad = results.find((r) => r.sourcePath?.endsWith('bad.yaml'));
		const good = results.find((r) => r.sourcePath?.endsWith('good.yaml'));
		expect(bad?.diagnostics).toEqual([expect.objectContaining({ code: 'unknown-component-type' })]);
		expect(good?.diagnostics).toEqual([]);
	});

	it('throws loudly (no silent empty result) when pagesDir does not exist', () => {
		const missingDir = path.join(os.tmpdir(), 'dsl-compiler-test-does-not-exist');
		expect(() => compileDslPagesDir(missingDir, registry)).toThrow(/ENOENT/);
	});
});
