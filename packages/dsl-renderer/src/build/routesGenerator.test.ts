import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildRoutesFile, collectPageRoutes, normalizeRouteForComparison } from './routesGenerator.js';

describe('normalizeRouteForComparison', () => {
	it('treats routes differing only by param name as identical', () => {
		expect(normalizeRouteForComparison('/workers/:id')).toBe(normalizeRouteForComparison('/workers/:workerId'));
	});

	it('ignores a trailing slash', () => {
		expect(normalizeRouteForComparison('/workers/')).toBe(normalizeRouteForComparison('/workers'));
	});

	it('keeps static segments significant', () => {
		expect(normalizeRouteForComparison('/workers/:id')).not.toBe(normalizeRouteForComparison('/jobs/:id'));
	});
});

describe('collectPageRoutes', () => {
	it('returns route, nav metadata and source file, skipping pages without $route', () => {
		const routes = collectPageRoutes([
			{ filename: 'workers.yaml', doc: { $route: '/workers/:workerId', $navLabel: 'Workers', $navOrder: 2 } },
			{ filename: 'partial.yaml', doc: { $type: 'PageContent' } },
		]);
		expect(routes).toEqual([
			{ filename: 'workers.yaml', route: '/workers/:workerId', navLabel: 'Workers', navOrder: 2 },
		]);
	});

	it('fails naming both files and the route when two pages declare the same $route', () => {
		expect(() =>
			collectPageRoutes([
				{ filename: 'workers.yaml', doc: { $route: '/workers' } },
				{ filename: 'workers-copy.yaml', doc: { $route: '/workers' } },
			])
		).toThrow("Duplicate $route '/workers' in workers.yaml and workers-copy.yaml");
	});

	it('fails when routes differ only by param name, since they match the same URLs', () => {
		expect(() =>
			collectPageRoutes([
				{ filename: 'a.yaml', doc: { $route: '/workers/:id' } },
				{ filename: 'b.yaml', doc: { $route: '/workers/:workerId' } },
			])
		).toThrow(/Duplicate \$route '\/workers\/:workerId' in a\.yaml and b\.yaml.*'\/workers\/:id'/s);
	});
});

describe('buildRoutesFile', () => {
	let appRoot: string;

	beforeEach(() => {
		appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-generator-test-'));
		fs.mkdirSync(path.join(appRoot, 'src', 'dsl', 'pages'), { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(appRoot, { recursive: true, force: true });
	});

	it('emits src/generated/routes.ts importing each routed page as ?raw text', () => {
		fs.writeFileSync(
			path.join(appRoot, 'src', 'dsl', 'pages', 'worker-detail.yaml'),
			'$route: /workers/:workerId\n$navLabel: Worker\n$type: PageContent\n'
		);
		fs.writeFileSync(path.join(appRoot, 'src', 'dsl', 'pages', 'fragment.yaml'), '$type: PageContent\n');

		buildRoutesFile(appRoot);

		const out = fs.readFileSync(path.join(appRoot, 'src', 'generated', 'routes.ts'), 'utf-8');
		expect(out).toContain("import workerDetailYaml from '../dsl/pages/worker-detail.yaml?raw';");
		expect(out).toContain("route: '/workers/:workerId'");
		expect(out).toContain('yamlText: workerDetailYaml');
		expect(out).toContain('navLabel: "Worker"');
		expect(out).not.toContain('fragment');
		// Widened type, not an `as const` union: optional fields (navOrder) must stay accessible when filtering/sorting.
		expect(out).toContain('export interface DslRouteEntry');
		expect(out).toContain('navOrder?: number;');
		expect(out).toContain('export const dslRoutes: readonly DslRouteEntry[] = [');
		expect(out).not.toContain('as const');
	});

	it('throws on duplicate routes instead of writing a file', () => {
		fs.writeFileSync(path.join(appRoot, 'src', 'dsl', 'pages', 'a.yaml'), '$route: /x\n');
		fs.writeFileSync(path.join(appRoot, 'src', 'dsl', 'pages', 'b.yaml'), '$route: /x\n');

		expect(() => buildRoutesFile(appRoot)).toThrow("Duplicate $route '/x' in a.yaml and b.yaml");
		expect(fs.existsSync(path.join(appRoot, 'src', 'generated', 'routes.ts'))).toBe(false);
	});
});
