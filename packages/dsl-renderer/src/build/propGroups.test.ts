// A component that throws at render because none of its alternative props was given (SearchBar: `urlParam`, or `value` and
// `onChange`) says so in a form the compiler can check: `@requiresOneOf urlParam | value` lists the alternatives an author can
// WRITE (a function prop such as `onChange` cannot come from YAML). A node with none of them is reported before it ships,
// instead of showing the failure box at render.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRegistry } from '../ComponentRegistry.js';
import { compileDslDocument } from './dslCompiler.js';
import { generateKnownKeysManifest } from './entriesGenerator.js';
import { findUnknownKeys, type DslKeysManifest } from './unknownKeys.js';

describe('@requiresOneOf in the generated manifest', () => {
	let dir: string;
	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'requires-one-of-'));
	});
	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it('lists the alternatives, a group being props joined with +', () => {
		fs.writeFileSync(
			path.join(dir, 'Thing.tsx'),
			`
export interface ThingProps { urlParam?: string; value?: string; onChange?: () => void }
/**
 * @registryCategory atomic
 * @registryTags search
 * @requiresOneOf urlParam | value+onChange
 */
export function Thing(props: ThingProps) { return null }
`
		);
		expect(generateKnownKeysManifest([dir])['Thing']?.requiresOneOf).toEqual([['urlParam'], ['value', 'onChange']]);
	});

	it('fails loudly on an alternative that names no prop of the component', () => {
		fs.writeFileSync(
			path.join(dir, 'Thing.tsx'),
			`
export interface ThingProps { urlParam?: string }
/**
 * @registryCategory atomic
 * @registryTags search
 * @requiresOneOf urlParm
 */
export function Thing(props: ThingProps) { return null }
`
		);
		expect(() => generateKnownKeysManifest([dir])).toThrow(/Thing.*requiresOneOf.*"urlParm".*urlParam/s);
	});
});

const manifest: DslKeysManifest = {
	Search: { knownKeys: ['urlParam', 'value', 'placeholder'], requiresOneOf: [['urlParam'], ['value']] },
	Page: { knownKeys: ['items'], allowedChildren: { items: ['atomic'] }, category: 'disposition' },
};

describe('the compiler checks the alternatives', () => {
	it('reports a node with none of them, naming them', () => {
		const diagnostics = findUnknownKeys({ $type: 'Search', placeholder: 'x' }, manifest);
		expect(diagnostics).toEqual([
			expect.objectContaining({ code: 'missing-prop-group', severity: 'error', type: 'Search', message: expect.stringContaining('urlParam or value') }),
		]);
	});

	it('is satisfied by any one alternative', () => {
		expect(findUnknownKeys({ $type: 'Search', urlParam: 'q' }, manifest)).toEqual([]);
		expect(findUnknownKeys({ $type: 'Search', value: '$vars.q' }, manifest)).toEqual([]);
	});

	it('an empty value does not count as given', () => {
		expect(findUnknownKeys({ $type: 'Search', urlParam: '' }, manifest).map(d => d.code)).toEqual(['missing-prop-group']);
	});

	it('placement "warning" downgrades it while a module is migrated', () => {
		const diagnostics = findUnknownKeys({ $type: 'Search' }, manifest, { placement: 'warning' });
		expect(diagnostics.map(d => d.severity)).toEqual(['warning']);
	});

	it('does not blame a node that may inherit its props ($extends, $source)', () => {
		expect(findUnknownKeys({ $type: 'Search', $extends: 'base' }, manifest)).toEqual([]);
	});

	it('is checked inside a slot too', () => {
		const diagnostics = findUnknownKeys({ $type: 'Page', items: [{ $type: 'Search' }] }, { ...manifest, Search: { ...manifest['Search']!, category: 'atomic' } });
		expect(diagnostics.map(d => d.code)).toEqual(['missing-prop-group']);
		expect(diagnostics[0]?.nodePath).toContain('items');
	});

	it('flows through compileDslDocument as an error that fails the page', () => {
		const registry = createRegistry([{ name: 'Search', category: 'atomic', tags: [], knownKeys: ['urlParam', 'value', 'placeholder'], requiresOneOf: [['urlParam'], ['value']], render: () => null }]);
		const artifact = compileDslDocument('$type: Search\nplaceholder: x\n', registry);
		expect(artifact.diagnostics).toEqual([expect.objectContaining({ code: 'missing-prop-group', severity: 'error' })]);
	});
});
