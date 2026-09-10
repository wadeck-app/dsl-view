import type { StorybookConfig } from '@storybook/react-vite';
import fs from 'fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	addons: [getAbsolutePath('@storybook/addon-docs')],
	framework: {
		name: getAbsolutePath('@storybook/react-vite'),
		options: {},
	},
	viteFinal(config) {
		// Replicate the resolve-js-to-tsx plugin from vitest.config.ts
		config.plugins = config.plugins ?? [];
		config.plugins.push({
			name: 'resolve-js-to-tsx',
			enforce: 'pre',
			resolveId(id: string, importer?: string) {
				if (!importer || !id.endsWith('.js')) return;
				const abs = path.resolve(path.dirname(importer), id);
				const tsx = abs.replace(/\.js$/, '.tsx');
				const ts = abs.replace(/\.js$/, '.ts');
				if (fs.existsSync(tsx)) return tsx;
				if (fs.existsSync(ts)) return ts;
			},
		});

		// Path aliases — mirror vitest.config.ts
		config.resolve = config.resolve ?? {};
		config.resolve.alias = [
			...(Array.isArray(config.resolve.alias) ? config.resolve.alias : []),
			{ find: '@dsl-ui', replacement: path.resolve(__dirname, '../src') },
			{ find: '@dsl-renderer', replacement: path.resolve(__dirname, '../../dsl-renderer/src') },
		];

		return config;
	},
};

export default config;

function getAbsolutePath(value: string): any {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
