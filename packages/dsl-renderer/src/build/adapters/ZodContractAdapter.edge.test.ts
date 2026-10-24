import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ApiRoutes, HttpMethod } from '../../routeBuilder.js';
import { defineRoutes } from '../../routeBuilder.js';
import { normalizeUrlStructure } from '../urlNormalizer.js';
import { ZodContractAdapter } from './ZodContractAdapter.js';

const response = z.object({ ok: z.boolean() });

describe('ZodContractAdapter edge cases', () => {
	it('reports no query and no body type for a route that declares neither', () => {
		const adapter = new ZodContractAdapter(defineRoutes({ '/api/ping/': { GET: { response } } }), 'R', 'pkg');
		const resolved = adapter.resolve('GET', '/api/ping/')!;
		expect(resolved.bodyTypeExpr).toBeUndefined();
		expect(resolved.queryTypeExpr).toBeUndefined();
		expect(resolved.method).toBe('GET');
		expect(resolved.contractKey).toBe('/api/ping/');
	});

	it('reports both a body and a query type when the route declares both', () => {
		const adapter = new ZodContractAdapter(
			defineRoutes({ '/api/x/': { POST: { body: z.object({ a: z.string() }), query: z.object({ b: z.string() }), response } } }),
			'R',
			'pkg'
		);
		const resolved = adapter.resolve('POST', '/api/x/')!;
		expect(resolved.bodyTypeExpr).toBe("RouteBody<'POST', '/api/x/', typeof R>");
		expect(resolved.queryTypeExpr).toBe("RouteQuery<'POST', '/api/x/', typeof R>");
		expect(resolved.responseTypeExpr).toBe("RouteResponse<'POST', '/api/x/', typeof R>");
	});

	it('does not treat the __baseUrl metadata that defineRoutes adds as a route', () => {
		const routes = defineRoutes({ '/api/books/': { GET: { response } } });
		expect(routes.__baseUrl).toBe('/api/books/');
		const adapter = new ZodContractAdapter(routes, 'R', 'pkg');
		// A string's indices would otherwise look like HTTP methods of a "__baseUrl" route.
		expect(adapter.resolve('0' as HttpMethod, normalizeUrlStructure('__baseUrl'))).toBeNull();
		expect(adapter.resolve('GET', '__baseUrl')).toBeNull();
	});

	it('returns null (not a crash) for a method key whose contract is undefined', () => {
		const routes = { '/api/x/': { GET: undefined } } as unknown as ApiRoutes;
		const adapter = new ZodContractAdapter(routes, 'R', 'pkg');
		expect(adapter.resolve('GET', '/api/x/')).toBeNull();
	});

	it('keeps the same path under different methods apart, and detects a structural conflict per method only', () => {
		const adapter = new ZodContractAdapter(
			{
				'/api/a/:id': { GET: { response }, DELETE: { response } },
				'/api/a/:key/x': { GET: { response } },
			} as unknown as ApiRoutes,
			'R',
			'pkg'
		);
		expect(adapter.resolve('GET', '/api/a/:__p0')!.contractKey).toBe('/api/a/:id');
		expect(adapter.resolve('DELETE', '/api/a/:__p0')!.method).toBe('DELETE');
		expect(adapter.resolve('PATCH', '/api/a/:__p0')).toBeNull();
		// Same structure but different methods is not a conflict.
		expect(
			() =>
				new ZodContractAdapter(
					{ '/api/a/:id': { GET: { response } }, '/api/a/:other': { POST: { response } } } as unknown as ApiRoutes,
					'R',
					'pkg'
				)
		).not.toThrow();
	});

	it('names both conflicting contract keys and the method in the error', () => {
		const conflicting = {
			'/api/books/:id': { GET: { response } },
			'/api/books/:bookId': { GET: { response } },
		} as unknown as ApiRoutes;
		expect(() => new ZodContractAdapter(conflicting, 'R', 'pkg')).toThrow(
			'[ZodContractAdapter] Structural URL conflict: "/api/books/:bookId" and "/api/books/:id" normalize to the same form for method GET. Contract is malformed.'
		);
	});

	it('imports the helpers from their own source when one is given, from the contracts package otherwise', () => {
		const routes = defineRoutes({ '/api/ping/': { GET: { response } } });
		expect(new ZodContractAdapter(routes, 'R', 'contracts').getImports()).toEqual([
			"import { R } from 'contracts';",
			"import type { RouteResponse, RouteBody, RouteQuery } from 'contracts';",
		]);
		expect(new ZodContractAdapter(routes, 'R', 'contracts', 'helpers').getImports()).toEqual([
			"import { R } from 'contracts';",
			"import type { RouteResponse, RouteBody, RouteQuery } from 'helpers';",
		]);
	});
});
