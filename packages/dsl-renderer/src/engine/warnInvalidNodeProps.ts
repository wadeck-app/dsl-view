import type { ComponentRegistryEntry } from '../ComponentRegistry.js';
import { findInvalidNodeProps } from '../nodePropIssues.js';
import { schemaWarnedProps } from './propWarnings.js';

// Dev-time safety net for the VALUE of an authored prop. A value of the wrong shape (a typo'd enum, a map where a list
// is expected, a string where a number is) is often accepted by the component and silently degrades: the page renders
// something wrong and nothing says why. The generated node schema (registry entry `propSchema`) knows what each prop
// accepts; this checks the RESOLVED value against it and warns once. It never changes rendering. The judgement itself
// lives in nodePropIssues.ts, shared with the build-time check.
//
// - A prop still holding an expression that resolves to nothing (a `$sources` value that has not loaded yet) is not
//   checked: that is a normal state, not a mistake.
// - Only the props the node carries are checked, plus the required ones it lacks.

const warned = new Set<string>();

/** Test hook: forget what was already warned. */
export function resetInvalidPropWarnings(): void {
	warned.clear();
	schemaWarnedProps.clear();
}

/**
 * @param resolve the renderer's expression resolver, passed in to keep this module free of a circular import.
 */
export function warnInvalidNodeProps(
	node: Record<string, unknown>,
	type: string,
	entry: Pick<ComponentRegistryEntry, 'propSchema'>,
	ctx: Record<string, unknown>,
	resolve: (expression: unknown, ctx: Record<string, unknown>) => unknown
): void {
	for (const issue of findInvalidNodeProps(node, type, entry.propSchema, ctx, resolve)) {
		const id = `${issue.where}|${issue.code}|${issue.received}|${issue.expected}`;
		if (warned.has(id)) {
			continue;
		}
		warned.add(id);
		schemaWarnedProps.add(issue.where);
		console.warn(
			issue.present
				? `[DslRenderer] ${issue.where} expects ${issue.expected}${issue.subPath} but received ${issue.received}: check the YAML value, the component may ignore it or render something unexpected.`
				: `[DslRenderer] ${issue.where} is required (${issue.expected}) but the node does not set it: the component may render nothing useful.`
		);
	}
}
