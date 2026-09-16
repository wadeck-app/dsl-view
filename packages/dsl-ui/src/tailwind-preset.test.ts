import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
// @ts-expect-error - plain JS preset, no type declarations
import preset from '../tailwind-preset.js';

const themeCss = fs.readFileSync(path.resolve(__dirname, 'theme.css'), 'utf8')
	.replace(/\/\*[\s\S]*?\*\//g, '');

/** Token names declared by theme.css, without the --color- prefix. */
const declaredTokens = new Set(
	[...themeCss.matchAll(/--color-([\w-]+)\s*:/g)].map(m => m[1]!)
);

const colors: Record<string, string> = preset.theme.extend.colors;

/** Token each colour maps to, e.g. bg-secondary -> bg-secondary. */
function mappedToken(value: string): string | null {
	return /var\(--color-([\w-]+)\)/.exec(value)?.[1] ?? null;
}

describe('tailwind-preset', () => {
	// The drift this pins: theme.css declared --color-warning and --color-bg while
	// the old config mapped neither, so `text-warning` and `bg-bg` silently did not
	// exist and each app added its own mapping.
	it('exposes a class for every token theme.css declares', () => {
		const mapped = new Set(Object.values(colors).map(mappedToken));
		const unmapped = [...declaredTokens].filter(t => !mapped.has(t));
		expect(unmapped).toEqual([]);
	});

	it('maps no class onto a token theme.css does not declare', () => {
		const dangling = Object.entries(colors)
			.map(([name, value]) => [name, mappedToken(value)] as const)
			.filter(([, token]) => token !== null && !declaredTokens.has(token))
			.map(([name, token]) => `${name} -> --color-${token}`);
		expect(dangling).toEqual([]);
	});

	it('routes every colour through a variable rather than a literal', () => {
		const literals = Object.entries(colors)
			.filter(([, value]) => !value.startsWith('var(--color-'))
			.map(([name]) => name);
		expect(literals).toEqual([]);
	});

	// Consumers switch dark mode either way, so the preset must accept both.
	it('accepts both dark-mode selectors', () => {
		const variants: string[] = preset.darkMode.flat(Infinity);
		expect(variants.some(v => v.includes('.dark'))).toBe(true);
		expect(variants.some(v => v.includes('[data-theme="dark"]'))).toBe(true);
	});

	// Without this, a consuming app generates no classes for dsl-ui's own
	// components and every dsl-ui element renders unstyled.
	it('points content at this package so consumers scan dsl-ui components', () => {
		expect(preset.content).toHaveLength(1);
		const glob = preset.content[0] as string;
		expect(path.isAbsolute(glob)).toBe(true);
		expect(fs.existsSync(glob.replace(/[\\/]src[\\/].*$/, '/src'))).toBe(true);
	});
});
