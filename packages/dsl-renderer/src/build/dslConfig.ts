import fs from 'fs';
import path from 'path';
import { load as parseYaml } from 'js-yaml';

export interface ContractDeclaration {
	package: string;
	export: string;
	adapter?: 'zod';
}

/** `dsl.config.yaml` at an app root. Every section is optional. */
export interface DslConfig {
	/** Extra component packages scanned for `@registryCategory` components, besides dsl-ui. */
	packages?: Record<string, string>;
	contracts?: ContractDeclaration[];
}

/**
 * Reads `<appRoot>/dsl.config.yaml`. A missing file (or an empty one) is a valid "no configuration" and yields `{}`;
 * a file that is not a YAML map fails loudly with its path, instead of being read as if it were empty.
 */
export function readDslConfig(appRoot: string): DslConfig {
	const configPath = path.join(appRoot, 'dsl.config.yaml');
	if (!fs.existsSync(configPath)) {
		return {};
	}
	let raw: unknown;
	try {
		raw = parseYaml(fs.readFileSync(configPath, 'utf-8'));
	} catch (error) {
		throw new Error(`[dsl.config.yaml] ${configPath}: invalid YAML - ${error instanceof Error ? error.message : String(error)}`, { cause: error });
	}
	if (raw === null || raw === undefined) {
		return {};
	}
	if (typeof raw !== 'object' || Array.isArray(raw)) {
		throw new Error(`[dsl.config.yaml] ${configPath} must be a YAML map (packages:, contracts:), got ${Array.isArray(raw) ? 'a list' : typeof raw}`);
	}
	return raw as DslConfig;
}
