import type { ComponentRegistry } from './ComponentRegistry.js';

// Isomorphic (no fs/path/url): this must stay importable from the browser bundle,
// since GenericPageRunner.tsx calls it at runtime to detect a stale compiled artifact.

// FNV-1a, 32-bit. Non-cryptographic - this is a drift signal, not a security hash.
function fnv1a(input: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Structural fingerprint of a registry's shape, for detecting drift between a
 * compiled DSL artifact and the registry it is rendered against.
 *
 * Limitation (best-effort only): this hashes the *declared shape* of each entry
 * (name, category, whether nodeSchema/ctxSchema/knownKeys are present, allowedChildren keys),
 * not their content. Changing what a nodeSchema validates internally - without
 * adding/removing it or changing allowedChildren - will NOT change the fingerprint.
 */
export function computeRegistryFingerprint(registry: ComponentRegistry): string {
	const names = Object.keys(registry).sort();
	const parts = names.map((name) => {
		const entry = registry[name]!;
		const allowedChildrenKeys = Object.keys(entry.allowedChildren ?? {}).sort();
		const mapSlotKeys = Object.keys(entry.mapSlots ?? {}).sort();
		const itemKeysKeys = Object.keys(entry.itemKeys ?? {}).sort();
		return [
			name,
			entry.category,
			entry.nodeSchema ? '1' : '0',
			entry.ctxSchema ? '1' : '0',
			entry.knownKeys ? '1' : '0',
			allowedChildrenKeys.join(','),
			// Appended only when present, so a registry without map slots keeps the fingerprint it had before this field existed.
			...(mapSlotKeys.length > 0 ? [mapSlotKeys.join(',')] : []),
			// Same rule for item keys: appended only when present.
			...(itemKeysKeys.length > 0 ? [`items:${itemKeysKeys.join(',')}`] : []),
		].join('|');
	});
	return fnv1a(parts.join('\n'));
}
