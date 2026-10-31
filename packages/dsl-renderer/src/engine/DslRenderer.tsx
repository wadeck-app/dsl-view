import React from 'react';

import type { ComponentRegistry } from '../ComponentRegistry.js';
import { EXTENSION_SLOT_TYPE, KNOWN_DSL_KEYS, omitNavKeys } from '../dslKeys.js';
import { evaluateOperatorExpression } from '../expression.js';
import { warnMissingCtxPrefix } from './warnCtxPrefix.js';
import { warnInvalidNodeProps } from './warnInvalidNodeProps.js';
import { warnInvalidChildren, warnUnknownNodeKeys } from './warnUnknownKeys.js';

// Replaced statically by every bundler (and defined by Node); declared locally because the package does not load the
// Node typings. A bundle that leaves it untouched has no `process` and fails here, like React itself.
declare const process: { env: { NODE_ENV?: string } };

export interface RenderContext {
	[key: string]: unknown;
}

export interface RendererProps {
	node: Record<string, unknown>;
	registry: ComponentRegistry;
	ctx?: RenderContext;
}

// Defined in a React-free module so Node tooling can share them; re-exported to keep this module's public surface.
export { EXTENSION_SLOT_TYPE, KNOWN_DSL_KEYS, omitNavKeys };
// The generated entries import their runtime helpers from this module (see buildEntriesFile).
export { coerceProp, coerceStringList, coerceDate } from './coerceProp.js';
export { pickPropSchema } from './pickPropSchema.js';
export { isDevelopment } from './devMode.js';

/** True when a `$if` expression resolves to something falsy: the node renders nothing. */
function isHiddenByIf(node: Record<string, unknown>, ctx: RenderContext): boolean {
	const ifExpr = node['$if'] as string | undefined;
	return Boolean(ifExpr) && !resolveExpressionValue(ifExpr, ctx);
}

/** Zod issues as a list, for the dev-mode schema alerts. */
function IssueList({ issues }: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> }) {
	return (
		<ul>
			{issues.map((issue, i) => (
				<li key={i}>
					{issue.path.join('.') || 'root'}: {issue.message}
				</li>
			))}
		</ul>
	);
}

export function DslRenderer({ node, registry, ctx = {} }: RendererProps): React.ReactElement | null {
	const type = node['$type'] as string | undefined;
	if (!type) {
		return null;
	}

	if (type === EXTENSION_SLOT_TYPE) {
		return renderExtensionSlot(node, registry, ctx);
	}

	const entry = registry[type];
	if (!entry) {
		return (
			<div role="alert">
				Unknown component type: <strong>{type}</strong>
			</div>
		);
	}

	if (isHiddenByIf(node, ctx)) {
		return null;
	}

	// Compute child ctx: apply $context.expose if present.
	// expose: { targetKey: sourceCtxKey } - sourceCtxKey is a plain ctx key name, null = same key.
	let childCtx = ctx;
	const contextDirective = node['$context'] as { expose?: Record<string, string | null> } | undefined;
	if (contextDirective?.expose) {
		childCtx = { ...ctx };
		for (const [key, sourceKey] of Object.entries(contextDirective.expose)) {
			const ctxKey = sourceKey ?? key;
			childCtx[key] = ctx[ctxKey];
		}
	}

	// The exact expression a bundler replaces, written inline: through a function call (`isDevelopment()`) the dead block
	// below stays in a production bundle with everything it imports. Not a `typeof process` guard either, see devMode.ts.
	if (process.env.NODE_ENV !== 'production') {
		// Unknown $-key check
		for (const key of Object.keys(node)) {
			if (key.startsWith('$') && !KNOWN_DSL_KEYS.has(key)) {
				return (
					<div role="alert">
						<strong>[{type}] unknown DSL directive:</strong> <code>{key}</code>
					</div>
				);
			}
		}

		// Unknown authored key (a non-$ key the component never reads): warn once, never change what renders.
		warnUnknownNodeKeys(node, type, entry);

		// A resolved prop value of the wrong shape (a typo'd enum, a map for a list): warn once, never change what renders.
		warnInvalidNodeProps(node, type, entry, childCtx, resolveExpressionValue);

		// $context.expose resolution check: warn if source ctx key is missing from current ctx
		if (contextDirective?.expose) {
			const missing: string[] = [];
			for (const [key, sourceKey] of Object.entries(contextDirective.expose)) {
				const ctxKey = sourceKey ?? key;
				if (!(ctxKey in ctx)) {
					missing.push(`${key} <- ${ctxKey}`);
				}
			}
			if (missing.length > 0) {
				return (
					<div role="alert">
						<strong>[{type}] $context.expose references missing ctx keys:</strong>
						<ul>
							{missing.map((m, i) => (
								<li key={i}>{m}</li>
							))}
						</ul>
					</div>
				);
			}
		}

		if (entry.nodeSchema) {
			const result = entry.nodeSchema.safeParse(node);
			if (!result.success) {
				return (
					<div role="alert">
						<strong>[{type}] node schema error:</strong>
						<IssueList issues={result.error.issues} />
					</div>
				);
			}
		}

		if (entry.ctxSchema) {
			const result = entry.ctxSchema.safeParse(ctx);
			if (!result.success) {
				return (
					<div role="alert">
						<strong>[{type}] ctx schema warning:</strong>
						<IssueList issues={result.error.issues} />
					</div>
				);
			}
		}
	}

	return entry.render({ node, registry, ctx: childCtx });
}

