// Followers of one localStorage key. Shared by usePersistentChoice (dev tool) and CompactSelect (`storageKey`).
//
// The `storage` event only fires in OTHER tabs of the same origin, so a value written by this tab is also announced
// here (`announceStoredValue`): instances sharing a key must agree within one tab too.
const sameTabListeners = new Map<string, Set<(value: string) => void>>();

/**
 * Calls `apply(newValue)` when `key` of localStorage is set to a value, by another tab (the `storage` event) or by
 * `announceStoredValue` in this one. A removal (`newValue === null`) and other keys or storage areas are ignored.
 * Returns the function that stops following. Without a `window` nothing is registered.
 */
export function subscribeToStoredValue(key: string, apply: (value: string) => void): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}
	const onStorage = (e: StorageEvent): void => {
		if (e.storageArea !== localStorage || e.key !== key || e.newValue === null) {
			return;
		}
		apply(e.newValue);
	};
	window.addEventListener('storage', onStorage);
	let listeners = sameTabListeners.get(key);
	if (!listeners) {
		listeners = new Set();
		sameTabListeners.set(key, listeners);
	}
	listeners.add(apply);
	return () => {
		window.removeEventListener('storage', onStorage);
		listeners.delete(apply);
		if (listeners.size === 0) {
			sameTabListeners.delete(key);
		}
	};
}

/** Tells the followers of `key` in this tab that it now holds `value` (the caller has written it). */
export function announceStoredValue(key: string, value: string): void {
	sameTabListeners.get(key)?.forEach((listener) => listener(value));
}
