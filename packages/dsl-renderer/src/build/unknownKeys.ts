import type { z } from 'zod';

import type { CompiledDslDiagnostic } from '../compiledDslArtifact.js';
import { EXTENSION_SLOT_TYPE, KNOWN_ACTION_KEYS, KNOWN_DSL_KEYS, omitNavKeys } from '../dslKeys.js';
import type { ItemKeysSpec, MapSlotSpec } from '../dslKeys.js';
import { checkItemKeys, checkNodeKeys, suggestKey } from '../nodeKeyCheck.js';

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

	diagnostics.push(...checkNodeKeys(record, type, nodePath, entry));

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
		checkItemKeys(record[propKey], propKey, spec, type, `${nodePath}.${propKey}`, diagnostics);
	}
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
