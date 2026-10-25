import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

// Authoring-mistake warnings (an unknown icon, a typo'd size, a malformed column spec) are for developers: a production
// bundle must not carry their message strings, and a production console must not print them. This bundles the
// components that report them the way a consumer app does and looks for a marker string of each message. Each marker
// also has to be found in a development bundle, otherwise the test would pass for the wrong reason (a renamed message).
const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts/bundle-for-test.mjs');

const MODULES = [
	'components/layout/HorizontalStack.js',
	'components/layout/PageContent.js',
	'components/display/Chart.js',
	'components/table/DataTable.js',
	'components/display/iconByName.js',
	'components/display/PageHeader.js',
	'components/navigation/Stepper.js',
	'components/controls/ActionButton.js',
	'components/controls/RefreshButton.js',
	'components/form/timeStep.js',
	'utils/usableOptions.js',
	'components/form/Form.js',
];

const MARKERS: Record<string, string> = {
	'unknown choice (warnUnknownChoice: stacks, SearchBar)': 'no style is known for it',
	'Chart xFormat': 'has no effect with xAxisType',
	'PageContent maxWidth': 'unknown maxWidth',
	'unknown icon (iconByName)': 'Supported icons:',
	'DataTable column spec': 'Supported keys for',
	'PageHeader ignored props': 'does not render',
	'Stepper steps shape': 'to be an array of { label, items }',
	'ActionButton without onAction': 'cannot run action',
	// Not "Nothing to refresh": the button's own tooltip text says that in production too.
	'RefreshButton without a source': 'it provides `$refresh`',
	'TimePicker minuteStep': 'minuteStep must be a whole number',
	'options without a label (usableOptions)': 'have no text label',
};

// Problems that come from the data or the environment at run time keep reporting in production: dropping them would
// hide a failure a user can hit. This is the other half of the policy, so the guard is not "delete every warning".
const RUNTIME_MARKERS: Record<string, string> = {
	'Form onSubmit failure': 'onSubmit failed; the form keeps its values',
};

// esbuild cannot run inside the jsdom test environment, so the bundle is made by a separate Node process.
function bundleOf(nodeEnv: 'production' | 'development'): string {
	return execFileSync(process.execPath, [script, nodeEnv, ...MODULES], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

describe('production bundle of the authoring-mistake warnings', () => {
	it('contains none of the messages', () => {
		const code = bundleOf('production');

		for (const [warning, marker] of Object.entries(MARKERS)) {
			expect(code, warning).not.toContain(marker);
		}
	}, 120_000);

	it('contains every one of them in a development bundle', () => {
		const code = bundleOf('development');

		for (const [warning, marker] of Object.entries(MARKERS)) {
			expect(code, warning).toContain(marker);
		}
	}, 120_000);

	it('keeps the run-time problems in a production bundle', () => {
		const code = bundleOf('production');

		for (const [warning, marker] of Object.entries(RUNTIME_MARKERS)) {
			expect(code, warning).toContain(marker);
		}
	}, 120_000);
});
