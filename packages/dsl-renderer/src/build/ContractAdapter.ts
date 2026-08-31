import type { HttpMethod } from '../routeBuilder.js';

/**
 * Result of resolving a single YAML URL against a contract.
 * The contractKey is the exact string as it appears in the ApiRoutes object
 * (e.g. '/api/books/:id') — used verbatim in generated TypeScript expressions.
 */
export interface ResolvedRoute {
	/** Exact key from the contract, e.g. '/api/books/:id' */
	contractKey: string;
	method: HttpMethod;
	/** TS expression for response type, e.g. "RouteResponse<'GET', '/api/books/:id', typeof ROUTES>" */
	responseTypeExpr: string;
	/** TS expression for body type, undefined if this method has no body */
	bodyTypeExpr: string | undefined;
	/** TS expression for query type, undefined if this method has no query */
	queryTypeExpr: string | undefined;
}

/**
 * Abstracts how a contract is queried and how TypeScript type expressions are emitted.
 * Swap the implementation to support Zod, OpenAPI, or JSON Schema contracts.
 */
export interface ContractAdapter {
	/**
	 * Find the contract route matching the given method + normalized URL path.
	 * Matching ignores param names (see urlNormalizer.ts).
	 * Returns null when no match exists.
	 */
	resolve(method: HttpMethod, normalizedPath: string): ResolvedRoute | null;

	/**
	 * TypeScript import lines to prepend to the generated file.
	 * Each line is a full import statement ending with ';'.
	 */
	getImports(): string[];
}
