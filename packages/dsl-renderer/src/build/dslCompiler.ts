import fs from 'fs';
import path from 'path';
import { load as parseYaml } from 'js-yaml';

import type { ComponentRegistry } from '../ComponentRegistry.js';
import type { CompiledDslArtifact, CompiledDslDiagnostic } from '../compiledDslArtifact.js';
import { COMPILED_DSL_FORMAT_VERSION } from '../compiledDslArtifact.js';
import { EXTENSION_SLOT_TYPE, KNOWN_DSL_KEYS, omitNavKeys } from '../engine/DslRenderer.js';
import { computeRegistryFingerprint } from '../registryHash.js';

export type { CompiledDslArtifact, CompiledDslDiagnostic } from '../compiledDslArtifact.js';
export { COMPILED_DSL_FORMAT_VERSION } from '../compiledDslArtifact.js';

function editDistance(a: string, b: string): number {
	let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		const curr = [i];
		for (let j = 1; j <= b.length; j++) {
			curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
		}
		prev = curr;
	}
	return prev[b.length]!;
}

// `children` is the React prop name but the DSL key is `items`: the most frequent authoring mistake.
function suggestKey(key: string, knownKeys: string[]): string | undefined {
	if (key === 'children' && knownKeys.includes('items')) {
		return 'items';
	}
	let best: string | undefined;
	// Max distance 2, and strictly less than half the key length so short keys don't get random suggestions.
	let bestDistance = Math.min(3, Math.ceil(key.length / 2));
	for (const candidate of knownKeys) {
		const distance = editDistance(key.toLowerCase(), candidate.toLowerCase());
		if (distance < bestDistance) {
			best = candidate;
			bestDistance = distance;
		}
	}
	return best;
}

// Explicitly NOT verified here (documented, not a silent gap):
// - ctxSchema: depends on runtime $sources data, not available at compile time.
// - "$context.expose references missing ctx keys": same reason, ctx keys come from
//   runtime $sources/$vars/$brains data. DslRenderer.tsx keeps checking both at runtime.
function walk(node: unknown, registry: ComponentRegistry, nodePath: string, diagnostics: CompiledDslDiagnostic[]): void {
	if (!node || typeof node !== 'object' || Array.isArray(node)) {
		return;
	}
	const record = node as Record<string, unknown>;
	const type = record['$type'] as string | undefined;
	if (!type) {
		return;
	}

	if (type === EXTENSION_SLOT_TYPE) {
		// No registry lookup, no recursion into `items` - only resolvable at runtime via $sources.
		return;
	}

	const entry = registry[type];
	if (!entry) {
		diagnostics.push({
			severity: 'error',
			type,
			nodePath,
			code: 'unknown-component-type',
			message: `Unknown component type: ${type}`,
		});
		return;
	}

	for (const key of Object.keys(record)) {
		if (key.startsWith('$') && !KNOWN_DSL_KEYS.has(key)) {
			diagnostics.push({
				severity: 'error',
				type,
				nodePath,
				code: 'unknown-directive',
				message: `[${type}] unknown DSL directive: ${key}`,
			});
		}
	}

	const authoredKeys = Object.keys(record).filter((key) => !key.startsWith('$'));
	if (entry.knownKeys) {
		const known = new Set(entry.knownKeys);
		for (const key of authoredKeys) {
			if (known.has(key)) {
				continue;
			}
			const suggestion = suggestKey(key, entry.knownKeys);
			diagnostics.push({
				severity: 'error',
				type,
				nodePath,
				code: 'unknown-key',
				message:
					`[${type}] unknown key "${key}" - the renderer ignores it, so it has no effect.` +
					(suggestion ? ` Did you mean "${suggestion}"?` : '') +
					` Known keys: ${entry.knownKeys.length > 0 ? [...entry.knownKeys].sort().join(', ') : '(none)'}`,
			});
		}
	} else if (authoredKeys.length > 0) {
		// Hand-written registry entry without knownKeys: say so instead of skipping the check silently.
		diagnostics.push({
			severity: 'warning',
			type,
			nodePath,
			code: 'unchecked-keys',
			message: `[${type}] keys not checked: the registry entry has no knownKeys metadata (generated entries have it)`,
		});
	}

	if (entry.nodeSchema) {
		const result = entry.nodeSchema.safeParse(record);
		if (!result.success) {
			for (const issue of result.error.issues) {
				diagnostics.push({
					severity: 'error',
					type,
					nodePath,
					code: 'node-schema',
					message: `[${type}] node schema error: ${issue.path.join('.') || 'root'}: ${issue.message}`,
				});
			}
		}
	}

	// Recursion is only possible via allowedChildren - the sole metadata that says
	// where child DSL nodes live in this component's props. A component with no
	// allowedChildren is a dead end for this walker (documented limitation, not a
	// new contract: see plan "Hors scope").
	for (const slotKey of Object.keys(entry.allowedChildren ?? {})) {
		const slotValue = record[slotKey];
		if (!Array.isArray(slotValue)) {
			continue;
		}
		slotValue.forEach((child, i) => {
			walk(child, registry, `${nodePath}.${slotKey}[${i}]`, diagnostics);
		});
	}
}

export function compileDslDocument(
	yamlText: string,
	registry: ComponentRegistry,
	options?: { sourcePath?: string }
): CompiledDslArtifact {
	const doc = parseYaml(yamlText) as Record<string, unknown>;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { $sources, $actions, $route, $vars, $brains, ...pageNode } = doc;
	const node = omitNavKeys(pageNode);

	const diagnostics: CompiledDslDiagnostic[] = [];
	walk(node, registry, '$', diagnostics);

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
