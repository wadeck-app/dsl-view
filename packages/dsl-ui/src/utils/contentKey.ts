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
