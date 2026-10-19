// React-free DSL key constants, shared by the runtime renderer and the Node-only build tooling
// (src/build/unknownKeys.ts, src/build/dslCompiler.ts) so a CLI can import them without React.

// Directives the renderer understands on any node. Anything else starting with `$` is an authoring mistake.
export const KNOWN_DSL_KEYS = new Set(['$if', '$source', '$context', '$route', '$extends', '$type', '$id', '$outputs']);

// Built-in directive, not a registry component: it needs resolveExpressionValue + renderChildren
// in the same scope to splice a $sources-backed array of DSL nodes into the tree.
export const EXTENSION_SLOT_TYPE = 'ExtensionSlot';

/**
 * A prop that holds a MAP of named entries, each entry being an object that carries one nested DSL node
 * (e.g. AbTest's `variants: { pill: { label, hint, view: <node> } }`). Lets the build-time walker recurse into
 * `variants.*.view` and reject unknown keys inside each entry, which `allowedChildren` (arrays of nodes) cannot express.
 */
export interface MapSlotSpec {
	/** Keys an entry may carry (the nested node's key included). */
	keys: string[];
	/** Key of the entry that holds the nested DSL node. */
	nodeKey: string;
}

// Page-level `$nav<Name>` keys (e.g. $navLabel) are consumed by routesGenerator, never by the render tree.
export function omitNavKeys(node: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(node).filter(([key]) => !key.startsWith('$nav')));
}
