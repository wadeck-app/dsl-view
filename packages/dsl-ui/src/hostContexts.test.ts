// HOST_CONTEXTS is the vocabulary a host and a module share to say "this view needs that from the shell". It must name real contexts
// (a typo would silently never match) and cover what the components ask a host for.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import manifest from './known-keys.json' with { type: 'json' };
import { HOST_CONTEXTS } from './hostContexts.js';

const here = path.dirname(fileURLToPath(import.meta.url));

function sourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			return sourceFiles(full);
		}
		return /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

describe('HOST_CONTEXTS', () => {
	it('names contexts that exist in the source', () => {
		const all = sourceFiles(here).map(file => fs.readFileSync(file, 'utf8')).join('\n');
		const missing = HOST_CONTEXTS.filter(name => !new RegExp(`\\b${name}\\s*=\\s*(React\\.)?createContext`).test(all));
		expect(missing, 'HOST_CONTEXTS entries with no createContext in the source').toEqual([]);
	});

	it('is sorted and has no duplicate', () => {
		expect([...HOST_CONTEXTS]).toEqual([...new Set(HOST_CONTEXTS)].sort());
	});

	it('covers every host context a component asks for conditionally', () => {
		const wanted = Object.values(manifest as Record<string, { requiresContextWhen?: Array<{ context: string }> }>).flatMap(entry => (entry.requiresContextWhen ?? []).map(condition => condition.context));
		expect(wanted.length).toBeGreaterThan(0);
		expect(wanted.filter(name => !(HOST_CONTEXTS as readonly string[]).includes(name))).toEqual([]);
	});
});
