import { useState } from 'react';

// A set of strings kept in localStorage as a JSON array. A stored value that is not a JSON array of strings is
// reported (never silently used) and the set starts empty.
// `enabled` false (default true): the set is empty and nothing is read from or written to the storage. It is read at
// mount, like usePersistentChoice.
export function usePersistentSet(key: string, enabled = true): [ReadonlySet<string>, (id: string) => void] {
	const [set, setSet] = useState<ReadonlySet<string>>(() => {
		if (!enabled) {
			return new Set();
		}
		const stored = localStorage.getItem(key);
		if (stored === null) {
			return new Set();
		}
		try {
			const parsed: unknown = JSON.parse(stored);
			if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
				return new Set(parsed);
			}
		} catch {
			// Falls through to the warning below.
		}
		console.warn(`[ab] Ignoring invalid value in localStorage "${key}" (expected a JSON array of strings): ${stored}`);
		return new Set();
	});
	const toggle = (id: string): void => {
		if (!enabled) {
			return;
		}
		const next = new Set(set);
		if (!next.delete(id)) {
			next.add(id);
		}
		localStorage.setItem(key, JSON.stringify([...next]));
		setSet(next);
	};
	return [set, toggle];
}
