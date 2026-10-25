import type { z } from 'zod';

import type { CompiledDslDiagnostic } from '../compiledDslArtifact.js';
import { EXTENSION_SLOT_TYPE, KNOWN_ACTION_KEYS, KNOWN_DSL_KEYS, omitNavKeys } from '../dslKeys.js';
import type { ItemKeysSpec, MapSlotSpec } from '../dslKeys.js';
import { checkItemKeys, checkNodeKeys, suggestKey } from '../nodeKeyCheck.js';
import { findInvalidNodeProps } from '../nodePropIssues.js';

// Isomorphic and React-free on purpose: a CLI can validate author views against a JSON manifest of the
// built-in components without loading the renderer or the generated entries.

/** What the walker needs from one component. A `ComponentRegistryEntry` satisfies it structurally. */
export interface DslKeysEntry {
	knownKeys?: string[];
	allowedChildren?: Record<string, string[]>;
	mapSlots?: Record<string, MapSlotSpec>;
	itemKeys?: Record<string, ItemKeysSpec>;
	nodeSchema?: z.ZodSchema;
	/** The generated schema of the component's props (a registry entry carries it outside production). A JSON manifest has none. */
	propSchema?: z.ZodSchema;
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
function describeValue(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'a list';
	return typeof value;
}

// `parent` names the component whose slot holds `node`; it is the diagnostic's type when `node` has none of its own.
// Neither case renders anything at runtime (renderChildren drops non-maps, DslRenderer renders nothing without a
// `$type`), so both are errors here: a silently blank node is the failure this check exists to prevent.
function walk(node: unknown, manifest: DslKeysManifest, nodePath: string, diagnostics: CompiledDslDiagnostic[], skipType?: (type: string) => boolean, parent = '(document)'): void {
	if (!node || typeof node !== 'object' || Array.isArray(node)) {
		diagnostics.push({
			severity: 'error',
			type: parent,
			nodePath,
			code: 'invalid-node',
			message: `[${parent}] ${nodePath} must be a DSL node (a map with a $type), got ${describeValue(node)}: it renders nothing`,
		});
		return;
	}
	const record = node as Record<string, unknown>;
	const type = record['$type'];
	if (typeof type !== 'string' || !type) {
		diagnostics.push({
			severity: 'error',
			type: parent,
			nodePath,
			code: 'missing-type',
			message: `[${parent}] ${nodePath} has no $type (got ${type === undefined ? 'nothing' : describeValue(type)}): it renders nothing`,
		});
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

	diagnostics.push(...checkPropValues(record, type, nodePath, entry));

	// Recursion is only possible via allowedChildren - the sole metadata that says
	// where child DSL nodes live in this component's props. A component with no
	// allowedChildren is a dead end for this walker (documented limitation).
	for (const slotKey of Object.keys(entry.allowedChildren ?? {})) {
		const slotValue = record[slotKey];
		// Absent: nothing to render. A string is an expression bound at runtime (`items: $sources.x`), unknowable here.
		if (slotValue === undefined || typeof slotValue === 'string') {
			continue;
		}
		if (!Array.isArray(slotValue)) {
			diagnostics.push({
				severity: 'error',
				type,
				nodePath,
				code: 'invalid-slot',
				message: `[${type}] "${slotKey}" must be a list of nodes (or an expression string), got ${describeValue(slotValue)}: it renders nothing`,
			});
			continue;
		}
		slotValue.forEach((child, i) => {
			walk(child, manifest, `${nodePath}.${slotKey}[${i}]`, diagnostics, skipType, type);
		});
	}

	for (const [slotKey, spec] of Object.entries(entry.mapSlots ?? {})) {
		walkMapSlot(record[slotKey], slotKey, spec, type, manifest, nodePath, diagnostics, skipType);
	}

	for (const [propKey, spec] of Object.entries(entry.itemKeys ?? {})) {
		checkItemKeys(record[propKey], propKey, spec, type, `${nodePath}.${propKey}`, diagnostics);
	}
}

// The literal values the component's generated schema rejects: a typo'd enum, a map where a list is expected. These
// render something wrong with no error today, so a clear mismatch is an error. An `$expression` is never judged (the
// resolver below knows nothing), and a node that may get props from `$extends` / `$source` is not blamed for the ones
// it does not set (those only exist at runtime), so a missing required prop is only a warning.
function checkPropValues(record: Record<string, unknown>, type: string, nodePath: string, entry: DslKeysEntry): CompiledDslDiagnostic[] {
	if (!entry.propSchema) {
		return [];
	}
	const mayInherit = record['$extends'] !== undefined || record['$source'] !== undefined;
	const diagnostics: CompiledDslDiagnostic[] = [];
	for (const issue of findInvalidNodeProps(record, type, entry.propSchema, {}, () => undefined)) {
		if (issue.present) {
			diagnostics.push({
				severity: 'error',
				type,
				nodePath,
				code: 'invalid-prop-value',
				message: `[${type}] "${issue.key}" expects ${issue.expected}${issue.subPath} but the YAML has ${issue.received}: the component ignores it or renders something unexpected`,
			});
		} else if (!mayInherit) {
			diagnostics.push({
				severity: 'warning',
				type,
				nodePath,
				code: 'missing-required-prop',
				message: `[${type}] "${issue.key}" is required (${issue.expected}) but the node does not set it: the component may render nothing useful`,
			});
		}
	}
	return diagnostics;
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
		walk(entry[spec.nodeKey], manifest, `${entryPath}.${spec.nodeKey}`, diagnostics, skipType, type);
	}
}

function findUnknownActionKeys($actions: unknown, diagnostics: CompiledDslDiagnostic[]): void {
	// `$actions:` with nothing under it parses to null: no actions, nothing to check.
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
				message:
					`[$actions.${name}] unknown action key "${key}" - it has no effect.` +
					(suggestion ? ` Did you mean "${suggestion}"?` : '') +
					` Known keys: ${known.join(', ')}`,
			});
		}
	}
}

