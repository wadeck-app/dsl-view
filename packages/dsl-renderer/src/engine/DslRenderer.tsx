import React from 'react';

// process is defined by Node.js, Webpack, Vite, and similar bundlers.
// The runtime usage below is always guarded by `typeof process !== 'undefined'`.
// This declaration prevents TS errors in browser-targeted consuming projects.
declare const process: { env: Record<string, string | undefined> } | undefined;

import type { ComponentRegistry } from '../ComponentRegistry.js';

export interface RenderContext {
	[key: string]: unknown;
}

export interface RendererProps {
	node: Record<string, unknown>;
	registry: ComponentRegistry;
	ctx?: RenderContext;
}

const KNOWN_DSL_KEYS = new Set(['$if', '$source', '$context', '$route', '$extends', '$type', '$id', '$outputs']);

export function DslRenderer({ node, registry, ctx = {} }: RendererProps): React.ReactElement | null {
	const type = node['$type'] as string | undefined;
	if (!type) {
		return null;
	}

	const entry = registry[type];
	if (!entry) {
		return (
			<div role="alert">
				Unknown component type: <strong>{type}</strong>
			</div>
		);
	}

	const ifExpr = node['$if'] as string | undefined;
	if (ifExpr) {
		const resolved = resolveExpressionValue(ifExpr, ctx);
		if (!resolved) {
			return null;
		}
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

	if (typeof process !== 'undefined' && process.env['NODE_ENV'] !== 'production') {
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

		// $context.expose resolution check: warn if source ctx key is missing from current ctx
		if (contextDirective?.expose) {
			const missing: string[] = [];
			for (const [key, sourceKey] of Object.entries(contextDirective.expose)) {
				const ctxKey = sourceKey ?? key;
				if (!(ctxKey in ctx)) {
					missing.push(`${key} ← ${ctxKey}`);
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
						<ul>
							{result.error.issues.map((issue, i) => (
								<li key={i}>
									{issue.path.join('.') || 'root'}: {issue.message}
								</li>
							))}
						</ul>
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
						<ul>
							{result.error.issues.map((issue, i) => (
								<li key={i}>
									{issue.path.join('.') || 'root'}: {issue.message}
								</li>
							))}
						</ul>
					</div>
				);
			}
		}
	}

	return entry.render({ node, registry, ctx: childCtx });
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
		// $sources.books → ctx['books'], $sources.books.items → ctx['books'].items
		if (rest.length === 0) return undefined;
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
	if (!Array.isArray(nodes)) return [];
	return (nodes as unknown[])
		.map((node, i) => {
			if (!node || typeof node !== 'object' || Array.isArray(node)) {
				return null;
			}
			return <DslRenderer key={i} node={node as Record<string, unknown>} registry={registry} ctx={ctx} />;
		})
		.filter((el): el is React.ReactElement => el !== null);
}
