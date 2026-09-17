import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import * as publicApi from './index.js';

/**
 * Every component annotated for the registry has to be reachable from the package entry.
 *
 * Checkbox was not. It carried the annotation, so it was meant to be public, but the controls
 * barrel listed only CheckboxGroup - so a consumer needing a plain checkbox could not import
 * one and put a raw input in its place instead. That is the shape of most "the app hand-rolled
 * it" findings: not a preference, a component that could not be reached.
 *
 * A leading underscore marks a deliberately internal building block and is skipped.
 */
const COMPONENTS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'components');

function componentFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			return componentFiles(full);
		}
		const isComponent = entry.name.endsWith('.tsx')
			&& !entry.name.includes('.test.')
			&& !entry.name.includes('.stories.')
			&& !entry.name.startsWith('_');
		return isComponent ? [full] : [];
	});
}

/**
 * Exported component names in a file that carries a registry annotation.
 *
 * Both declaration forms count. Matching only `export function` made this check miss every
 * forwardRef component - including Checkbox, the one missing export that prompted the test,
 * so the generic assertion passed while the defect was still there.
 */
function annotatedExports(file: string): string[] {
	const src = fs.readFileSync(file, 'utf8');
	if (!src.includes('@registryCategory')) {
		return [];
	}
	return [
		...[...src.matchAll(/^export function (\w+)/gm)].map(m => m[1]!),
		...[...src.matchAll(/^export const (\w+)\s*[:=]/gm)].map(m => m[1]!),
	];
}

const annotated = componentFiles(COMPONENTS_DIR).flatMap(f =>
	annotatedExports(f).map(name => ({ name, file: path.relative(COMPONENTS_DIR, f) }))
);

describe('public surface', () => {
	// Guards the guard: a broken directory walk would make the check below vacuous.
	it('found annotated components to check', () => {
		expect(annotated.length).toBeGreaterThan(40);
	});

	it('exports every component annotated for the registry', () => {
		const exported = new Set(Object.keys(publicApi));
		const unreachable = annotated
			.filter(({ name }) => !exported.has(name))
			.map(({ name, file }) => `${name} (${file})`);

		expect(unreachable).toEqual([]);
	});

	// The two that this test was written for, named explicitly so a barrel edit that drops
	// them again fails on a readable assertion rather than a list.
	it.each(['Checkbox', 'Switch', 'Badge', 'Card', 'Tooltip', 'Progress', 'FieldSelect'])(
		'exports %s',
		name => {
			expect(publicApi).toHaveProperty(name);
		}
	);
});
