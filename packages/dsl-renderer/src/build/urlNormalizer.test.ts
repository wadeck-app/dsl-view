import { describe, expect, it } from 'vitest';
import { extractMethod, extractPath, normalizeUrlStructure, yamlUrlToRouteStyle } from './urlNormalizer.js';

describe('normalizeUrlStructure', () => {
	it('leaves a path with no params unchanged', () => {
		expect(normalizeUrlStructure('/api/books/')).toBe('/api/books/');
	});

	it('normalizes a single {param} placeholder', () => {
		expect(normalizeUrlStructure('/api/books/{id}')).toBe('/api/books/:__p0');
	});

	it('normalizes a single :param placeholder', () => {
		expect(normalizeUrlStructure('/api/books/:id')).toBe('/api/books/:__p0');
	});

	it('produces the same result regardless of param name', () => {
		const a = normalizeUrlStructure('/api/books/{bookId}');
		const b = normalizeUrlStructure('/api/books/:id');
		expect(a).toBe(b);
	});

	it('normalizes multiple params positionally', () => {
		expect(normalizeUrlStructure('/api/tasks/{taskId}/logs/{logId}')).toBe(
			'/api/tasks/:__p0/logs/:__p1',
		);
	});

	it('strips GET method prefix', () => {
		expect(normalizeUrlStructure('GET /api/books/')).toBe('/api/books/');
	});

	it('strips POST method prefix', () => {
		expect(normalizeUrlStructure('POST /api/books/')).toBe('/api/books/');
	});

	it('strips DELETE method prefix with param', () => {
		expect(normalizeUrlStructure('DELETE /api/books/{id}')).toBe('/api/books/:__p0');
	});

	it('strips query string before normalizing', () => {
		expect(normalizeUrlStructure('GET /api/books/?page=1')).toBe('/api/books/');
	});

	it('matches YAML url with contract key using mixed syntax', () => {
		const yaml = normalizeUrlStructure('GET /api/interventions/{interventionId}/respond');
		const contract = normalizeUrlStructure('/api/interventions/:id/respond');
		expect(yaml).toBe(contract);
	});
});

describe('yamlUrlToRouteStyle', () => {
	it('converts {param} to :param', () => {
		expect(yamlUrlToRouteStyle('GET /api/books/{id}')).toBe('/api/books/:id');
	});

	it('preserves :param as-is', () => {
		expect(yamlUrlToRouteStyle('/api/books/:id')).toBe('/api/books/:id');
	});

	it('strips method prefix', () => {
		expect(yamlUrlToRouteStyle('PATCH /api/authors/{id}')).toBe('/api/authors/:id');
	});
});

describe('extractMethod', () => {
	it('extracts GET', () => {
		expect(extractMethod('GET /api/books/')).toBe('GET');
	});

	it('extracts POST', () => {
		expect(extractMethod('POST /api/books/')).toBe('POST');
	});

	it('returns undefined for paths without a method', () => {
		expect(extractMethod('/api/books/')).toBeUndefined();
	});
});

describe('extractPath', () => {
	it('strips the method prefix', () => {
		expect(extractPath('GET /api/books/')).toBe('/api/books/');
	});

	it('returns path unchanged when no method prefix', () => {
		expect(extractPath('/api/books/')).toBe('/api/books/');
	});
});
