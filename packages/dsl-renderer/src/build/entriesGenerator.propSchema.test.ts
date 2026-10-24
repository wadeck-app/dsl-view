import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildEntriesFile, findNodeSchemaModule } from './entriesGenerator.js';

// A library that ships schemas/generated-node-schemas.ts next to its components, and one that does not.
let root: string;
let appRoot: string;

function write(file: string, content: string) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content);
}

const component = (name: string) => `
export interface ${name}Props { label?: string }
/**
 * @registryCategory atomic
 */
export function ${name}(props: ${name}Props) { return null }
`;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'prop-schema-'));
	appRoot = path.join(root, 'app');
	// With schemas: <lib>/package.json, <lib>/src/components/display/Badge.tsx, <lib>/src/schemas/generated-node-schemas.ts
	write(path.join(root, 'withSchemas/package.json'), '{"name":"with-schemas"}');
	write(path.join(root, 'withSchemas/src/components/display/Badge.tsx'), component('Badge'));
	write(path.join(root, 'withSchemas/src/schemas/generated-node-schemas.ts'), 'export const BadgeNodeSchema = null;\n');
	// Without: nothing to find, and the search must not climb into the schemas of the library next door.
	write(path.join(root, 'plain/package.json'), '{"name":"plain"}');
	write(path.join(root, 'plain/src/components/Plain.tsx'), component('Plain'));
	write(path.join(appRoot, 'package.json'), '{"name":"app"}');
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe('findNodeSchemaModule', () => {
	it('finds the schemas module of the library a component belongs to, from any depth', () => {
		const found = findNodeSchemaModule(path.join(root, 'withSchemas/src/components/display/Badge.tsx'));

		expect(found).toBe(path.join(root, 'withSchemas/src/schemas/generated-node-schemas.ts'));
	});

	it('returns null for a library without schemas, and never searches beyond its package.json', () => {
		expect(findNodeSchemaModule(path.join(root, 'plain/src/components/Plain.tsx'))).toBeNull();
	});
});

describe('generated entries and node schemas', () => {
	const generate = (library: string, pkg: string) =>
		buildEntriesFile(appRoot, [{ pkg, absDir: path.join(root, library, 'src/components') }]);

	it('gives a component of a library with schemas a propSchema picked from the schemas module, in development only', () => {
		const out = generate('withSchemas', 'with-schemas');

		expect(out).toMatch(/import \* as nodeSchemas0 from '.*withSchemas\/src\/schemas\/generated-node-schemas\.js'/);
		// The condition must be the exact expression bundlers replace, and the schema a static member access of the namespace
		// (not a helper call receiving the whole namespace): that is what lets a production build drop the schemas module.
		expect(out).toContain("propSchema: process.env.NODE_ENV !== 'production' ? (nodeSchemas0 as Record<string, unknown>)['BadgeNodeSchema'] as ComponentRegistryEntry['propSchema'] : undefined,");
		expect(out).toContain('declare const process: { env: { NODE_ENV?: string } }');
		expect(out).not.toMatch(/pickPropSchema|isDevelopment|typeof process/);
	});

	it('adds no schema import, no propSchema and no unused helper import for a library without schemas', () => {
		const out = generate('plain', 'plain');

		expect(out).not.toContain('nodeSchemas0');
		expect(out).not.toContain('propSchema');
		expect(out).not.toContain('process');
		expect(out).not.toContain('pickPropSchema');
		expect(out).not.toContain('isDevelopment');
	});
});
