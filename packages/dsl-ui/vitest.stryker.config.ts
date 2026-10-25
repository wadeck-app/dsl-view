import { defineConfig } from 'vitest/config';

import baseConfig from './vitest.config.js';

// Stryker runs the tests in a sandbox copy of this package only, and perTest coverage re-runs the covering tests once
// per mutant. So the mutation runs use the unit tests of the pure-logic helpers named in stryker.config.json, not the
// whole jsdom suite: the component tests are slow, and several import sibling packages (`@dsl-renderer` points at
// ../dsl-renderer/src, which does not exist in the sandbox). A mutant that only a component test would catch shows up
// as a survivor here and is judged by hand. The normal suite still runs every test.
// `include` is replaced, not merged (mergeConfig would concatenate it with the base glob).
export default defineConfig({
	...baseConfig,
	test: {
		...baseConfig.test,
		include: [
			'src/utils/templatedPath.test.ts',
			'src/utils/linkTarget.test.ts',
			'src/utils/formatBytes.test.ts',
			'src/utils/computeShownTotal.test.ts',
			'src/utils/columnMapping.test.ts',
			'src/utils/chipColors.test.ts',
			'src/utils/formatDate.test.ts',
			'src/utils/resolveIcon.test.ts',
			'src/utils/resolveIcon.guard.test.ts',
			'src/components/display/chartFormat.test.ts',
			'src/components/display/initials.test.ts',
			'src/components/display/iconByName.test.tsx',
			'src/components/table/persistedFilterCodec.test.ts',
			'src/components/form/timeStep.test.ts',
		],
		// Coverage is measured by Stryker itself.
		coverage: { enabled: false },
	},
});
