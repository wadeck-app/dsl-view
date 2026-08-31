import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineRoutes } from '../../routeBuilder.js';
import { ZodContractAdapter } from './ZodContractAdapter.js';
import { normalizeUrlStructure } from '../urlNormalizer.js';

const TestRoutes = defineRoutes({
	'/api/books/': {
		GET: { response: z.object({ items: z.array(z.object({ id: z.string() })) }) },
		POST: { body: z.object({ title: z.string() }), response: z.object({ id: z.string() }) },
	},
	'/api/books/:id': {
		GET: { params: z.object({ id: z.string() }), response: z.object({ id: z.string() }) },
		PATCH: {
			params: z.object({ id: z.string() }),
			body: z.object({ title: z.string().optional() }),
			response: z.object({ id: z.string() }),
		},
		DELETE: { params: z.object({ id: z.string() }), response: z.object({ success: z.boolean() }) },
	},
	'/api/books/:id/chapters': {
		GET: { params: z.object({ id: z.string() }), response: z.object({ items: z.array(z.string()) }) },
	},
});

const adapter = new ZodContractAdapter(TestRoutes, 'TEST_ROUTES', 'test-contracts');

describe('ZodContractAdapter.resolve', () => {
	it('resolves a simple collection GET', () => {
		const result = adapter.resolve('GET', '/api/books/');
		expect(result).not.toBeNull();
		expect(result!.contractKey).toBe('/api/books/');
		expect(result!.method).toBe('GET');
		expect(result!.responseTypeExpr).toBe("RouteResponse<'GET', '/api/books/', typeof TEST_ROUTES>");
		expect(result!.bodyTypeExpr).toBeUndefined();
	});

	it('resolves a POST with body type', () => {
		const result = adapter.resolve('POST', '/api/books/');
		expect(result).not.toBeNull();
		expect(result!.bodyTypeExpr).toBe("RouteBody<'POST', '/api/books/', typeof TEST_ROUTES>");
	});

	it('resolves a param route using normalized form (YAML-style {id})', () => {
		// Simulates: YAML has /api/books/{bookId}, contract has /api/books/:id
		const normalizedYaml = normalizeUrlStructure('/api/books/{bookId}');
		const result = adapter.resolve('GET', normalizedYaml);
		expect(result).not.toBeNull();
		// Must use the contract key, not the YAML key
		expect(result!.contractKey).toBe('/api/books/:id');
	});

	it('resolves a nested param route', () => {
		const normalized = normalizeUrlStructure('/api/books/:id/chapters');
		const result = adapter.resolve('GET', normalized);
		expect(result).not.toBeNull();
		expect(result!.contractKey).toBe('/api/books/:id/chapters');
	});

	it('returns null for an unknown URL', () => {
		const result = adapter.resolve('GET', '/api/nonexistent/');
		expect(result).toBeNull();
	});

	it('returns null for a known URL with a wrong method', () => {
		// /api/books/ has no PUT
		const result = adapter.resolve('PUT', '/api/books/');
		expect(result).toBeNull();
	});

	it('generates correct query type expression when query is present', () => {
		const routesWithQuery = defineRoutes({
			'/api/items/': {
				GET: {
					query: z.object({ page: z.number().optional() }),
					response: z.object({ items: z.array(z.string()) }),
				},
			},
		});
		const a = new ZodContractAdapter(routesWithQuery, 'ITEMS_ROUTES', 'items-contracts');
		const result = a.resolve('GET', '/api/items/');
		expect(result!.queryTypeExpr).toBe("RouteQuery<'GET', '/api/items/', typeof ITEMS_ROUTES>");
	});
});

describe('ZodContractAdapter construction', () => {
	it('throws when two contract keys have the same structural form', () => {
		const conflictingRoutes = {
			'/api/books/:id': {
				GET: { response: z.object({ id: z.string() }) },
			},
			'/api/books/:bookId': {
				GET: { response: z.object({ id: z.string() }) },
			},
		};
		expect(() => new ZodContractAdapter(conflictingRoutes, 'ROUTES', 'pkg')).toThrow(
			'Structural URL conflict',
		);
	});
});

describe('ZodContractAdapter.getImports', () => {
	it('returns import lines for routes and type helpers', () => {
		const imports = adapter.getImports();
		expect(imports).toHaveLength(2);
		expect(imports[0]).toContain("import { TEST_ROUTES }");
		expect(imports[1]).toContain("import type { RouteResponse, RouteBody, RouteQuery }");
	});
});
