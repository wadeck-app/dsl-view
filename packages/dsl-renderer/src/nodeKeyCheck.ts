import type { CompiledDslDiagnostic } from './compiledDslArtifact.js';
import type { ItemKeysSpec } from './dslKeys.js';

// Pure and React-free: the single implementation of "is this authored key one the component reads?", shared by the
// build-time walker (build/unknownKeys.ts) and the dev-time check in DslRenderer, so both say the same thing.

export function editDistance(a: string, b: string): number {
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
export function suggestKey(key: string, knownKeys: string[]): string | undefined {
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

/**
 * The authored (non-`$`) keys of one node against the component's `knownKeys`. An entry without `knownKeys`
 * (hand-written) yields one `unchecked-keys` warning instead of being skipped silently.
 */
export function checkNodeKeys(
	record: Record<string, unknown>,
	type: string,
	nodePath: string,
	entry: { knownKeys?: string[] }
): CompiledDslDiagnostic[] {
	const diagnostics: CompiledDslDiagnostic[] = [];
	const authoredKeys = Object.keys(record).filter(key => !key.startsWith('$'));
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
		diagnostics.push({
			severity: 'warning',
			type,
			nodePath,
			code: 'unchecked-keys',
			message: `[${type}] keys not checked: the registry entry has no knownKeys metadata (generated entries have it)`,
		});
	}
	return diagnostics;
}

/**
 * A prop that is an array of plain objects (e.g. DataTable `columns`): every item key must be one the component reads.
 * A string is an expression bound at runtime (`$sources.x`), which cannot be checked and is left alone on purpose.
 */
export function checkItemKeys(
	value: unknown,
	label: string,
	spec: ItemKeysSpec,
	type: string,
	path: string,
	diagnostics: CompiledDslDiagnostic[]
): void {
	if (value === undefined || typeof value === 'string') {
		return;
	}
	if (!Array.isArray(value)) {
		diagnostics.push({ severity: 'error', type, nodePath: path, code: 'invalid-item-keys', message: `[${type}] "${label}" must be a list of maps` });
		return;
	}
	value.forEach((item, i) => {
		const itemPath = `${path}[${i}]`;
		if (!item || typeof item !== 'object' || Array.isArray(item)) {
			diagnostics.push({ severity: 'error', type, nodePath: itemPath, code: 'invalid-item-keys', message: `[${type}] "${label}[${i}]" must be a map` });
			return;
		}
		const record = item as Record<string, unknown>;
		const itemType = record['type'];
		const effective = typeof itemType === 'string' ? spec.byType?.[itemType] ?? spec : spec;
		for (const key of Object.keys(record)) {
			if (effective.keys.includes(key)) {
				continue;
			}
			const suggestion = suggestKey(key, effective.keys);
			diagnostics.push({
				severity: 'error',
				type,
				nodePath: itemPath,
				code: 'unknown-key',
				message:
					`[${type}] unknown key "${key}" in "${label}[${i}]" - the renderer ignores it, so it has no effect.` +
					(suggestion ? ` Did you mean "${suggestion}"?` : '') +
					` Known keys: ${[...effective.keys].sort().join(', ')}`,
			});
		}
		for (const [arrayKey, arraySpec] of Object.entries(effective.arrays ?? {})) {
			checkItemKeys(record[arrayKey], `${label}[${i}].${arrayKey}`, arraySpec, type, `${itemPath}.${arrayKey}`, diagnostics);
		}
	});
}
