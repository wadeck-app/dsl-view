import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The theming rules of dsl-view (docs/theming.md) that no violation rule checks on its own: colours only from tokens, none raw in
// a style or a class. (`dark:` and a literal svg element are checked by dsl-ui/no-dark-variant and react/no-inline-svg too.)
const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCES = [
	'TimeSeriesChart.tsx',
	'TimeBrush.tsx',
	'_TimeSeriesChartView.tsx',
	'_TimeBrushView.tsx',
	'_TimeSeriesLegend.tsx',
	'_TimeSeriesTooltip.tsx',
	'_TimeSeriesBars.tsx',
	'_TimeSeriesInvalid.tsx',
	'_ChartSwatch.tsx',
	'timeSeriesMath.ts',
	'timeSeriesFormat.ts',
	'timeSeriesProps.ts',
	'timeSeriesSync.ts',
	'timeSeriesA11y.ts',
	'useElementWidth.ts',
];

/** Source without comments (a comment may quote what the code must not do). */
function code(file: string): string {
	const text = fs.readFileSync(path.join(here, file), 'utf8');
	if (text.length === 0) {
		throw new Error(`${file} is empty: the list of sources in this test is stale`);
	}
	return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe.each(SOURCES)('%s', file => {
	it('has no dark: variant, no literal svg element, no raw colour', () => {
		const source = code(file);
		expect(source).not.toMatch(/\bdark:/);
		expect(source).not.toMatch(/<svg\b/);
		expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
		expect(source).not.toMatch(/\brgba?\(|\bhsla?\(/);
	});

	it('styles nothing but geometry inline', () => {
		const source = code(file);
		for (const inline of source.matchAll(/style=\{\{([^}]*)\}\}/g)) {
			expect(inline[1], `${file}: inline style ${inline[0]}`).not.toMatch(/color|background|border|shadow|opacity|fill|stroke/i);
		}
	});

	it('does not assemble a Tailwind class at run time (Tailwind scans source text)', () => {
		expect(code(file)).not.toMatch(/className=\{`[^`]*\$\{[^}]*\}[^`]*-\w*`/);
	});
});

describe('the list is complete', () => {
	it('every non-test source of this feature is checked', () => {
		const present = fs.readdirSync(here).filter(name => /^(_?TimeSeries|_?TimeBrush|_ChartSwatch|timeSeries|useElementWidth)/.test(name) && !/\.(test|stories)\./.test(name));
		expect(present.sort()).toStrictEqual([...SOURCES].sort());
	});
});
