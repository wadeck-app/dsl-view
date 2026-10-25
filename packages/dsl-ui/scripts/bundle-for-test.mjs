// Bundles dsl-ui components the way a consumer app's bundler does and prints the result on stdout.
// Used by src/authoringDiagnostics.productionBundle.test.ts. It is a separate Node process because esbuild cannot run
// inside the jsdom test environment (its TextEncoder/Uint8Array invariant breaks there).
//
// usage: node scripts/bundle-for-test.mjs <production|development> <module path relative to src>...
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const [nodeEnv, ...modules] = process.argv.slice(2);
if (nodeEnv !== 'production' && nodeEnv !== 'development') {
	throw new Error(`bundle-for-test: first argument must be "production" or "development", got ${JSON.stringify(nodeEnv)}`);
}
if (modules.length === 0) {
	throw new Error('bundle-for-test: pass at least one module path relative to src, e.g. components/layout/HorizontalStack.js');
}

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../src');
const entry = `${modules.map((m, i) => `import * as m${i} from ${JSON.stringify(`@dsl-ui/${m}`)};`).join('\n')}
console.log(${modules.map((_, i) => `m${i}`).join(', ')});`;

const result = await build({
	stdin: { contents: entry, resolveDir: src, sourcefile: 'consumer-main.ts', loader: 'ts' },
	bundle: true,
	write: false,
	minify: true,
	format: 'esm',
	platform: 'browser',
	jsx: 'automatic',
	logLevel: 'silent',
	// What the consumer's bundler does: replace the exact expression.
	define: { 'process.env.NODE_ENV': JSON.stringify(nodeEnv) },
	alias: { '@dsl-ui': src, '@dsl-renderer': path.resolve(here, '../../dsl-renderer/src') },
	nodePaths: [path.resolve(here, '../../../node_modules')],
	loader: { '.css': 'empty' },
});
process.stdout.write(result.outputFiles.map((file) => file.text).join('\n'));
