import { reportAuthoringMistake } from '@dsl-ui/utils/devDiagnostics.js';

// A DSL node can carry any string where a component expects one of a few classes. The typed unions do not stop it at
// runtime and the unknown class silently styles nothing, so say once per value what the allowed values are. The
// render itself is unchanged: the value is still applied as written.
export function warnUnknownChoice(component: string, prop: string, value: unknown, allowed: Readonly<Record<string, unknown>>): void {
	if (value === undefined || value === null || Object.prototype.hasOwnProperty.call(allowed, String(value))) return;
	reportAuthoringMistake(`[${component}] unknown ${prop} "${String(value)}": it is applied as written but no style is known for it. Allowed values: ${Object.keys(allowed).join(', ')}.`);
}
