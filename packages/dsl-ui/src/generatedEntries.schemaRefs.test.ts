import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as schemas from './schemas/generated-node-schemas.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(here, '../..');
// Workspace build of the renderer (see scripts/generate-known-keys.ts for why not node_modules).
const generatorPath = path.resolve(packagesDir, 'dsl-renderer/dist/build/entriesGenerator.js');

describe('generated entries and the real dsl-ui node schemas', () => {
	// A consumer's bundler warns "<X>NodeSchema is not exported by .../generated-node-schemas.js" at build time for
	// every reference to a schema the module does not export (orchestrator hit it for DeleteButton and RouterProvider).
	it('references only schemas the schemas module exports, and every exported schema of a component is referenced', async () => {
		if (!fs.existsSync(generatorPath)) {
			throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { buildEntriesFile } = await import(/* @vite-ignore */ generatorPath);
		const appRoot = path.join(packagesDir, '__entries-schemarefs-app');
		const content: string = buildEntriesFile(appRoot, [{ pkg: 'dsl-ui', absDir: path.join(packagesDir, 'dsl-ui/src/components') }]);

		const referenced = [...content.matchAll(/\['(\w+NodeSchema)'\]/g)].map((match) => match[1]!);
		const exported = new Set(Object.keys(schemas).filter((name) => name.endsWith('NodeSchema')));

		const dangling = referenced.filter((name) => !exported.has(name));
		expect(dangling, `generated entries reference schemas the module does not export: ${dangling.join(', ')}`).toStrictEqual([]);
		// The check above would pass if the generator referenced nothing: pin that a real, large set is referenced.
		expect(referenced.length).toBeGreaterThan(80);
		expect(new Set(referenced).size).toBe(referenced.length);
		// Components known to have no schema must not be referenced (this list is the regression the bundler warned about).
		for (const name of ['DeleteButtonNodeSchema', 'RouterProviderNodeSchema']) {
			expect(exported.has(name)).toBe(false);
			expect(referenced).not.toContain(name);
		}
	}, 300_000);
});
