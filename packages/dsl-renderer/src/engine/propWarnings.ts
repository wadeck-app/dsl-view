// Shared by the two dev-time checks that look at the VALUE of a prop: coerceProp (the generated entries, per kind of
// value) and warnInvalidNodeProps (the generated schema, per issue). They can find the same mistake; a prop that one
// of them already reported is not reported a second time by the other.

/** `Component.prop` names the schema check already warned about. */
export const schemaWarnedProps = new Set<string>();

/** Test hook: forget what was already warned. */
export function resetPropWarnings(): void {
	schemaWarnedProps.clear();
}

// typeof reports null and arrays as 'object': name them, the YAML fixes differ.
export function describeReceived(value: unknown): string {
	if (value === null) {
		return 'null';
	}
	if (Array.isArray(value)) {
		return 'a list';
	}
	return typeof value === 'object' ? 'a map' : typeof value;
}
