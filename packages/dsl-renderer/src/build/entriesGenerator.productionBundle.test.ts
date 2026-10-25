// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildEntriesFile } from './entriesGenerator.js';

// The dev-time prop schema check must cost a production bundle nothing: the schemas (and zod behind them) are only
// worth shipping in development. This bundles the generated entries of a tiny library the way a consumer app does,
// and looks for a marker string that only exists in the library's schemas module.
const MARKER = '__SCHEMA_MARKER_7f3a9c__';
// A prop name of the library's Badge. The name alone also appears in the generated render (it reads `node['<prop>']`), so the
// marker is the two names listed next to each other, which only the entry's `knownKeys` list (an authoring check) does.
const KEYS_MARKER = 'keysMarker7f3a9c';
const KEYS_LIST = new RegExp(`["']${KEYS_MARKER}["']\s*,\s*["']label["']|["']label["']\s*,\s*["']${KEYS_MARKER}["']`);
const rendererIndex = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.ts');
const repoNodeModules = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../node_modules');

let root: string;

function write(file: string, content: string) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content);
}

// A library whose schemas module has a top-level side effect, like zod schemas built with function calls: a bundler may
// only drop it when the package says it has no side effects.
function makeLibrary(name: string, packageJson: Record<string, unknown>): string {
	const lib = path.join(root, name);
	write(path.join(lib, 'package.json'), JSON.stringify({ name, ...packageJson }));
	write(
		path.join(lib, 'src/components/display/Badge.tsx'),
		`export interface BadgeProps { label?: string; ${KEYS_MARKER}?: string }
/**
 * @registryCategory atomic
 */
export function Badge(props: BadgeProps) { return props.label ?? null }
`
	);
	write(
		path.join(lib, 'src/schemas/generated-node-schemas.ts'),
		`function makeSchema(marker: string) {
	(globalThis as Record<string, unknown>).__schemaSideEffect = true;
	return { marker };
}
export const BadgeNodeSchema = makeSchema('${MARKER}');
`
	);
	return lib;
}

async function bundleOf(
	lib: string,
	nodeEnv: 'production' | 'development',
	options?: { main?: string; format?: 'esm' | 'cjs'; platform?: 'browser' | 'node' }
): Promise<string> {
	const appRoot = path.join(lib, 'app');
	const entries = buildEntriesFile(appRoot, [{ pkg: path.basename(lib), absDir: path.join(lib, 'src/components') }], undefined, {
		usePackageImports: true,
		monorepoRoot: root,
	});
	write(path.join(appRoot, 'src/generated/entries.tsx'), entries);
	write(path.join(appRoot, 'main.ts'), options?.main ?? `import * as entries from './src/generated/entries';\nconsole.log(entries);\n`);
	const result = await build({
		entryPoints: [path.join(appRoot, 'main.ts')],
		bundle: true,
		write: false,
		minify: true,
		format: options?.format ?? 'esm',
		platform: options?.platform ?? 'browser',
		jsx: 'automatic',
		logLevel: 'silent',
		// What the consumer's bundler does: replace the exact expression, and resolve the library packages.
		define: { 'process.env.NODE_ENV': JSON.stringify(nodeEnv) },
		alias: { '@wadeck-app/dsl-renderer': rendererIndex },
		nodePaths: [repoNodeModules],
	});
	return result.outputFiles.map((file) => file.text).join('\n');
}

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-bundle-'));
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe('production bundle of generated entries', () => {
	it('contains no schema in a production build when the library declares itself side-effect free', async () => {
		const lib = makeLibrary('libFlagged', { sideEffects: false });

		const code = await bundleOf(lib, 'production');

		expect(code).not.toContain(MARKER);
		expect(code).not.toContain('__schemaSideEffect');
	}, 60_000);

	// The key lists are inline data of the entry, not a module: no `sideEffects` field is needed for them to fold away.
	it('contains no known-keys list in a production build, whatever the library declares', async () => {
		const flagged = await bundleOf(makeLibrary('libKeysFlagged', { sideEffects: false }), 'production');
		const unflagged = await bundleOf(makeLibrary('libKeysUnflagged', {}), 'production');

		expect(flagged).not.toMatch(KEYS_LIST);
		expect(unflagged).not.toMatch(KEYS_LIST);
	}, 60_000);

	// The compiler fingerprints the registry from the full entries; the production runtime compares its own fingerprint to
	// it. Stripping the lists must not change the fingerprint, or every compiled page would warn "stale" in production.
	it('gives the same registry fingerprint in production and in development', async () => {
		const main =
			`import { allEntries } from './src/generated/entries';\n` +
			`import { createRegistry, computeRegistryFingerprint } from '@wadeck-app/dsl-renderer';\n` +
			`module.exports = { fingerprint: computeRegistryFingerprint(createRegistry(allEntries)), keys: allEntries[0].knownKeys };\n`;
		const evaluate = (code: string) => {
			const sandbox = { exports: {} as { fingerprint?: string; keys?: string[] } };
			new Function('module', 'process', code)(sandbox, { env: {} });
			return sandbox.exports;
		};

		const dev = evaluate(await bundleOf(makeLibrary('libFpDev', { sideEffects: false }), 'development', { main, format: 'cjs', platform: 'node' }));
		const prod = evaluate(await bundleOf(makeLibrary('libFpProd', { sideEffects: false }), 'production', { main, format: 'cjs', platform: 'node' }));

		expect(dev.keys).toContain(KEYS_MARKER);
		expect(prod.keys).toStrictEqual([]);
		expect(typeof dev.fingerprint).toBe('string');
		expect(prod.fingerprint).toBe(dev.fingerprint);
	}, 60_000);

	// Without the flag the bundler must keep the schemas module for its top-level side effect: this is the reason the
	// library packages carry `sideEffects` and the guard that makes the test above meaningful.
	it('would keep the schemas in a production build if the library did not declare sideEffects', async () => {
		const lib = makeLibrary('libUnflagged', {});

		const code = await bundleOf(lib, 'production');

		expect(code).toContain(MARKER);
	}, 60_000);

	it('keeps the schemas in a development build, so the prop check has something to validate against', async () => {
		const lib = makeLibrary('libDev', { sideEffects: false });

		const code = await bundleOf(lib, 'development');

		expect(code).toContain(MARKER);
		expect(code).toMatch(KEYS_LIST);
	}, 60_000);
});
