// @vitest-environment node
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

// The dev-time diagnostics of the renderer (unknown directive alert, unknown key / invalid prop value / bad children /
// missing `$ctx.` prefix warnings) are authoring aids. They must cost a production bundle nothing: not their code, not
// their message strings, not what only they import (the prop-schema judgement in nodePropIssues.ts). This bundles the
// renderer the way a consumer app does and looks for a marker string of each check. Each marker also has to be found in
// a development bundle, otherwise the test would pass for the wrong reason (a renamed message).
const here = path.dirname(fileURLToPath(import.meta.url));
const rendererIndex = path.resolve(here, '../index.ts');
const repoNodeModules = path.resolve(here, '../../../../node_modules');

const MARKERS: Record<string, string> = {
	'invalid prop value check (warnInvalidNodeProps)': 'check the YAML value, the component may ignore it',
	'prop schema judgement (nodePropIssues)': 'is required (',
	'unknown key check (warnUnknownKeys)': "A container's children must be a list of nodes",
	'missing $ctx. prefix check (warnCtxPrefix)': 'which does not exist, so it resolves to undefined',
	'unknown directive alert (DslRenderer)': 'unknown DSL directive:',
};

async function bundleOf(nodeEnv: 'production' | 'development'): Promise<string> {
	const result = await build({
		stdin: {
			contents: `import { DslRenderer, renderChildren, resolveExpressionValue } from ${JSON.stringify(rendererIndex)};
console.log(DslRenderer, renderChildren, resolveExpressionValue);`,
			resolveDir: here,
			sourcefile: 'consumer-main.ts',
			loader: 'ts',
		},
		bundle: true,
		write: false,
		minify: true,
		format: 'esm',
		platform: 'browser',
		jsx: 'automatic',
		logLevel: 'silent',
		// What the consumer's bundler does: replace the exact expression.
		define: { 'process.env.NODE_ENV': JSON.stringify(nodeEnv) },
		nodePaths: [repoNodeModules],
	});
	return result.outputFiles.map((file) => file.text).join('\n');
}

describe('production bundle of the renderer', () => {
	it('contains none of the dev-time diagnostics', async () => {
		const code = await bundleOf('production');

		for (const [check, marker] of Object.entries(MARKERS)) {
			expect(code, check).not.toContain(marker);
		}
	}, 60_000);

	it('contains every one of them in a development bundle', async () => {
		const code = await bundleOf('development');

		for (const [check, marker] of Object.entries(MARKERS)) {
			expect(code, check).toContain(marker);
		}
	}, 60_000);
});
