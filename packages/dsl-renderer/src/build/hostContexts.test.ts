// A prop value that only works when the host provides something (PageHeader `placement: trail` needs the shell's header slot) says
// so with `@requiresContextWhen HeaderActionsContext placement=trail`. The compiler compares it with the contexts the host declares
// (`providedContexts`); a host that declares none is unknown and is never blamed. It is a warning: without the host feature the
// component still renders, in place, but not as the author meant.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateKnownKeysManifest } from './entriesGenerator.js';
import { findUnknownKeys, type DslKeysManifest } from './unknownKeys.js';

describe('@requiresContextWhen in the generated manifest', () => {
	let dir: string;
	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'requires-context-when-'));
	});
	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const source = (annotation: string) => `
export interface ThingProps { placement?: 'page' | 'trail' }
/**
 * @registryCategory composite
 * @registryTags header
 * ${annotation}
 */
export function Thing(props: ThingProps) { return null }
`;

	it('records the context, the prop and the value', () => {
		fs.writeFileSync(path.join(dir, 'Thing.tsx'), source('@requiresContextWhen HeaderActionsContext placement=trail'));
		expect(generateKnownKeysManifest([dir])['Thing']?.requiresContextWhen).toEqual([{ context: 'HeaderActionsContext', prop: 'placement', value: 'trail' }]);
	});

	it('fails loudly on a prop the component does not declare, or a malformed condition', () => {
		fs.writeFileSync(path.join(dir, 'Thing.tsx'), source('@requiresContextWhen HeaderActionsContext placment=trail'));
		expect(() => generateKnownKeysManifest([dir])).toThrow(/Thing.*requiresContextWhen.*"placment".*placement/s);
		fs.writeFileSync(path.join(dir, 'Thing.tsx'), source('@requiresContextWhen HeaderActionsContext'));
		expect(() => generateKnownKeysManifest([dir])).toThrow(/Thing.*requiresContextWhen.*<Context> prop=value/s);
	});
});

const manifest: DslKeysManifest = {
	Header: { knownKeys: ['placement', 'title'], requiresContextWhen: [{ context: 'HeaderActionsContext', prop: 'placement', value: 'trail' }] },
};

describe('the compiler compares the condition with the host contexts', () => {
	it('warns when the host declares its contexts and the needed one is not among them', () => {
		const diagnostics = findUnknownKeys({ $type: 'Header', placement: 'trail' }, manifest, { providedContexts: ['RouterContext'] });
		expect(diagnostics).toEqual([
			expect.objectContaining({ code: 'missing-host-context', severity: 'warning', type: 'Header', message: expect.stringContaining('HeaderActionsContext') }),
		]);
		expect(diagnostics[0]?.message).toContain('placement: trail');
	});

	it('is quiet when the host provides it', () => {
		expect(findUnknownKeys({ $type: 'Header', placement: 'trail' }, manifest, { providedContexts: ['HeaderActionsContext'] })).toEqual([]);
	});

	it('never blames a host that declares nothing', () => {
		expect(findUnknownKeys({ $type: 'Header', placement: 'trail' }, manifest)).toEqual([]);
	});

	it('only applies when the prop has the value', () => {
		expect(findUnknownKeys({ $type: 'Header', placement: 'page' }, manifest, { providedContexts: [] })).toEqual([]);
		expect(findUnknownKeys({ $type: 'Header' }, manifest, { providedContexts: [] })).toEqual([]);
	});

	it('an expression value is not judged', () => {
		expect(findUnknownKeys({ $type: 'Header', placement: '$vars.placement' }, manifest, { providedContexts: [] })).toEqual([]);
	});
});
