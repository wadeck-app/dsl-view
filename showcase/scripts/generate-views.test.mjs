// Fails when a committed generated view differs from what the generator produces now (stale view, or samples.json changed
// without regenerating). Run: node --test scripts/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { describeProp, generate, parseInventory, toYaml } from './generate-views.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIEWS = path.resolve(HERE, '../app-module-showcase/src/dsl-views');

test('committed generated views are up to date', async () => {
	const { files } = await generate();
	assert.ok(files.size > 0, 'the generator produced no view');
	for (const [name, content] of files) {
		const file = path.join(VIEWS, name);
		assert.ok(fs.existsSync(file), `${name} is missing: run node scripts/generate-views.mjs`);
		assert.equal(fs.readFileSync(file, 'utf8'), content, `${name} is stale: run node scripts/generate-views.mjs`);
	}
});

test('every inventory component has a frame', async () => {
	const rows = parseInventory(fs.readFileSync(path.resolve(HERE, '../../.claude/docs/inventory.md'), 'utf8'));
	const { files } = await generate();
	const all = [...files.values()].join('\n');
	for (const row of rows) {
		assert.ok(all.includes(`label: ${JSON.stringify(row.name)}`), `${row.name} has no frame in the generated views`);
	}
});

test('toYaml writes nested data', () => {
	assert.equal(toYaml({ a: 1, b: { c: 'x' }, d: [{ e: true }] }), 'a: 1\nb:\n  c: "x"\nd:\n  - e: true');
});

test('describeProp reads enum, boolean and optional wrappers from a node schema', async () => {
	const schemas = await import(`file:///${path.resolve(HERE, '../../packages/dsl-ui/dist/schemas/generated-node-schemas.js').replaceAll(path.sep, '/')}`);
	const shape = schemas.BadgeNodeSchema.shape;
	assert.deepEqual(describeProp(shape.variant), { kind: 'enum', values: ['default', 'primary', 'success', 'warning', 'danger', 'info'], optional: true });
	assert.deepEqual(describeProp(shape.external), { kind: 'boolean', optional: true });
	assert.deepEqual(describeProp(shape.label), { kind: 'string', optional: false });
});
