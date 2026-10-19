import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import manifest from './known-keys.json' with { type: 'json' };

const here = path.dirname(fileURLToPath(import.meta.url));
// Workspace build of the renderer (see scripts/generate-known-keys.ts for why not node_modules).
const generatorPath = path.resolve(here, '../../dsl-renderer/dist/build/entriesGenerator.js');
const unknownKeysPath = path.resolve(here, '../../dsl-renderer/dist/build/unknownKeys.js');

describe('known-keys.json (shipped manifest for CLIs)', () => {
	it('is up to date with the components (run `npm run generate-known-keys` otherwise)', async () => {
		if (!fs.existsSync(generatorPath)) {
			throw new Error(`dsl-renderer is not built (${generatorPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { generateKnownKeysManifest } = await import(/* @vite-ignore */ generatorPath);
		const fresh = generateKnownKeysManifest([path.resolve(here, 'components')]);
		expect(manifest).toEqual(fresh);
		// ts-morph parses every component: ~15s locally, give slower CI machines room.
	}, 120_000);

	it('catches the children-under-VerticalStack mistake with only the JSON (no registry, no React)', async () => {
		if (!fs.existsSync(unknownKeysPath)) {
			throw new Error(`dsl-renderer is not built (${unknownKeysPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { findUnknownKeys } = await import(/* @vite-ignore */ unknownKeysPath);
		const diagnostics = findUnknownKeys({ $type: 'VerticalStack', children: [] }, manifest);
		expect(diagnostics).toEqual([expect.objectContaining({ code: 'unknown-key', message: expect.stringContaining('Did you mean "items"?') })]);
	});
});
