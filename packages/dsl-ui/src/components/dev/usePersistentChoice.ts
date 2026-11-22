import { useEffect, useRef, useState } from 'react';

import { announceStoredValue, subscribeToStoredValue } from '@dsl-ui/utils/storageSubscription.js';

// Instances of this hook sharing a key (the same test declared in two places) must agree within one tab too: the
// `storage` event only fires in OTHER tabs, so a choice is also announced (see storageSubscription).

// One value among `options`, kept in localStorage.
// - An unknown stored value (or URL value) is reported, never silently used; `initial` applies.
// - `urlParam` lets a link force the value (`?ab.tab=pill`): it wins over the stored value for this page load and is not
//   stored by itself, only a later choice is.
// - A change made in another tab of the same origin is applied here too (the `storage` event), and so is a change made
//   through another instance of this hook with the same key.
// - `enabled` false (default true): the value is `initial` and nothing is read from or written to the storage or the URL.
//   Switching it on later (a host that learns the setting after its first render) reads the storage and the URL at that moment;
//   switching it off again puts `initial` back, without touching the storage.
export function usePersistentChoice<T extends string>(
	key: string,
	options: readonly T[],
	initial: T,
	label: string,
	urlParam?: string,
	enabled = true
): [T, (v: T) => void] {
	const optionsRef = useRef(options);
	optionsRef.current = options;
	const isOption = (v: string): v is T => (options as readonly string[]).includes(v);
	const expected = `expected one of: ${options.join(', ')}.`;

	const read = (on: boolean): T => {
		if (!on) {
			return initial;
		}
		const fromUrl = urlParam ? new URLSearchParams(window.location.search).get(urlParam) : null;
		if (fromUrl !== null) {
			if (isOption(fromUrl)) {
				return fromUrl;
			}
			console.warn(`[ab] Ignoring unknown ${label} "${fromUrl}" in the URL parameter "${urlParam}"; ${expected}`);
		}
		const stored = localStorage.getItem(key);
		if (stored === null) {
			return initial;
		}
		if (isOption(stored)) {
			return stored;
		}
		console.warn(`[ab] Ignoring unknown ${label} "${stored}" in localStorage "${key}"; ${expected}`);
		return initial;
	};

	// The value belongs to the `enabled` it was read for: a change of `enabled` re-reads (derived state, no frame with a stale value).
	const [state, setState] = useState<{ enabled: boolean; value: T }>(() => ({ enabled, value: read(enabled) }));
	let current = state;
	if (state.enabled !== enabled) {
		current = { enabled, value: read(enabled) };
		setState(current);
	}
	const value = current.value;
	const setValue = (next: T): void => setState({ enabled, value: next });

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		const apply = (next: string): void => {
			if ((optionsRef.current as readonly string[]).includes(next)) {
				setValue(next as T);
			}
		};
		return subscribeToStoredValue(key, apply);
	}, [key, enabled]);

	const choose = (v: T): void => {
		if (!enabled) {
			return;
		}
		localStorage.setItem(key, v);
		setValue(v);
		announceStoredValue(key, v);
	};
	return [value, choose];
}
