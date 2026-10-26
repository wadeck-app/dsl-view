import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

// The authoring warnings of the date components are for developers: a production bundle must not carry their text.
// The formatter's own warnings (a value that is not a date, a language the browser does not know) come from run-time
// data and the environment, so they stay in production. Same method as authoringDiagnostics.productionBundle.test.ts.
const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts/bundle-for-test.mjs');

const MODULES = [
	'components/display/DateText.js',
	'components/display/RelativeDate.js',
	'components/table/DataTable.js',
	'dates/DateFormatContext.js',
];

const AUTHORING_MARKERS: Record<string, string> = {
	'DateText value of the wrong type': 'value must be a Date, epoch milliseconds or an ISO 8601 text',
	'RelativeDate deprecated format': 'is ignored: the tooltip is the exact timestamp',
	'DataTable dateStyle without a date format': 'dateStyle has no effect without format',
};

const RUNTIME_MARKERS: Record<string, string> = {
	'value that is not a date': 'showing it as it is. Give a Date, epoch milliseconds or an ISO 8601 text.',
	'auto language the browser does not tell': 'Pick a language in the date settings.',
};

// esbuild cannot run inside the jsdom test environment, so the bundle is made by a separate Node process.
function bundleOf(nodeEnv: 'production' | 'development'): string {
	return execFileSync(process.execPath, [script, nodeEnv, ...MODULES], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

describe('production bundle of the date components', () => {
	it('contains none of the authoring messages', () => {
		const code = bundleOf('production');
		for (const [warning, marker] of Object.entries(AUTHORING_MARKERS)) {
			expect(code, warning).not.toContain(marker);
		}
	}, 120_000);

	it('contains every one of them in a development bundle', () => {
		const code = bundleOf('development');
		for (const [warning, marker] of Object.entries(AUTHORING_MARKERS)) {
			expect(code, warning).toContain(marker);
		}
	}, 120_000);

	it('keeps the formatter warnings, which come from data and the environment, in a production bundle', () => {
		const code = bundleOf('production');
		for (const [warning, marker] of Object.entries(RUNTIME_MARKERS)) {
			expect(code, warning).toContain(marker);
		}
	}, 120_000);
});
