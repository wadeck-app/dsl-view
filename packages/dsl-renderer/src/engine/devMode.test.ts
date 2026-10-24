import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { isDevelopment } from './devMode.js';

describe('isDevelopment', () => {
	it.each(['development', 'test', ''])('is true for NODE_ENV=%j', (value) => {
		vi.stubEnv('NODE_ENV', value);

		expect(isDevelopment()).toBe(true);
	});

	it('is false only for a production build', () => {
		vi.stubEnv('NODE_ENV', 'production');

		expect(isDevelopment()).toBe(false);
	});

	// A browser without a bundler replacement has no `process`: the answer must be "not development", not a crash.
	it('fails closed when `process` does not exist', () => {
		vi.stubGlobal('process', undefined);

		expect(isDevelopment()).toBe(false);
	});

	// Regression: the check used to be `typeof process !== 'undefined' && ...`, a guard no bundler replaces, so in a
	// browser under `vite dev` it was always false and every dev diagnostic was silent. The source must read the exact
	// expression bundlers replace.
	it('reads process.env.NODE_ENV directly, without a typeof guard (the form bundlers replace)', () => {
		const source = readFileSync(path.resolve(process.cwd(), 'src/engine/devMode.ts'), 'utf8');
		const code = source
			.split('\n')
			.filter((line) => !line.trim().startsWith('//'))
			.join('\n');

		expect(code).toContain('process.env.NODE_ENV');
		expect(code).not.toContain('typeof process');
	});
});
