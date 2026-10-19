import type { z } from 'zod';

import type { CompiledDslDiagnostic } from '../compiledDslArtifact.js';
import { EXTENSION_SLOT_TYPE, KNOWN_ACTION_KEYS, KNOWN_DSL_KEYS, omitNavKeys } from '../dslKeys.js';
import type { ItemKeysSpec, MapSlotSpec } from '../dslKeys.js';

// Isomorphic and React-free on purpose: a CLI can validate author views against a JSON manifest of the
// built-in components without loading the renderer or the generated entries.

/** What the walker needs from one component. A `ComponentRegistryEntry` satisfies it structurally. */
export interface DslKeysEntry {
	knownKeys?: string[];
	allowedChildren?: Record<string, string[]>;
	mapSlots?: Record<string, MapSlotSpec>;
	itemKeys?: Record<string, ItemKeysSpec>;
	nodeSchema?: z.ZodSchema;
}

/** Component name -> key metadata. A `ComponentRegistry` is a valid manifest; so is the JSON produced by `buildKnownKeysManifest`. */
export type DslKeysManifest = Record<string, DslKeysEntry>;

/** Serializable subset of a registry (no render functions, no schemas), meant to be shipped as JSON. */
export function buildKnownKeysManifest(
	entries: Array<{ name: string; knownKeys?: string[]; allowedChildren?: Record<string, string[]>; mapSlots?: Record<string, MapSlotSpec>; itemKeys?: Record<string, ItemKeysSpec> }>
): DslKeysManifest {
	const manifest: DslKeysManifest = {};
	for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
		manifest[entry.name] = {
			...(entry.knownKeys ? { knownKeys: [...entry.knownKeys].sort() } : {}),
			...(entry.allowedChildren && Object.keys(entry.allowedChildren).length > 0 ? { allowedChildren: entry.allowedChildren } : {}),
			...(entry.mapSlots && Object.keys(entry.mapSlots).length > 0 ? { mapSlots: entry.mapSlots } : {}),
			...(entry.itemKeys && Object.keys(entry.itemKeys).length > 0 ? { itemKeys: entry.itemKeys } : {}),
		};
	}
	return manifest;
}

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
function walk(node: unknown, manifest: DslKeysManifest, nodePath: string, diagnostics: CompiledDslDiagnostic[], skipType?: (type: string) => boolean): void {
	if (!node || typeof node !== 'object' || Array.isArray(node)) {
		return;
	}
	const record = node as Record<string, unknown>;
	const type = record['$type'] as string | undefined;
	if (!type) {
		return;
	}

	if (type === EXTENSION_SLOT_TYPE || skipType?.(type)) {
		// ExtensionSlot: no lookup, no recursion into `items` - only resolvable at runtime via $sources.
		// skipType: types the manifest cannot describe (e.g. app-local components), left unchecked on purpose.
		return;
	}

	const entry = manifest[type];
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
		// Hand-written entry without knownKeys: say so instead of skipping the check silently.
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
	// allowedChildren is a dead end for this walker (documented limitation).
	for (const slotKey of Object.keys(entry.allowedChildren ?? {})) {
		const slotValue = record[slotKey];
		if (!Array.isArray(slotValue)) {
			continue;
		}
		slotValue.forEach((child, i) => {
			walk(child, manifest, `${nodePath}.${slotKey}[${i}]`, diagnostics, skipType);
		});
	}

	for (const [slotKey, spec] of Object.entries(entry.mapSlots ?? {})) {
		walkMapSlot(record[slotKey], slotKey, spec, type, manifest, nodePath, diagnostics, skipType);
	}

	for (const [propKey, spec] of Object.entries(entry.itemKeys ?? {})) {
		walkItemKeys(record[propKey], propKey, spec, type, `${nodePath}.${propKey}`, diagnostics);
	}
}

// A prop that is an array of plain objects (e.g. DataTable `columns`): every item key must be one the component reads.
// A string is an expression bound at runtime (`$sources.x`), which cannot be checked here and is left alone on purpose.
function walkItemKeys(
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
			walkItemKeys(record[arrayKey], `${label}[${i}].${arrayKey}`, arraySpec, type, `${itemPath}.${arrayKey}`, diagnostics);
		}
	});
}

