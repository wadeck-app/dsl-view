import { useEffect, useRef, useState } from 'react';

import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';
import { announceStoredValue, subscribeToStoredValue } from '@dsl-ui/utils/storageSubscription.js';


// One message for every refusal (read, write, remove) of a key, so a storage that refuses is reported once, not per call.
// Without a `window` or a `localStorage` there is nothing to report: this is not a mistake, there is just no storage.
function attempt<T>(key: string, fn: (storage: Storage) => T): T | null {
	try {
		const storage = typeof window === 'undefined' ? undefined : window.localStorage;
		if (!storage) {
			return null;
		}
		return fn(storage);
	} catch (error) {
		reportAuthoringMistake(`[CompactSelect] localStorage "${key}" cannot be used (${String(error)}); the choice is kept in the URL only.`);
		return null;
	}
}

const readStored = (key: string): string | null => attempt(key, storage => storage.getItem(key));
const writeStored = (key: string, value: string): boolean => attempt(key, storage => { storage.setItem(key, value); return true; }) === true;
const removeStored = (key: string): boolean => attempt(key, storage => { storage.removeItem(key); return true; }) === true;

export interface StoredUrlChoiceInput {
	/** The localStorage key; `undefined` switches everything off (nothing is read, written or listened to). */
	storageKey: string | undefined;
	/** Current value of the URL param; `null` when it is absent. */
	urlValue: string | null;
	setUrlValue: (value: string) => void;
	optionValues: readonly string[];
	/** Shown while the param is absent; a stored value equal to it is not written to the URL. */
	defaultValue: string | undefined;
}

/**
 * Keeps the choice of a URL-backed select in localStorage (the raw option value under exactly `storageKey`).
 * - The storage mirrors the URL value: an option is stored, the empty text (the placeholder) removes the entry, any
 *   other text (a hand-edited link) leaves it alone. This covers a user pick, a link and a restore alike.
 * - A stored option is written to the URL while it has no value (history replace), unless it equals `defaultValue`.
 *   The return value is that option, so the select can show it in the render before the URL has caught up.
 * - A stored text that is not an option is reported once and left in place. Nothing is judged while the list is empty
 *   (options often load later).
 * - Another tab storing an option applies it to the URL here as well.
 */
export function useStoredUrlChoice({ storageKey, urlValue, setUrlValue, optionValues, defaultValue }: StoredUrlChoiceInput): string | null {
	const [snapshot, setSnapshot] = useState(() => ({ key: storageKey, value: storageKey === undefined ? null : readStored(storageKey) }));
	let stored = snapshot.value;
	if (snapshot.key !== storageKey) {
		// The key changed: what the new key holds replaces what the old one held.
		stored = storageKey === undefined ? null : readStored(storageKey);
		setSnapshot({ key: storageKey, value: stored });
	}

	// The effects and the storage listener below run later than the render that made them: they read the latest values.
	const latest = useRef({ stored, urlValue, setUrlValue, optionValues });
	latest.current = { stored, urlValue, setUrlValue, optionValues };
	const isOption = (value: string): boolean => value !== '' && optionValues.includes(value);
	const optionsSignature = optionValues.join('\u0000');

	// The empty text is "no choice", never reported.
	if (storageKey !== undefined && stored !== null && stored !== '' && optionValues.length > 0 && !isOption(stored)) {
		reportAuthoringMistake(`[CompactSelect] Ignoring "${stored}" in localStorage "${storageKey}": not one of the option values (${optionValues.join(', ')}). The entry is left in place; picking an option replaces it.`);
	}

	const restoreTarget = storageKey !== undefined && urlValue === null && stored !== null && isOption(stored) && stored !== defaultValue ? stored : null;

	useEffect(() => {
		if (restoreTarget !== null) {
			latest.current.setUrlValue(restoreTarget);
		}
	}, [restoreTarget]);

	// Not keyed on `stored`: a value that just arrived from another tab must not be overwritten by the URL it is about to replace.
	useEffect(() => {
		if (storageKey === undefined || urlValue === null) {
			return;
		}
		const current = latest.current.stored;
		if (urlValue === '') {
			if (current !== null && removeStored(storageKey)) {
				setSnapshot({ key: storageKey, value: null });
			}
			return;
		}
		if (latest.current.optionValues.includes(urlValue) && urlValue !== current && writeStored(storageKey, urlValue)) {
			setSnapshot({ key: storageKey, value: urlValue });
			announceStoredValue(storageKey, urlValue);
		}
	}, [storageKey, urlValue, optionsSignature]);

	useEffect(() => {
		if (storageKey === undefined) {
			return undefined;
		}
		return subscribeToStoredValue(storageKey, next => {
			setSnapshot({ key: storageKey, value: next });
			const { urlValue: url, optionValues: values, setUrlValue: setUrl } = latest.current;
			// While the URL has no value the restore above applies it; a value already in the URL is replaced here.
			if (url !== null && next !== '' && next !== url && values.includes(next)) {
				setUrl(next);
			}
		});
	}, [storageKey]);

	return restoreTarget;
}

