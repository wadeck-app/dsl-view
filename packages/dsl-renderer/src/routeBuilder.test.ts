import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineRoutes } from './routeBuilder.js';

const response = z.object({ ok: z.boolean() });

describe('defineRoutes __baseUrl', () => {
	it('is "/" when there is no route at all', () => {
		expect(defineRoutes({}).__baseUrl).toBe('/');
	});

	it('is the path itself for a single route (not trimmed to its directory)', () => {
		expect(defineRoutes({ '/api/users/{id}': { GET: { response } } }).__baseUrl).toBe('/api/users/{id}');
	});

	it('is the directory shared by two sibling routes', () => {
		const routes = defineRoutes({
			'/api/users': { GET: { response } },
			'/api/orders': { GET: { response } },
		});
		expect(routes.__baseUrl).toBe('/api/');
	});

	it('stays on the shorter route when the other one lives below it', () => {
		const routes = defineRoutes({
			'/api/users': { GET: { response } },
			'/api/users/{id}': { GET: { response } },
		});
		expect(routes.__baseUrl).toBe('/api/users');
	});

	it('keeps narrowing across more than two routes', () => {
		const routes = defineRoutes({
			'/api/admin/users': { GET: { response } },
			'/api/admin/roles': { GET: { response } },
			'/api/public/health': { GET: { response } },
		});
		expect(routes.__baseUrl).toBe('/api/');
	});

	it('falls back to "/" for routes that share nothing but the root', () => {
		const routes = defineRoutes({
			'/a': { GET: { response } },
			'/b': { GET: { response } },
		});
		expect(routes.__baseUrl).toBe('/');
	});

	it('does not trim below the root when a route is the bare root', () => {
		const routes = defineRoutes({
			'/': { GET: { response } },
			'/api/users': { GET: { response } },
		});
		expect(routes.__baseUrl).toBe('/');
	});

	it('keeps every route contract on the returned object, untouched', () => {
		const contract = { GET: { response } };
		const routes = defineRoutes({ '/api/a': contract, '/api/b': contract });
		expect(routes['/api/a']).toBe(contract);
		expect(routes['/api/b']).toBe(contract);
		expect(Object.keys(routes).sort()).toStrictEqual(['/api/a', '/api/b', '__baseUrl']);
	});
});
