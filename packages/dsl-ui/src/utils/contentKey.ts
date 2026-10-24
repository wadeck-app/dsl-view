/**
 * A string that is equal for two values with the same content, used to tell "the data really changed" from "a new
 * object with the same content" (a poll re-sending the same row, a form re-rendering).
 *
 * Unlike a bare JSON.stringify it never throws: a form can be handed whatever a click handler passed along, and a DOM
 * element or an event (circular through React's fiber) used to crash the whole page. DOM nodes, events and functions
 * carry no form data, so they are left out of the key; a value that still cannot be serialised (a cycle in plain data,
 * a BigInt) gets a key that never equals another one, so the caller treats it as changed instead of failing.
 */
let unserialisableCounter = 0;

function isDomNodeOrEvent(value: object): boolean {
	return (typeof Node !== 'undefined' && value instanceof Node) || (typeof Event !== 'undefined' && value instanceof Event);
}

export function contentKey(value: unknown): string {
	try {
		return JSON.stringify(value ?? null, (_key, entry: unknown) => {
			if (typeof entry === 'function') {
				return undefined;
			}
			if (typeof entry === 'object' && entry !== null && isDomNodeOrEvent(entry)) {
				return undefined;
			}
			return entry;
		});
	} catch {
		unserialisableCounter += 1;
		return `unserialisable:${unserialisableCounter}`;
	}
}

/**
 * The form data of `data`: top-level values that are DOM nodes, events or functions are dropped, because they are not
 * data and would end up in the request body (and crash its serialisation). The same object is returned when nothing
 * had to be dropped, so identity-based effects keep seeing a stable value.
 */
export function plainFormData<T extends Record<string, unknown> | null | undefined>(data: T): T {
	if (data == null || typeof data !== 'object') {
		return data;
	}
	const entries = Object.entries(data);
	const kept = entries.filter(([, value]) => typeof value !== 'function' && !(typeof value === 'object' && value !== null && isDomNodeOrEvent(value)));
	return kept.length === entries.length ? data : (Object.fromEntries(kept) as T);
}
