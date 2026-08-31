import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { load as parseYaml } from 'js-yaml';
import type { Plugin } from 'vite';
import type { ContractAdapter } from './ContractAdapter.js';
import type { HttpMethod } from '../routeBuilder.js';
import { extractMethod, extractPath, normalizeUrlStructure } from './urlNormalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── dsl.config.yaml types ───────────────────────────────────────────────────

interface ContractDeclaration {
	package: string;
	export: string;
	adapter?: 'zod';
}

interface DslConfigWithContracts {
	packages?: Record<string, string>;
	contracts?: ContractDeclaration[];
}

// ─── YAML page shape (only what we need) ─────────────────────────────────────

interface RawSourceSpec {
	url?: string;
}

type RawBrainSpec =
	| string
	| { $brain?: string; url?: string; [key: string]: unknown };

interface PageYaml {
	$sources?: Record<string, string | RawSourceSpec>;
	$actions?: Record<string, unknown>;
	$brains?: Record<string, string | RawBrainSpec>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readDslConfig(appRoot: string): DslConfigWithContracts {
	const configPath = path.join(appRoot, 'dsl.config.yaml');
	if (!fs.existsSync(configPath)) return {};
	const raw = parseYaml(fs.readFileSync(configPath, 'utf-8')) as DslConfigWithContracts | null;
	return raw ?? {};
}

function slugFromFilename(filename: string): string {
	return path.basename(filename, '.yaml');
}

function toPascalCase(slug: string): string {
	return slug
		.split(/[-_]/)
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join('');
}

function extractSourceUrl(spec: string | RawSourceSpec | undefined): string | undefined {
	if (typeof spec === 'string') return spec;
	return spec?.url;
}

function extractBrainUrl(spec: string | RawBrainSpec | undefined): string | undefined {
	if (!spec || typeof spec === 'string') return undefined;
	return spec.url as string | undefined;
}

function isHttpBrain(spec: string | RawBrainSpec | undefined): boolean {
	if (!spec || typeof spec === 'string') return false;
	const brain = (spec as { $brain?: string }).$brain ?? '';
	return brain.startsWith('$brains.$http.');
}

// ─── Code generation ─────────────────────────────────────────────────────────

interface SourceEntry {
	name: string;
	contractKey: string | null;
	responseTypeExpr: string;
	error: string | null;
}

interface BrainEntry {
	name: string;
	contractKey: string | null;
	bodyTypeExpr: string | undefined;
	responseTypeExpr: string;
	error: string | null;
}

interface PageResult {
	slug: string;
	pascal: string;
	sources: SourceEntry[];
	brains: BrainEntry[];
}

function resolveEntries(
	items: Record<string, string | RawSourceSpec | RawBrainSpec>,
	mode: 'source' | 'brain',
	adapter: ContractAdapter | null,
	pageFile: string,
): Array<SourceEntry | BrainEntry> {
	const results: Array<SourceEntry | BrainEntry> = [];

	for (const [name, spec] of Object.entries(items)) {
		const rawUrl =
			mode === 'source'
				? extractSourceUrl(spec as string | RawSourceSpec)
				: extractBrainUrl(spec as RawBrainSpec);

		if (!rawUrl) continue;

		// For brains, skip non-HTTP brains ($ctx.*, custom registry)
		if (mode === 'brain' && !isHttpBrain(spec as RawBrainSpec)) continue;

		const method = extractMethod(rawUrl) as HttpMethod | undefined;
		const urlPath = extractPath(rawUrl);

		if (!method) {
			const error = `No HTTP method prefix in URL: "${rawUrl}" (in ${path.basename(pageFile)})`;
			if (mode === 'source') {
				results.push({ name, contractKey: null, responseTypeExpr: 'unknown', error });
			} else {
				results.push({ name, contractKey: null, bodyTypeExpr: undefined, responseTypeExpr: 'unknown', error });
			}
			continue;
		}

		if (!adapter) {
			// No contract configured — type is unknown, emit a build warning
			if (mode === 'source') {
				results.push({
					name,
					contractKey: null,
					responseTypeExpr: 'unknown',
					error: `No contract configured. Add a "contracts:" section to dsl.config.yaml to enable typing for ${rawUrl}`,
				});
			} else {
				results.push({
					name,
					contractKey: null,
					bodyTypeExpr: undefined,
					responseTypeExpr: 'unknown',
					error: `No contract configured. Add a "contracts:" section to dsl.config.yaml to enable typing for ${rawUrl}`,
				});
			}
			continue;
		}

		const normalizedPath = normalizeUrlStructure(urlPath);
		const resolved = adapter.resolve(method, normalizedPath);

		if (!resolved) {
			const error = `No contract match for: ${method} ${urlPath} (in ${path.basename(pageFile)})`;
			if (mode === 'source') {
				results.push({ name, contractKey: null, responseTypeExpr: 'unknown', error });
			} else {
				results.push({ name, contractKey: null, bodyTypeExpr: undefined, responseTypeExpr: 'unknown', error });
			}
			continue;
		}

		if (mode === 'source') {
			results.push({
				name,
				contractKey: resolved.contractKey,
				responseTypeExpr: resolved.responseTypeExpr,
				error: null,
			});
		} else {
			results.push({
				name,
				contractKey: resolved.contractKey,
				bodyTypeExpr: resolved.bodyTypeExpr,
				responseTypeExpr: resolved.responseTypeExpr,
				error: null,
			});
		}
	}

	return results;
}

function generatePageTypesFile(pages: PageResult[], adapter: ContractAdapter | null): string {
	const lines: string[] = [];

	lines.push('// AUTO-GENERATED by pageTypesGenerator — DO NOT EDIT');
	lines.push('// Source: src/dsl/pages/*.yaml + dsl.config.yaml');
	lines.push('');

	if (adapter) {
		for (const imp of adapter.getImports()) {
			lines.push(imp);
		}
		lines.push('');
	}

	const pageSlugMap: string[] = [];

	for (const page of pages) {
		lines.push(`// ─── Page: ${page.slug}.yaml ───`);
		lines.push('');

		// Sources
		if (page.sources.length > 0) {
			for (const src of page.sources) {
				if (src.error) {
					lines.push(`// ERROR: ${src.error}`);
					// Emit a TS error that fails the build with a useful message
					lines.push(`// @ts-expect-error Contract not found — ${src.error}`);
					lines.push(`type _ContractCheck_${page.pascal}_source_${src.name} = never;`);
				} else {
					// Compile-time existence check: this line fails if the URL doesn't exist in Routes
					lines.push(`type _ContractCheck_${page.pascal}_source_${src.name} = ${src.responseTypeExpr};`);
				}
			}
			lines.push('');

			lines.push(`export type ${page.pascal}PageSources = {`);
			for (const src of page.sources) {
				lines.push(`\t${src.name}: ${src.responseTypeExpr};`);
			}
			lines.push('};');
			lines.push('');
		} else {
			lines.push(`export type ${page.pascal}PageSources = Record<string, never>;`);
			lines.push('');
		}

		// Brains
		if (page.brains.length > 0) {
			for (const brain of page.brains) {
				if (brain.error) {
					lines.push(`// ERROR: ${brain.error}`);
					lines.push(`// @ts-expect-error Contract not found — ${brain.error}`);
					lines.push(`type _ContractCheck_${page.pascal}_brain_${brain.name} = never;`);
				} else if (brain.bodyTypeExpr) {
					lines.push(`type _ContractCheck_${page.pascal}_brain_${brain.name} = ${brain.bodyTypeExpr};`);
				}
			}
			if (page.brains.some((b) => !b.error && b.bodyTypeExpr)) {
				lines.push('');
				lines.push(`export type ${page.pascal}BrainBodies = {`);
				for (const brain of page.brains) {
					if (!brain.error && brain.bodyTypeExpr) {
						lines.push(`\t${brain.name}: ${brain.bodyTypeExpr};`);
					}
				}
				lines.push('};');
				lines.push('');
			}
		}

		pageSlugMap.push(`\t'${page.slug}': ${page.pascal}PageSources;`);
	}

	// Aggregate map
	lines.push('// Aggregated map of all page source types, indexed by page filename slug');
	lines.push('export type PageSourcesMap = {');
	for (const entry of pageSlugMap) {
		lines.push(entry);
	}
	lines.push('};');
	lines.push('');

	return lines.join('\n');
}

// ─── Core build function ──────────────────────────────────────────────────────

export async function buildPageTypesFile(appRoot: string, adapter: ContractAdapter | null): Promise<void> {
	const pagesDir = path.join(appRoot, 'src', 'dsl', 'pages');
	const outFile = path.join(appRoot, 'src', 'generated', 'page-types.ts');

	if (!fs.existsSync(pagesDir)) {
		console.warn('[pageTypesGenerator] No src/dsl/pages directory found, skipping.');
		return;
	}

	const yamlFiles = fs
		.readdirSync(pagesDir)
		.filter((f) => f.endsWith('.yaml'))
		.sort();

	const pages: PageResult[] = [];
	const errors: string[] = [];

	for (const filename of yamlFiles) {
		const filePath = path.join(pagesDir, filename);
		const raw = parseYaml(fs.readFileSync(filePath, 'utf-8')) as PageYaml | null;
		if (!raw) continue;

		const slug = slugFromFilename(filename);
		const pascal = toPascalCase(slug);

		const sourceItems = raw.$sources ?? {};
		const brainItems = raw.$brains ?? {};

		const sources = resolveEntries(sourceItems, 'source', adapter, filePath) as SourceEntry[];
		const brains = resolveEntries(brainItems as Record<string, RawBrainSpec>, 'brain', adapter, filePath) as BrainEntry[];

		// Collect errors for console output
		for (const s of sources) {
			if (s.error) errors.push(`  ${filename} $sources.${s.name}: ${s.error}`);
		}
		for (const b of brains) {
			if (b.error) errors.push(`  ${filename} $brains.${b.name}: ${b.error}`);
		}

		pages.push({ slug, pascal, sources, brains });
	}

	if (errors.length > 0) {
		console.error(`[pageTypesGenerator] Contract errors found:\n${errors.join('\n')}`);
	}

	const content = generatePageTypesFile(pages, adapter);

	const generatedDir = path.join(appRoot, 'src', 'generated');
	if (!fs.existsSync(generatedDir)) {
		fs.mkdirSync(generatedDir, { recursive: true });
	}
	fs.writeFileSync(outFile, content, 'utf-8');
}

// ─── Dynamic adapter loading ──────────────────────────────────────────────────

async function loadAdapterFromConfig(
	config: DslConfigWithContracts,
	appRoot: string,
): Promise<ContractAdapter | null> {
	if (!config.contracts || config.contracts.length === 0) return null;

	const { ZodContractAdapter } = await import('./adapters/ZodContractAdapter.js');

	// Merge all declared contracts into a single lookup
	const adapters: ContractAdapter[] = [];

	for (const decl of config.contracts) {
		if (decl.adapter && decl.adapter !== 'zod') {
			console.warn(`[pageTypesGenerator] Adapter "${decl.adapter}" not yet implemented, skipping ${decl.package}`);
			continue;
		}

		let mod: Record<string, unknown>;
		try {
			// Try to resolve the package from the app's node_modules first,
			// then fall back to normal resolution
			const resolved = path.resolve(appRoot, 'node_modules', decl.package);
			if (fs.existsSync(resolved)) {
				mod = await import(resolved);
			} else {
				mod = await import(decl.package);
			}
		} catch (err) {
			throw new Error(
				`[pageTypesGenerator] Cannot import contract package "${decl.package}". ` +
					`Make sure it is listed in package.json dependencies.\n${String(err)}`,
			);
		}

		const routes = mod[decl.export];
		if (!routes || typeof routes !== 'object') {
			throw new Error(
				`[pageTypesGenerator] Export "${decl.export}" from "${decl.package}" is not a valid ApiRoutes object.`,
			);
		}

		adapters.push(
			new ZodContractAdapter(
				routes as Record<string, Record<string, unknown>>,
				decl.export,
				decl.package,
			),
		);
	}

	if (adapters.length === 0) return null;
	if (adapters.length === 1) return adapters[0]!;

	// Merge multiple adapters: try each in order, first match wins
	return {
		resolve: (method, normalizedPath) => {
			for (const a of adapters) {
				const result = a.resolve(method, normalizedPath);
				if (result) return result;
			}
			return null;
		},
		getImports: () => adapters.flatMap((a) => a.getImports()),
	};
}

// ─── Vite plugin ─────────────────────────────────────────────────────────────

export interface PageTypesGeneratorOptions {
	appRoot?: string;
	adapter?: ContractAdapter;
}

export function pageTypesGenerator(options: PageTypesGeneratorOptions = {}): Plugin {
	let appRoot = '';
	let adapter: ContractAdapter | null = options.adapter ?? null;

	return {
		name: 'page-types-generator',
		enforce: 'pre',

		async configResolved(config) {
			appRoot = options.appRoot ?? config.root;

			if (!options.adapter) {
				const dslConfig = readDslConfig(appRoot);
				try {
					adapter = await loadAdapterFromConfig(dslConfig, appRoot);
					if (!adapter) {
						console.info(
							'[pageTypesGenerator] No contracts configured in dsl.config.yaml — ' +
								'source/brain types will be "unknown". Add a "contracts:" section to enable typed contracts.',
						);
					}
				} catch (err) {
					// Hard fail at startup — contract config errors must be fixed before building
					throw err;
				}
			}
		},

		async buildStart() {
			await buildPageTypesFile(appRoot, adapter);
		},

		async handleHotUpdate({ file }) {
			const pagesDir = path.join(appRoot, 'src', 'dsl', 'pages');
			if (file.endsWith('.yaml') && file.startsWith(pagesDir)) {
				await buildPageTypesFile(appRoot, adapter);
			}
		},
	};
}
