import { useEffect, useRef } from 'react';

import { useAbExperiments } from './AbExperiments.js';
import type { AbTest as AbDockTest } from './abTypes.js';
import { isDev } from './isDev.js';
import { reportOnce } from './reportOnce.js';

// What the dock shows of a test, without the callback: when it changes the row must be refreshed.
function shownKey(test: AbDockTest): string {
	return JSON.stringify([test.id, test.label, test.summary, test.value, test.options]);
}

// What makes two declarations "the same test" for the duplicate-id check (see abStore).
function signatureOf(test: AbDockTest): string {
	return JSON.stringify([test.label, test.options]);
}

/**
 * Shows tests declared in code (`useAbTest`) in the dock of the surrounding `<AbExperiments>`, from any depth of the tree.
 * `<AbExperiments tests>` only takes tests known where it is mounted; this hook is for tests whose `useAbTest` lives in
 * a component below it.
 *
 * ```tsx
 * const tab = useAbTest({ id: 'tab', label: 'Active tab', initial: 'pill', options: { ... } });
 * useRegisterAbTests([tab]);
 * ```
 *
 * - Safe to pass a new array on every render: the dock row is refreshed only when what it shows changes (label, summary,
 *   current value, options), and `onSelect` always calls the latest one.
 * - The rows are removed when the component unmounts or when a test leaves the array.
 * - A test whose id is already used by a different test (another hook call or an `<AbTest>` node) is refused and reported
 *   in the console, never silently dropped. The same declaration repeated shares one row.
 * - Without an `<AbExperiments>` above, nothing can show the dock: reported once in development, the tests still apply
 *   their stored choice through `useAbTest`.
 * - While experiments are off (`enabled` false) nothing is registered.
 */
export function useRegisterAbTests(tests: readonly AbDockTest[]): void {
	const host = useAbExperiments();
	const latest = useRef(tests);
	latest.current = tests;
	const owner = useRef(Symbol('useRegisterAbTests')).current;
	const registeredIds = useRef(new Set<string>());

	const key = JSON.stringify(tests.map(shownKey));
	const registrable = host !== null && host.enabled;

	useEffect(() => {
		if (host === null && isDev()) {
			reportOnce('[ab] useRegisterAbTests has no dock: mount <AbExperiments> once near the root of the app so the tests can be changed.');
		}
	}, [host]);

	useEffect(() => {
		if (!host) {
			return;
		}
		const wanted = new Set<string>();
		if (registrable) {
			for (const test of latest.current) {
				wanted.add(test.id);
				// `onSelect` goes through `latest` so a row registered earlier never calls a stale closure.
				const forward: AbDockTest = {
					...test,
					onSelect: (id) => latest.current.find((t) => t.id === test.id)?.onSelect(id),
				};
				host.store.set(owner, forward, signatureOf(test));
			}
		}
		for (const id of registeredIds.current) {
			if (!wanted.has(id)) {
				host.store.remove(owner, id);
			}
		}
		registeredIds.current = wanted;
	}, [host, registrable, key, owner]);

	useEffect(
		() => () => {
			for (const id of registeredIds.current) {
				host?.store.remove(owner, id);
			}
			registeredIds.current = new Set();
		},
		[host, owner]
	);
}