// items ordering/multiplicity is owned by whatever populates the $sources entry (e.g. a server-side
// slot endpoint) - renderChildren just renders the array in the order it arrives.
function renderExtensionSlot(
	node: Record<string, unknown>,
	registry: ComponentRegistry,
	ctx: RenderContext
): React.ReactElement | null {
	if (isHiddenByIf(node, ctx)) {
		return null;
	}

	const itemsExpr = node['items'];
	const items = resolveExpressionValue(itemsExpr, ctx);
	if (!Array.isArray(items)) {
		return (
			<div role="alert">
				<strong>[ExtensionSlot] &quot;items&quot; did not resolve to an array:</strong> <code>{String(itemsExpr)}</code>
			</div>
		);
	}

	return <>{renderChildren(items, registry, ctx)}</>;
}

/**
 * `resolveExpressionValue` for a value that CARRIES expressions: every string inside a map or a list is resolved
 * (`{ name: $sources.event.name }`). Only props tagged `@resolveDeep` use it: a plain prop keeps literal strings that
 * happen to start with `$` (a price, a template) untouched.
 */
export function resolveExpressionsDeep(value: unknown, ctx: RenderContext): unknown {
	if (typeof value === 'string') {
		return resolveExpressionValue(value, ctx);
	}
	if (Array.isArray(value)) {
		return value.map(item => resolveExpressionsDeep(item, ctx));
	}
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveExpressionsDeep(item, ctx)]));
	}
	return value;
}

/**
 * Resolves an authored value: a `$path` reads the page, an operator expression (`!$a || $b != 'x'`, see expression.ts)
 * combines paths, anything else is returned untouched.
 */
export function resolveExpressionValue(expr: unknown, ctx: RenderContext): unknown {
	if (typeof expr !== 'string') {
		return expr;
	}
	if (!expr.startsWith('$') && !expr.trimStart().startsWith('!')) {
		return expr;
	}
	const operator = evaluateOperatorExpression(expr, path => resolveExpressionPath(path, ctx));
	if (operator.matched) {
		return operator.value;
	}
	if (!expr.startsWith('$')) {
		return expr;
	}
	if (expr.startsWith('$concat(')) {
		warnMalformedConcat(expr);
		return undefined;
	}
	return resolveExpressionPath(expr, ctx);
}

const warnedConcat = new Set<string>();

/** A `$concat(` that does not parse would otherwise resolve to an unrelated path and silently render nothing. */
function warnMalformedConcat(expr: string): void {
	if (warnedConcat.has(expr)) {
		return;
	}
	warnedConcat.add(expr);
	console.error(
		`[DslRenderer] "${expr}" is not a valid $concat expression, so it resolves to undefined. ` +
			`Write $concat(<arg>, <arg>, ...) with $paths, quoted strings or numbers as arguments, e.g. $concat('/projects/', $route.project).`
	);
}

function resolveExpressionPath(expr: string, ctx: RenderContext): unknown {
	const path = expr.slice(1).split('.');
	const root = path[0];
	const rest = path.slice(1);

	let current: unknown;
	if (root === 'ctx') {
		current = ctx;
	} else if (root === 'props') {
		current = ctx['$props'];
	} else if (root === 'route') {
		current = ctx['$route'];
	} else if (root === 'urlParam') {
		current = ctx['$urlParam'];
	} else if (root === 'vars') {
		current = ctx['$vars'];
	} else if (root === 'outputs') {
		current = ctx['$outputs'];
	} else if (root === 'brains') {
		current = ctx['$brains'];
	} else if (root === 'sources') {
		// $sources.books -> ctx['books'], $sources.books.items -> ctx['books'].items
		if (rest.length === 0) {
			return undefined;
		}
		current = ctx[rest[0]!];
		for (const key of rest.slice(1)) {
			if (current == null || typeof current !== 'object') {
				return undefined;
			}
			current = (current as Record<string, unknown>)[key];
		}
		return current;
	} else {
		current = ctx[root ?? ''];
		if (current === undefined && process.env.NODE_ENV !== 'production') {
			warnMissingCtxPrefix(root, ctx);
		}
	}

	for (const key of rest) {
		if (current == null || typeof current !== 'object') {
			return undefined;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

export function renderChildren(
	nodes: unknown,
	registry: ComponentRegistry,
	ctx: RenderContext
): React.ReactElement[] {
	if (process.env.NODE_ENV !== 'production') {
		warnInvalidChildren(nodes);
	}
	if (!Array.isArray(nodes)) {
		return [];
	}
	return (nodes as unknown[])
		.map((node, i) => {
			if (!node || typeof node !== 'object' || Array.isArray(node)) {
				return null;
			}
			return <DslRenderer key={i} node={node as Record<string, unknown>} registry={registry} ctx={ctx} />;
		})
		.filter((el): el is React.ReactElement => el !== null);
}
