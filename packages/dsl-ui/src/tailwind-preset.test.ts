import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
// @ts-expect-error - plain JS preset, no type declarations
import preset, { dslUiContent } from '../tailwind-preset.js';

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

	// Tailwind reads `content` from the top-level config only; resolveConfig never
	// looks at a preset's. Declaring it here promised scan paths that were silently
	// discarded, so a consumer got none of dsl-ui's classes and every dsl-ui
	// component rendered unstyled while the build reported success.
	it('declares no content, which Tailwind would ignore anyway', () => {
		expect(preset.content).toBeUndefined();
	});

	it('exports the scan paths separately, for consumers to spread', () => {
		expect(dslUiContent).toHaveLength(1);
		expect(path.isAbsolute(dslUiContent[0]!)).toBe(true);
	});

	// fast-glob reads a backslash as an escape rather than a separator, so a
	// path.join'd Windows path matches nothing.
	it('uses forward slashes, which is all fast-glob accepts as a separator', () => {
		expect(dslUiContent[0]).not.toContain('\\');
	});

	// The point of the glob is that it finds files. An absolute path that resolves
	// nowhere would still satisfy every assertion above.
	it('resolves to this package\'s component files', () => {
		const srcDir = dslUiContent[0]!.replace(/\/\*\*.*$/, '');
		expect(fs.existsSync(srcDir)).toBe(true);
		const tsx = fs.readdirSync(srcDir, { recursive: true })
			.filter(f => String(f).endsWith('.tsx'));
		expect(tsx.length).toBeGreaterThan(50);
	});
});
