import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readDslConfig } from './dslConfig.js';

describe('readDslConfig', () => {
	let appRoot: string;
	const write = (text: string) => fs.writeFileSync(path.join(appRoot, 'dsl.config.yaml'), text);

	beforeEach(() => {
		appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dsl-config-test-'));
	});

	afterEach(() => {
		fs.rmSync(appRoot, { recursive: true, force: true });
	});

	it('returns an empty config when the file does not exist', () => {
		expect(readDslConfig(appRoot)).toEqual({});
	});

	it('returns an empty config for an empty file or one with only comments', () => {
		write('');
		expect(readDslConfig(appRoot)).toEqual({});
		write('# nothing configured yet\n');
		expect(readDslConfig(appRoot)).toEqual({});
	});

	it('returns the packages and contracts sections as written', () => {
		write('packages:\n  ui: "@wadeck-app/dsl-ui"\ncontracts:\n  - package: my-contracts\n    export: ROUTES\n    adapter: zod\n');
		expect(readDslConfig(appRoot)).toEqual({
			packages: { ui: '@wadeck-app/dsl-ui' },
			contracts: [{ package: 'my-contracts', export: 'ROUTES', adapter: 'zod' }],
		});
	});

	it('fails loudly, with the file path, when the file is not a map', () => {
		const configPath = path.join(appRoot, 'dsl.config.yaml');
		write('- packages\n- contracts\n');
		expect(() => readDslConfig(appRoot)).toThrow(`[dsl.config.yaml] ${configPath} must be a YAML map (packages:, contracts:), got a list`);
		write('just text\n');
		expect(() => readDslConfig(appRoot)).toThrow(`${configPath} must be a YAML map (packages:, contracts:), got string`);
		write('42\n');
		expect(() => readDslConfig(appRoot)).toThrow('got number');
	});

	it('fails loudly, with the file path and the YAML cause, when the file is not valid YAML', () => {
		write('packages: [unclosed\n');
		let caught: unknown;
		try {
			readDslConfig(appRoot);
		} catch (error) {
			caught = error;
		}
		expect((caught as Error).message).toContain(`[dsl.config.yaml] ${path.join(appRoot, 'dsl.config.yaml')}: invalid YAML - `);
		expect((caught as Error).cause).toBeInstanceOf(Error);
	});
});
