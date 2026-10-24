// Isomorphic (no fs/path/url): shared by src/build/dslCompiler.ts (Node-only compiler) and
// GenericPageRunner.tsx (browser runtime that consumes a compiled artifact). Keeping this
// split out means the browser bundle never pulls in fs/path transitively.

export const COMPILED_DSL_FORMAT_VERSION = 1;

export interface CompiledDslDiagnostic {
	severity: 'error' | 'warning';
	type: string;
	nodePath: string;
	code:
		| 'unknown-component-type'
		| 'unknown-directive'
		| 'node-schema'
		| 'unknown-key'
		| 'unchecked-keys'
		| 'invalid-map-slot'
		| 'invalid-item-keys'
		| 'unknown-action-key'
		// A literal prop value the component's generated node schema rejects (wrong type, value outside the enum), or a
		// required prop the node does not set. Expressions ($...) are never judged: they only have a value at runtime.
		| 'invalid-prop-value'
		| 'missing-required-prop'
		// The prop value checks could not run: the registry carries no prop schemas (see dslCompiler).
		| 'unchecked-props'
		// A value where a DSL node is expected is not a map, or a node has no `$type`: either renders nothing.
		| 'invalid-node'
		| 'missing-type'
		// A slot (`items`) that is neither a list nor an expression string.
		| 'invalid-slot';
	message: string;
}

export interface CompiledDslArtifact {
	formatVersion: number;
	registryFingerprint: string;
	compiledAt: string;
	sourcePath?: string;
	doc: Record<string, unknown>;
	diagnostics: CompiledDslDiagnostic[];
}
