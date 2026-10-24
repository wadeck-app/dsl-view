import { isDevelopment } from './devMode.js';

// Page state lives in ctx under keys that start with `$` (`$initialLoading`, `$refreshing`, `$actionPending`, ...).
// In YAML, `$name` reads ctx["name"] WITHOUT the `$`, so `loading: $initialLoading` reads ctx["initialLoading"], which
// does not exist, and resolves to undefined with no sign that anything went wrong. The working form is
// `$ctx.$initialLoading`. This is the one mistake a page author makes silently, so it is reported once per name.

const warned = new Set<string>();

/** Test hook: forget what was already warned. */
export function resetCtxPrefixWarnings(): void {
	warned.clear();
}

/**
 * Dev-only. Called when `$<root>` resolved to nothing: warns when ctx has a `$<root>` entry the author most likely
 * meant. Never changes the resolved value.
 */
export function warnMissingCtxPrefix(root: string | undefined, ctx: Record<string, unknown>): void {
	if (!root || !isDevelopment()) {
		return;
	}
	if (Object.prototype.hasOwnProperty.call(ctx, root) || !Object.prototype.hasOwnProperty.call(ctx, `$${root}`)) {
		return;
	}
	if (warned.has(root)) {
		return;
	}
	warned.add(root);
	console.warn(
		`[DslRenderer] "$${root}" reads ctx["${root}"], which does not exist, so it resolves to undefined. ` +
			`The page state "$${root}" is read as "$ctx.$${root}".`
	);
}
