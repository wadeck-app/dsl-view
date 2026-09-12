import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [
		{
			name: 'resolve-js-to-tsx',
			enforce: 'pre',
			resolveId(id, importer) {
				if (!importer || !id.endsWith('.js')) return;
				const abs = path.resolve(path.dirname(importer), id);
				const tsx = abs.replace(/\.js$/, '.tsx');
				const ts = abs.replace(/\.js$/, '.ts');
				if (fs.existsSync(tsx)) return tsx;
				if (fs.existsSync(ts)) return ts;
			},
		},
	],
	resolve: {
		alias: [
			{ find: '@dsl-ui', replacement: path.resolve(__dirname, './src') },
			{ find: '@dsl-renderer', replacement: path.resolve(__dirname, '../dsl-renderer/src') },
			// Stub @floating-ui/react-dom with a synchronous implementation for tests.
			// The real useFloating calls computePosition() (async) then ReactDOM.flushSync(setState),
			// causing React 18's act() to wait for cascading re-renders (~3-9s per test in JSDOM).
			{
				find: '@floating-ui/react-dom',
				replacement: path.resolve(__dirname, './src/__mocks__/@floating-ui/react-dom.ts'),
			},
			// Stub @radix-ui/react-popper with simple pass-through components for tests.
			// The real Popper uses useFloating (async position computation) and multiple
			// useLayoutEffect hooks that set state and call getComputedStyle, cascading
			// React re-renders that add ~1-9s per test in JSDOM.
			{
				find: '@radix-ui/react-popper',
				replacement: path.resolve(__dirname, './src/__mocks__/@radix-ui/react-popper.ts'),
			},
		],
	},
	test: {
		include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test-setup.ts'],
		testTimeout: 30000,
		server: {
			deps: {
				// Inline the Radix Popover chain so Vite processes their imports.
				// This makes resolve.alias intercept @floating-ui/react-dom and
				// @radix-ui/react-popper, replacing them with fast synchronous stubs.
				inline: [
					'@radix-ui/react-popover',
					'@radix-ui/react-popper',
				],
			},
		},
	},
});
