// A prop reaches a component from YAML or from a `$sources` value that may still be loading, so its runtime
// shape is whatever the author or the backend produced, not what the component's TypeScript says. The generated
// entries pass every prop through here so one wrong shape (a map where a string is expected, a missing list)
// degrades to "nothing" with ONE named warning instead of crashing the whole page inside the component.
//
// Valid values are returned untouched: the helper only intervenes for a value of the wrong kind.

export type PropKind = 'string' | 'primitive' | 'array' | 'object' | 'function';

const warned = new Set<string>();

/** Test hook: forget what was already warned. */
export function resetCoercionWarnings(): void {
	warned.clear();
}

// typeof reports null and arrays as 'object': name them, the YAML fixes differ.
function describeReceived(value: unknown): string {
	if (value === null) {
		return 'null';
	}
	if (Array.isArray(value)) {
		return 'a list';
	}
	return typeof value === 'object' ? 'a map' : typeof value;
}

function warnOnce(where: string, expected: string, value: unknown): void {
	const id = `${where}|${expected}|${describeReceived(value)}`;
	if (warned.has(id)) {
		return;
	}
	warned.add(id);
	console.warn(`[${where}] expected ${expected} but received ${describeReceived(value)}; the value is ignored.`);
}

/**
 * Keeps `value` when it has the kind the component declares, otherwise ignores it and says why once.
 *
 * `null` is "no value" (a YAML `key:` with nothing, a source field that is null) unless the prop's type accepts it
 * (`nullable`): it is then treated exactly like `undefined`, so a component written for an absent prop never meets a null.
 *
 * - `string` (props typed plain `string`, read with string methods): a number becomes its text, a boolean, map, list
 *   or function is ignored; a REQUIRED one that is missing becomes `''`.
 * - `primitive` (unions of literals, number and boolean props): maps, lists and functions are ignored; a missing value
 *   passes through (the component's own defaults apply).
 * - `array`: a non-list is ignored; a REQUIRED list that is missing becomes `[]` (a source that has not loaded yet is
 *   a normal state, so that case stays silent); an optional one stays absent.
 * - `object` (a record or an interface of fields): a string, number, boolean, list or function is ignored; a map is
 *   passed as it is (its fields are the component's business).
 * - `function`: anything but a function is ignored (YAML can only produce data, so this is an authoring mistake).
 *
 * @param where `Component.prop`, used in the warning.
 * @param nullable the prop's type accepts `null`, so a received `null` is kept.
 */
export function coerceProp(rawValue: unknown, where: string, kind: PropKind, required: boolean, nullable = false): unknown {
	if (rawValue === null && nullable) {
		return null;
	}
	const value = rawValue === null ? undefined : rawValue;
	switch (kind) {
		case 'string':
			if (typeof value === 'string') {
				return value;
			}
			if (value === undefined || value === null) {
				return required ? '' : value;
			}
			if (typeof value === 'number') {
				return String(value);
			}
			warnOnce(where, 'a string', value);
			return required ? '' : undefined;
		case 'primitive':
			if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
				warnOnce(where, 'a string, number or boolean', value);
				return undefined;
			}
			return value;
		case 'array':
			if (Array.isArray(value)) {
				return value;
			}
			if (value === undefined || value === null) {
				return required ? [] : value;
			}
			warnOnce(where, 'a list', value);
			return required ? [] : undefined;
		case 'object':
			if (value === undefined || value === null || (typeof value === 'object' && !Array.isArray(value))) {
				return value;
			}
			warnOnce(where, 'a map', value);
			return undefined;
		case 'function':
			if (value === undefined || value === null || typeof value === 'function') {
				return value;
			}
			warnOnce(where, 'a function', value);
			return undefined;
	}
}

/**
 * The value of a bound list field (`formData[bind]`): a list of strings. A missing value is an empty list, quietly (a
 * form that has not loaded yet). Anything else that is not a list is ignored with one warning; entries that are not
 * text, numbers or booleans (`[{}]`) are left out the same way, numbers and booleans become their text.
 *
 * @param where `Component.value`, used in the warning.
 */
export function coerceStringList(value: unknown, where: string): string[] {
	if (value === undefined || value === null) {
		return [];
	}
	if (!Array.isArray(value)) {
		warnOnce(where, 'a list', value);
		return [];
	}
	const kept: string[] = [];
	for (const entry of value) {
		if (typeof entry === 'string') {
			kept.push(entry);
		} else if (typeof entry === 'number' || typeof entry === 'boolean') {
			kept.push(String(entry));
		} else {
			warnOnce(where, 'a list of text entries', entry);
		}
	}
	return kept;
}

/**
 * The value of a bound date field (`formData[bind]`): a valid `Date`, or `null` for "no date". Text and timestamps are
 * parsed; empty, missing and null are "no date" quietly; an unparseable value is "no date" with one warning (an
 * invalid Date makes the pickers throw on every render).
 *
 * @param where `Component.value`, used in the warning.
 */
export function coerceDate(value: unknown, where: string): Date | null {
	if (value === undefined || value === null || value === '' || value === false) {
		return null;
	}
	const date = value instanceof Date ? value : typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
	if (date === null || Number.isNaN(date.getTime())) {
		warnOnce(where, 'a date (ISO text or a timestamp)', value);
		return null;
	}
	return date;
}
