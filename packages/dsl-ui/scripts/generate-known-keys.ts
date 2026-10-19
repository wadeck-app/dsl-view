/**
 * generate-known-keys.ts
 *
 * Writes src/known-keys.json: the DSL keys each built-in component reads (knownKeys) and where its child
 * nodes live (allowedChildren), derived with the SAME discovery as the generated registry. Shipped so a CLI
 * with no React and no generated entries can validate author views:
 *
 *   import manifest from '@wadeck-app/dsl-ui/known-keys.json' with { type: 'json' };
 *   import { findUnknownKeys } from '@wadeck-app/dsl-renderer/build/unknownKeys';
 *   findUnknownKeys(parsedYamlDoc, manifest, { skipType: (t) => t.includes(':') });
 *
 * Run via: npm run generate-known-keys (needs @wadeck-app/dsl-renderer built: `npm run build` at the repo root).
 * A test fails when the committed file is stale.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Workspace build, not node_modules/@wadeck-app/dsl-renderer: that one is the previously PUBLISHED version, which
// lacks generateKnownKeysManifest until the renderer change itself is published.
import { generateKnownKeysManifest } from '../../dsl-renderer/dist/build/entriesGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.resolve(__dirname, '../src/components');
const outFile = path.resolve(__dirname, '../src/known-keys.json');

const manifest = generateKnownKeysManifest([componentsDir]);
writeFileSync(outFile, JSON.stringify(manifest, null, '\t') + '\n', 'utf-8');
console.log(`✓ ${Object.keys(manifest).length} components -> ${path.relative(process.cwd(), outFile)}`);
