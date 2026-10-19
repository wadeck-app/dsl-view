// Isomorphic (no fs/path/url): shared by src/build/dslCompiler.ts (Node-only compiler) and
// GenericPageRunner.tsx (browser runtime that consumes a compiled artifact). Keeping this
// split out means the browser bundle never pulls in fs/path transitively.

export const COMPILED_DSL_FORMAT_VERSION = 1;

export interface CompiledDslDiagnostic {
	severity: 'error' | 'warning';
	type: string;
	nodePath: string;
	code: 'unknown-component-type' | 'unknown-directive' | 'node-schema' | 'unknown-key' | 'unchecked-keys' | 'invalid-map-slot' | 'unknown-action-key';
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
