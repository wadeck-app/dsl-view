import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config.js';

// Stryker runs the tests in a sandbox copy of this package only. Tests that read the real repository layout (the
// sibling packages next to this one) cannot pass there, and they do not exercise the files mutated by the Stryker
// config, so they are left out of the mutation runs (they still run in the normal suite).
export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			exclude: [...configDefaults.exclude, 'src/build/entriesGenerator.pipeline.test.ts'],
		},
	})
);
