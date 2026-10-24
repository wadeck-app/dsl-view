import React from 'react';

import type { ComponentRegistry } from '../ComponentRegistry.js';
import { EXTENSION_SLOT_TYPE, KNOWN_DSL_KEYS, omitNavKeys } from '../dslKeys.js';
import { isDevelopment } from './devMode.js';
import { warnInvalidChildren, warnUnknownNodeKeys } from './warnUnknownKeys.js';

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

	if (isDevelopment()) {
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

export function resolveExpressionValue(expr: unknown, ctx: RenderContext): unknown {
	if (typeof expr !== 'string') {
		return expr;
	}
	if (!expr.startsWith('$')) {
		return expr;
	}

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
	if (isDevelopment()) {
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
