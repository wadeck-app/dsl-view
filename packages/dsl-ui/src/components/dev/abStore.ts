import type { AbTest as AbDockTest } from './abTypes.js';

// The tests that `<AbTest>` nodes register with the one dock the host mounts (see AbExperiments).
// Two nodes may declare the SAME test (same id) in two places, e.g. in a repeated widget: they share one dock row and
// one choice. Two DIFFERENT tests under one id cannot share a row: the second is refused and reported.

interface Registration {
	test: AbDockTest;
	// What makes two declarations "the same test": label, initial and the option ids and labels.
	signature: string;
	owners: Set<symbol>;
}

export interface AbStore {
	subscribe: (listener: () => void) => () => void;
	getSnapshot: () => readonly AbDockTest[];
	/** Registers or refreshes the test for `owner`. Returns false (after reporting it) when another test already uses the id. */
	set: (owner: symbol, test: AbDockTest, signature: string) => boolean;
	remove: (owner: symbol, id: string) => void;
}

export function createAbStore(): AbStore {
	const registrations = new Map<string, Registration>();
	const listeners = new Set<() => void>();
	let snapshot: readonly AbDockTest[] = [];

	const publish = (): void => {
		snapshot = [...registrations.values()].map((r) => r.test);
		listeners.forEach((listener) => listener());
	};

	return {
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getSnapshot: () => snapshot,
		set: (owner, test, signature) => {
			const existing = registrations.get(test.id);
			if (existing && existing.signature !== signature && !existing.owners.has(owner)) {
				console.error(
					`[ab] Two different AbTest nodes use the id "${test.id}" ("${existing.test.label}" and "${test.label}"): the second is not shown in the dock. Give each test its own id; only an identical declaration may be repeated.`
				);
				return false;
			}
			if (existing) {
				existing.owners.add(owner);
				existing.test = test;
				existing.signature = signature;
			} else {
				registrations.set(test.id, { test, signature, owners: new Set([owner]) });
			}
			publish();
			return true;
		},
		remove: (owner, id) => {
			const existing = registrations.get(id);
			if (!existing || !existing.owners.delete(owner)) {
				return;
			}
			if (existing.owners.size === 0) {
				registrations.delete(id);
			}
			publish();
		},
	};
}
