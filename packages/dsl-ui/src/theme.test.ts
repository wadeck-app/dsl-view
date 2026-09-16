import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';

// Contract test on the stylesheet text. jsdom loads no stylesheet and never
// processes Tailwind, so a getComputedStyle assertion would resolve against an
// empty cascade and pass no matter what this file contains.
const THEME_PATH = path.resolve(__dirname, 'theme.css');
const css = fs.readFileSync(THEME_PATH, 'utf8');

/** Declarations inside the first rule whose selector list matches. */
function ruleBody(selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const match = new RegExp(`${escaped}[^{]*\\{([^}]*)\\}`).exec(css);
	if (!match) throw new Error(`No rule matching "${selector}" in ${THEME_PATH}`);
	return match[1]!.replace(/\/\*[\s\S]*?\*\//g, '');
}

function tokensIn(body: string): Set<string> {
	return new Set([...body.matchAll(/(--color-[\w-]+)\s*:/g)].map(m => m[1]!));
}

/** Comments stripped, so prose about CSS is never mistaken for CSS. */
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');

const lightBody = ruleBody(':root');
const darkBody = ruleBody('.dark');

describe('theme.css', () => {
	it('declares color-scheme per theme so the UA paints matching scrollbars', () => {
		expect(lightBody).toMatch(/color-scheme:\s*light\s*;/);
		expect(darkBody).toMatch(/color-scheme:\s*dark\s*;/);
	});

	// Consumers switch dark mode either way; dropping one silently un-themes an app.
	it('matches both dark-mode selectors', () => {
		expect(css).toMatch(/\.dark\s*,\s*\[data-theme='dark'\]/);
	});

	// The bug this pins: --color-warning existed in :root but not in dark, so it
	// silently fell back to the light value on a dark background.
	it('defines every light token in dark mode too', () => {
		const missing = [...tokensIn(lightBody)].filter(t => !tokensIn(darkBody).has(t));
		expect(missing).toEqual([]);
	});

	it('defines no dark token that light is missing', () => {
		const extra = [...tokensIn(darkBody)].filter(t => !tokensIn(lightBody).has(t));
		expect(extra).toEqual([]);
	});

	// A design system has to own the page background, not just the raised surface,
	// or each app invents its own and they drift.
	it('defines a page background token', () => {
		expect(tokensIn(lightBody)).toContain('--color-bg');
	});

	// Importing this file must not inject Tailwind's layers a second time.
	it('carries tokens only, no @tailwind directives', () => {
		expect(declarations).not.toMatch(/@tailwind/);
	});

	it('gives every token a resolved value, never a var() indirection', () => {
		for (const body of [lightBody, darkBody]) {
			expect(body).not.toMatch(/--color-[\w-]+\s*:\s*var\(/);
		}
	});
});