// A prop that is a map of named entries, each carrying one nested node (e.g. AbTest `variants.<key>.view`).
// Every shape error is reported: an entry that is not an object, an unknown key in it, a missing nested node.
function walkMapSlot(
	value: unknown,
	slotKey: string,
	spec: MapSlotSpec,
	type: string,
	manifest: DslKeysManifest,
	nodePath: string,
	diagnostics: CompiledDslDiagnostic[],
	skipType?: (type: string) => boolean
): void {
	if (value === undefined) {
		return;
	}
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		diagnostics.push({
			severity: 'error',
			type,
			nodePath,
			code: 'invalid-map-slot',
			message: `[${type}] "${slotKey}" must be a map of named entries, each with: ${spec.keys.join(', ')}`,
		});
		return;
	}
	for (const [entryKey, entryValue] of Object.entries(value)) {
		const entryPath = `${nodePath}.${slotKey}.${entryKey}`;
		if (!entryValue || typeof entryValue !== 'object' || Array.isArray(entryValue)) {
			diagnostics.push({
				severity: 'error',
				type,
				nodePath: entryPath,
				code: 'invalid-map-slot',
				message: `[${type}] "${slotKey}.${entryKey}" must be a map with: ${spec.keys.join(', ')}`,
			});
			continue;
		}
		const entry = entryValue as Record<string, unknown>;
		for (const key of Object.keys(entry)) {
			if (!spec.keys.includes(key)) {
				const suggestion = suggestKey(key, spec.keys);
				diagnostics.push({
					severity: 'error',
					type,
					nodePath: entryPath,
					code: 'unknown-key',
					message:
						`[${type}] unknown key "${key}" in "${slotKey}.${entryKey}" - the renderer ignores it, so it has no effect.` +
						(suggestion ? ` Did you mean "${suggestion}"?` : '') +
						` Known keys: ${[...spec.keys].sort().join(', ')}`,
				});
			}
		}
		if (entry[spec.nodeKey] === undefined) {
			diagnostics.push({
				severity: 'error',
				type,
				nodePath: entryPath,
				code: 'invalid-map-slot',
				message: `[${type}] "${slotKey}.${entryKey}" has no "${spec.nodeKey}": nothing to render for this entry`,
			});
			continue;
		}
		walk(entry[spec.nodeKey], manifest, `${entryPath}.${spec.nodeKey}`, diagnostics, skipType);
	}
}

/**
 * Static check of one parsed DSL page against a manifest (a registry or the shipped known-keys JSON).
 * Page-level keys ($sources, $actions, $route, $vars, $brains, $nav*) are stripped first, like the runtime does.
 * Types not in the manifest are reported as `unknown-component-type`; pass `skipType` (e.g. `(t) => t.includes(':')`
 * for `<moduleId>:<Name>` dsl-lib components) to leave types the manifest cannot describe unchecked.
 */
function findUnknownActionKeys($actions: unknown, diagnostics: CompiledDslDiagnostic[]): void {
	if ($actions == null || typeof $actions !== 'object') return;
	const known: string[] = [...KNOWN_ACTION_KEYS];
	for (const [name, spec] of Object.entries($actions as Record<string, unknown>)) {
		// String form is just the url shorthand.
		if (spec == null || typeof spec !== 'object') continue;
		for (const key of Object.keys(spec)) {
			if (known.includes(key)) continue;
			const suggestion = suggestKey(key, known);
			diagnostics.push({
				severity: 'error',
				type: '$actions',
				nodePath: `$actions.${name}`,
				code: 'unknown-action-key',
				message: `[$actions.${name}] unknown action key "${key}"${suggestion ? `. Did you mean "${suggestion}"?` : ''} Known keys: ${known.join(', ')}`,
			});
		}
	}
}

export function findUnknownKeys(
	doc: Record<string, unknown>,
	manifest: DslKeysManifest,
	options?: { skipType?: (type: string) => boolean }
): CompiledDslDiagnostic[] {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { $sources, $actions, $route, $vars, $brains, ...pageNode } = doc;
	const diagnostics: CompiledDslDiagnostic[] = [];
	findUnknownActionKeys($actions, diagnostics);
	walk(omitNavKeys(pageNode), manifest, '$', diagnostics, options?.skipType);
	return diagnostics;
}
