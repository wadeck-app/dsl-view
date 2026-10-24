import type { CompiledDslDiagnostic } from '../compiledDslArtifact.js';
import type { ItemKeysSpec } from '../dslKeys.js';
import { checkItemKeys, checkNodeKeys } from '../nodeKeyCheck.js';

// Dev-time safety net for pages run from raw YAML (the compiler check in build/unknownKeys.ts is the CI one): an
// authored key the component never reads (`children:` under VerticalStack, a typo'd prop) is silent otherwise.
// Same implementation as the compiler (nodeKeyCheck.ts). It only warns: rendering is never changed.

// Runtime has no stable node path, so a warning is keyed by component type + key and shown once per page load.
const warned = new Set<string>();

/** Test hook: forget what was already warned. */
export function resetUnknownKeyWarnings(): void {
	warned.clear();
}

function warnOnce(id: string, message: string): void {
	if (warned.has(id)) {
		return;
	}
	warned.add(id);
	console.warn(`[DslRenderer] ${message}`);
}

// `items: ["Label"]` or `items: "$sources.rows"` (an expression that was never resolved to a list) renders nothing: the empty
// container reads as "no data" instead of "authoring mistake". An absent `items` is legitimate and stays quiet.
export function warnInvalidChildren(nodes: unknown): void {
	if (nodes === undefined || nodes === null) {
		return;
	}
	if (!Array.isArray(nodes)) {
		const shown = typeof nodes === 'string' ? `"${nodes}"` : typeof nodes;
		warnOnce(
			`children-not-a-list|${shown}`,
			`A container's children must be a list of nodes, got ${shown}: nothing is rendered. ` +
				'Write them as a YAML list under items:, or make sure the expression resolves to a list.'
		);
		return;
	}
	for (const child of nodes) {
		if (child === null || typeof child !== 'object' || Array.isArray(child)) {
			const shown = child === null ? 'null' : Array.isArray(child) ? 'a nested list' : typeof child === 'string' ? `"${child}"` : typeof child;
			warnOnce(
				`child-not-a-node|${shown}`,
				`A child entry is ${shown} instead of a node with a $type: it is skipped. Each item under items: must be a mapping such as { $type: Label, ... }.`
			);
		}
	}
}

export function warnUnknownNodeKeys(
	node: Record<string, unknown>,
	type: string,
	entry: { knownKeys?: string[]; itemKeys?: Record<string, ItemKeysSpec> }
): void {
	const diagnostics: CompiledDslDiagnostic[] = checkNodeKeys(node, type, '$', entry);
	for (const [propKey, spec] of Object.entries(entry.itemKeys ?? {})) {
		checkItemKeys(node[propKey], propKey, spec, type, propKey, diagnostics);
	}
	for (const diagnostic of diagnostics) {
		if (diagnostic.code === 'unchecked-keys') {
			// One line per component type, not per node: hand-written entries (app-local components) would flood the console.
			warnOnce(`unchecked|${type}`, diagnostic.message);
			continue;
		}
		// The message already names the key; the first line of it is the dedupe identity.
		warnOnce(`${diagnostic.code}|${type}|${diagnostic.message}`, `${diagnostic.message}${diagnostic.nodePath === '$' ? '' : ` (at ${diagnostic.nodePath})`}`);
	}
}
