/**
 * Two letters for a name: a single word gives its first two letters ("Queue" -> "QU"); several words give the first
 * letter of the first two ("Audit log" -> "AL"). Words are split on spaces, "-" and "_". "?" for an empty name.
 */
export function initialsOf(title: string): string {
	const words = title.split(/[\s_-]+/).filter(Boolean);
	const [first, second] = words;
	if (first === undefined) {
		return '?';
	}
	const letters = second === undefined ? first.slice(0, 2) : first.charAt(0) + second.charAt(0);
	return letters.toUpperCase();
}

/**
 * A stable entry of `palette` for an id: the same id always gets the same color, across reloads and machines.
 * FNV-1a then the murmur3 finalizer. Measured: `hash * 31 + c`, and FNV-1a alone, both sent about half of the short
 * ids to the same entry of a 9-color palette once reduced modulo its length.
 * Throws on an empty palette rather than returning `undefined`.
 */
export function colorFromId(id: string, palette: readonly string[]): string {
	if (palette.length === 0) {
		throw new Error('colorFromId needs a non-empty palette');
	}
	let hash = 2166136261;
	for (const ch of id) {
		hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
	}
	hash ^= hash >>> 16;
	hash = Math.imul(hash, 0x85ebca6b);
	hash ^= hash >>> 13;
	hash = Math.imul(hash, 0xc2b2ae35);
	hash ^= hash >>> 16;
	return palette[(hash >>> 0) % palette.length] as string;
}
