import fs from 'fs';
import path from 'path';
import { load as parseYaml } from 'js-yaml';

import type { ComponentRegistry } from '../ComponentRegistry.js';
import type { CompiledDslArtifact, CompiledDslDiagnostic } from '../compiledDslArtifact.js';
import { COMPILED_DSL_FORMAT_VERSION } from '../compiledDslArtifact.js';
import { computeRegistryFingerprint } from '../registryHash.js';
import { findUnknownKeys } from './unknownKeys.js';

export type { CompiledDslArtifact, CompiledDslDiagnostic } from '../compiledDslArtifact.js';
export { COMPILED_DSL_FORMAT_VERSION } from '../compiledDslArtifact.js';

// The generated entries carry `propSchema` only outside production (a production bundle must not ship the schemas), so
// a compile step that runs with NODE_ENV=production on such a registry would silently skip every prop value check.
// Say so, once per document, instead of passing quietly.
function uncheckedPropsWarning(registry: ComponentRegistry): CompiledDslDiagnostic | null {
	const entries = Object.values(registry);
	const isGeneratedRegistry = entries.some((entry) => entry.knownKeys !== undefined);
	if (!isGeneratedRegistry || entries.some((entry) => entry.propSchema !== undefined) || process.env['NODE_ENV'] !== 'production') {
		return null;
	}
	return {
		severity: 'warning',
		type: '(registry)',
		nodePath: '$',
		code: 'unchecked-props',
		message:
			'Prop value checks were skipped: the registry carries no prop schemas because NODE_ENV is "production" ' +
			'(generated entries only include them otherwise). Run the compile step with NODE_ENV=development to check literal prop values.',
	};
}

export function compileDslDocument(
	yamlText: string,
	registry: ComponentRegistry,
	options?: { sourcePath?: string }
): CompiledDslArtifact {
	let doc: Record<string, unknown>;
	try {
		doc = parseYaml(yamlText) as Record<string, unknown>;
	} catch (error) {
		// js-yaml reports a line and column but not which file; name it so a CI log is actionable.
		const where = options?.sourcePath ?? '<inline document>';
		throw new Error(`[dslCompiler] ${where}: invalid YAML - ${error instanceof Error ? error.message : String(error)}`, { cause: error });
	}
	// The unknown-key walk lives in unknownKeys.ts (shared with CLIs that only have a JSON manifest).
	const diagnostics: CompiledDslDiagnostic[] = findUnknownKeys(doc, registry);
	const unchecked = uncheckedPropsWarning(registry);
	if (unchecked) {
		diagnostics.push(unchecked);
	}

	return {
		formatVersion: COMPILED_DSL_FORMAT_VERSION,
		registryFingerprint: computeRegistryFingerprint(registry),
		compiledAt: new Date().toISOString(),
		sourcePath: options?.sourcePath,
		doc,
		diagnostics,
	};
}

export function compileDslPagesDir(
	pagesDir: string,
	registry: ComponentRegistry
): { results: CompiledDslArtifact[]; hasErrors: boolean } {
	const yamlFiles = fs
		.readdirSync(pagesDir)
		.filter((f) => f.endsWith('.yaml'))
		.sort();

	const results: CompiledDslArtifact[] = [];
	let hasErrors = false;

	for (const filename of yamlFiles) {
		const filePath = path.join(pagesDir, filename);
		const yamlText = fs.readFileSync(filePath, 'utf-8');
		const artifact = compileDslDocument(yamlText, registry, { sourcePath: filePath });
		if (artifact.diagnostics.some((d) => d.severity === 'error')) {
			hasErrors = true;
		}
		results.push(artifact);
	}

	return { results, hasErrors };
}
