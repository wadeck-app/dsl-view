import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

// A DSL node can carry any string where a component expects one of a few classes. The typed unions do not stop it at
// runtime and the unknown class silently styles nothing, so say once per value what the allowed values are. The
// render itself is unchanged: the value is still applied as written.
export function warnUnknownChoice(component: string, prop: string, value: unknown, allowed: Readonly<Record<string, unknown>>): void {
	if (value === undefined || value === null || Object.prototype.hasOwnProperty.call(allowed, String(value))) return;
	reportAuthoringMistake(`[${component}] unknown ${prop} "${String(value)}": it is applied as written but no style is known for it. Allowed values: ${Object.keys(allowed).join(', ')}.`);
}

// Looks a class up in a map keyed by a prop. A value the map does not know (a typo, or another component's vocabulary such
// as Badge `variant: neutral`) used to give `undefined`, which a template string prints as the class "undefined" next to
// the missing look. Fall back to the named default entry, and say so once. `null` means "no value" and is silent.
export function classFor<K extends string>(component: string, prop: string, value: unknown, map: Readonly<Record<K, string>>, fallback: NoInfer<K>): string {
	if (value === undefined || value === null) return map[fallback];
	if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(map, value)) return map[value as K];
	reportAuthoringMistake(`[${component}] unknown ${prop} "${String(value)}": using "${fallback}" instead. Allowed values: ${Object.keys(map).join(', ')}.`);
	return map[fallback];
}
