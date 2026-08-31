import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
		],
	},
	test: {
		include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test-setup.ts'],
	},
});
