import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

	it('reports hasErrors false for clean pages, and ignores files that are not .yaml', () => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsl-compiler-test-'));
		fs.writeFileSync(path.join(dir, 'a.yaml'), `$type: Label\nlabel: hi\n`);
		fs.writeFileSync(path.join(dir, 'notes.md'), `$type: Nope\n`);
		fs.writeFileSync(path.join(dir, 'b.yml'), `$type: Nope\n`);

		const { results, hasErrors } = compileDslPagesDir(dir, registry);

		expect(hasErrors).toBe(false);
		expect(results.map((r) => path.basename(r.sourcePath!))).toEqual(['a.yaml']);
	});

	it('does not count a warning as an error, but still counts an error that sits next to a warning', () => {
		const withRaw = createRegistry([Label, { name: 'Raw', category: 'atomic', tags: [], render: () => null }]);
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsl-compiler-test-'));
		fs.writeFileSync(path.join(dir, 'warn.yaml'), `$type: Raw\nanything: 1\n`);
		expect(compileDslPagesDir(dir, withRaw)).toMatchObject({ hasErrors: false, results: [{ diagnostics: [{ severity: 'warning' }] }] });

		// One page carrying both: a leading warning must not hide the error behind it.
		fs.writeFileSync(path.join(dir, 'mixed.yaml'), `$type: Panel\nitems:\n  - $type: Raw\n    anything: 1\n  - $type: Nope\n`);
		const both = createRegistry([Label, Panel, { name: 'Raw', category: 'atomic', tags: [], render: () => null }]);
		const { results, hasErrors } = compileDslPagesDir(dir, both);
		expect(results.find((r) => r.sourcePath?.endsWith('mixed.yaml'))!.diagnostics.map((d) => d.severity)).toEqual(['warning', 'error']);
		expect(hasErrors).toBe(true);
	});

	it('compiles pages in alphabetical order whatever order the directory listing returns', () => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsl-compiler-test-'));
		fs.writeFileSync(path.join(dir, 'b.yaml'), `$type: Label\nlabel: b\n`);
		fs.writeFileSync(path.join(dir, 'a.yaml'), `$type: Label\nlabel: a\n`);
		const real = fs.readdirSync(dir);
		const spy = vi.spyOn(fs, 'readdirSync').mockReturnValue(['b.yaml', 'a.yaml'] as unknown as ReturnType<typeof fs.readdirSync>);
		try {
			const { results } = compileDslPagesDir(dir, registry);
			expect(results.map((r) => path.basename(r.sourcePath!))).toEqual(['a.yaml', 'b.yaml']);
		} finally {
			spy.mockRestore();
		}
		expect(real.sort()).toEqual(['a.yaml', 'b.yaml']);
	});

	it('names the file when one page is not valid YAML', () => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsl-compiler-test-'));
		fs.writeFileSync(path.join(dir, 'broken.yaml'), `$type: Label\n  label: [unclosed\n`);
		expect(() => compileDslPagesDir(dir, registry)).toThrow(/\[dslCompiler\] .*broken\.yaml: invalid YAML - /);
	});
});

describe('compileDslDocument input errors', () => {
	it('throws an actionable error for invalid YAML, naming the source (or saying it is inline) and keeping the cause', () => {
		const bad = `$type: Label\n  label: [unclosed\n`;
		expect(() => compileDslDocument(bad, registry)).toThrow(/^\[dslCompiler\] <inline document>: invalid YAML - /);
		let caught: unknown;
		try {
			compileDslDocument(bad, registry, { sourcePath: 'pages/x.yaml' });
		} catch (error) {
			caught = error;
		}
		expect((caught as Error).message).toMatch(/^\[dslCompiler\] pages\/x\.yaml: invalid YAML - /);
		expect((caught as Error).cause).toBeInstanceOf(Error);
	});

	it('reports an empty file as an error diagnostic instead of crashing on it', () => {
		for (const text of ['', '# only a comment\n']) {
			const artifact = compileDslDocument(text, registry, { sourcePath: 'pages/empty.yaml' });
			expect(artifact.diagnostics).toEqual([expect.objectContaining({ severity: 'error', code: 'invalid-node', nodePath: '$' })]);
			expect(artifact.sourcePath).toBe('pages/empty.yaml');
		}
	});

	it('reports a page without $type and a child without $type', () => {
		expect(compileDslDocument(`label: hi\n`, registry).diagnostics).toEqual([expect.objectContaining({ code: 'missing-type', nodePath: '$' })]);
		expect(compileDslDocument(`$type: Panel\nitems:\n  - label: forgot the type\n`, registry).diagnostics).toEqual([
			expect.objectContaining({ code: 'missing-type', type: 'Panel', nodePath: '$.items[0]' }),
		]);
	});

	it('stamps the artifact with the sourcePath, the format version and a parseable compile time', () => {
		const before = Date.now();
		const artifact = compileDslDocument(`$type: Label\nlabel: hi\n`, registry, { sourcePath: 'p.yaml' });
		expect(artifact.sourcePath).toBe('p.yaml');
		expect(Date.parse(artifact.compiledAt)).toBeGreaterThanOrEqual(before - 1000);
		expect(compileDslDocument(`$type: Label\nlabel: hi\n`, registry).sourcePath).toBeUndefined();
	});
});
