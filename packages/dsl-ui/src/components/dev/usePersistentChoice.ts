import { useEffect, useRef, useState } from 'react';

// Instances of this hook sharing a key (the same test declared in two places) must agree within one tab too: the
// `storage` event only fires in OTHER tabs, so a choice is also announced here.
const sameTabListeners = new Map<string, Set<(value: string) => void>>();

// One value among `options`, kept in localStorage.
// - An unknown stored value (or URL value) is reported, never silently used; `initial` applies.
// - `urlParam` lets a link force the value (`?ab.tab=pill`): it wins over the stored value for this page load and is not
//   stored by itself, only a later choice is.
// - A change made in another tab of the same origin is applied here too (the `storage` event), and so is a change made
//   through another instance of this hook with the same key.
// - `enabled` false (default true): the value is `initial` and nothing is read from or written to the storage or the URL.
//   It is read at mount: switching it on later does not re-read the storage.
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

	const [value, setValue] = useState<T>(() => {
		if (!enabled) {
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
	});

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		const apply = (next: string): void => {
			if ((optionsRef.current as readonly string[]).includes(next)) {
				setValue(next as T);
			}
		};
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
	}, [key, enabled]);

	const choose = (v: T): void => {
		if (!enabled) {
			return;
		}
		localStorage.setItem(key, v);
		setValue(v);
		sameTabListeners.get(key)?.forEach((listener) => listener(v));
	};
	return [value, choose];
}
