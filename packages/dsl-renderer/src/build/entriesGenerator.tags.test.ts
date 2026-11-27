// `@registryTags` is a constraint vocabulary (a slot accepts a child by its tags), so what the generator reads from it must be
// exactly the tags written on that line. A description placed under the tag used to be swallowed word by word ("IN", "SCOPE:",
// "and", "use"...), which let a child pass a slot check because its prose happened to contain the slot's tag.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateKnownKeysManifest } from './entriesGenerator.js';

let dir: string;
beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-tags-'));
});
afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

function manifestOf(source: string) {
	fs.writeFileSync(path.join(dir, 'Thing.tsx'), source);
	return generateKnownKeysManifest([dir])['Thing'];
}

describe('@registryTags', () => {
	it('reads the tags written on the line', () => {
		const entry = manifestOf(`
export interface ThingProps { label?: string }
/**
 * @registryCategory atomic
 * @registryTags button action
 */
export function Thing(props: ThingProps) { return null }
`);
		expect(entry?.tags).toEqual(['button', 'action']);
	});

	it('ignores the description written under the tag', () => {
		const entry = manifestOf(`
export interface ThingProps { label?: string }
/**
 * @registryCategory disposition
 * @registryTags layout
 *
 * IN SCOPE: horizontal flex container with gap and a button on the right.
 * OUT OF SCOPE: business-specific layouts.
 */
export function Thing(props: ThingProps) { return null }
`);
		expect(entry?.tags).toEqual(['layout']);
	});

	it('fails loudly on a tag that is not a lowercase kebab-case word, naming the component', () => {
		expect(() =>
			manifestOf(`
export interface ThingProps { label?: string }
/**
 * @registryCategory atomic
 * @registryTags Button, action
 */
export function Thing(props: ThingProps) { return null }
`)
		).toThrow(/Thing.*registryTags.*"Button,"/s);
	});
});
