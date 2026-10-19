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

	it('validates the views nested in AbTest variants with only the JSON', async () => {
		if (!fs.existsSync(unknownKeysPath)) {
			throw new Error(`dsl-renderer is not built (${unknownKeysPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { findUnknownKeys } = await import(/* @vite-ignore */ unknownKeysPath);
		const test = (variant: Record<string, unknown>) => ({ $type: 'AbTest', id: 't', label: 'T', initial: 'a', variants: { a: { label: 'A', hint: 'a', ...variant } } });
		expect(findUnknownKeys(test({ view: { $type: 'VerticalStack', items: [] } }), manifest)).toEqual([]);
		expect(findUnknownKeys(test({ view: { $type: 'VerticalStack', children: [] } }), manifest)).toEqual([
			expect.objectContaining({ code: 'unknown-key', type: 'VerticalStack', nodePath: '$.variants.a.view', message: expect.stringContaining('Did you mean "items"?') }),
		]);
		expect(findUnknownKeys(test({ view: { $type: 'VerticalStack' }, hnt: 'x' }), manifest)).toEqual([
			expect.objectContaining({ code: 'unknown-key', type: 'AbTest', nodePath: '$.variants.a', message: expect.stringContaining('Did you mean "hint"?') }),
		]);
	});
});

describe('known-keys.json DataTable columns', () => {
	it('flags an ignored column key (and the `$type: actions` mistake) with only the JSON', async () => {
		if (!fs.existsSync(unknownKeysPath)) {
			throw new Error(`dsl-renderer is not built (${unknownKeysPath} missing): run \`npm run build\` in packages/dsl-renderer first.`);
		}
		const { findUnknownKeys } = await import(/* @vite-ignore */ unknownKeysPath);
		const table = (columns: unknown[]) => ({ $type: 'DataTable', rows: '$sources.rows', columns });
		expect(findUnknownKeys(table([{ field: 'a', label: 'A', width: 8, nowrap: true, badge: { x: 'success' } }, { type: 'actions', items: [{ label: 'Go', action: 'go' }] }]), manifest)).toEqual([]);
		expect(findUnknownKeys(table([{ field: 'a', widht: 8 }]), manifest)).toEqual([
			expect.objectContaining({ code: 'unknown-key', type: 'DataTable', nodePath: '$.columns[0]', message: expect.stringContaining('Did you mean "width"?') }),
		]);
		expect(findUnknownKeys(table([{ $type: 'actions', label: 'Actions', items: [] }]), manifest)).toEqual([
			expect.objectContaining({ code: 'unknown-key', nodePath: '$.columns[0]', message: expect.stringContaining('"$type"') }),
			expect.objectContaining({ code: 'unknown-key', nodePath: '$.columns[0]', message: expect.stringContaining('"items"') }),
		]);
	});
});