// Generated entries drop their key lists in a production build (`knownKeys = []`, see entriesGenerator). Walking such a
// registry would report every authored key as unknown, or, worse, none: refuse, and say how to get the real lists.
// Heuristic on purpose (the entries can be bundled, so no identity marker survives): production AND at least two entries
// with a key list AND all of them empty. A shipped JSON manifest carries real lists, so it never matches.
function assertKeysNotStripped(manifest: DslKeysManifest): void {
	if (typeof process === 'undefined' || process.env['NODE_ENV'] !== 'production') {
		return;
	}
	const lists = Object.values(manifest).flatMap((entry) => (entry.knownKeys === undefined ? [] : [entry.knownKeys]));
	if (lists.length >= 2 && lists.every((list) => list.length === 0)) {
		throw new Error(
			'[findUnknownKeys] The component registry was loaded with NODE_ENV=production, which strips the known-keys lists ' +
				'from generated entries, so no authored key can be checked. Run the check with NODE_ENV=development, ' +
				'or pass the known-keys.json manifest instead of the registry.'
		);
	}
}

/**
 * Static check of one parsed DSL page against a manifest (a registry or the shipped known-keys JSON).
 * Page-level keys ($sources, $actions, $route, $vars, $brains, $nav*) are stripped first, like the runtime does.
 * Types not in the manifest are reported as `unknown-component-type`; pass `skipType` (e.g. `(t) => t.includes(':')`
 * for `<moduleId>:<Name>` dsl-lib components) to leave types the manifest cannot describe unchecked.
 * A document that is not a map (an empty file parses to nothing) is reported as `invalid-node`, not thrown on.
 */
export function findUnknownKeys(
	doc: Record<string, unknown>,
	manifest: DslKeysManifest,
	options?: { skipType?: (type: string) => boolean }
): CompiledDslDiagnostic[] {
	assertKeysNotStripped(manifest);
	const diagnostics: CompiledDslDiagnostic[] = [];
	if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
		diagnostics.push({
			severity: 'error',
			type: '(document)',
			nodePath: '$',
			code: 'invalid-node',
			message: `The page must be a YAML map with a $type, got ${describeValue(doc)}${doc === undefined || doc === null ? ' (an empty file?)' : ''}`,
		});
		return diagnostics;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { $sources, $actions, $route, $vars, $brains, ...pageNode } = doc;
	findUnknownActionKeys($actions, diagnostics);
	walk(omitNavKeys(pageNode), manifest, '$', diagnostics, options?.skipType);
	return diagnostics;
}
