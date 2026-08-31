export interface ActionSpec {
	url?: string;
	resultKey?: string;
	/** true = reload all sources; string[] = reload only the named sources (also invalidates their cache entries) */
	reloadSources?: boolean | string[];
	/** If set, shows a window.confirm dialog with this message before executing the action. */
	confirm?: string;
}

export type RawActionSpec = string | ActionSpec;

/** Object form for a $sources entry: `{ url: "GET /api/foo", poll: "10s", params: { id: "$ctx.x" } }` */
export interface SourceSpec {
	url: string;
	poll?: string;
	pollWhen?: string; // "$urlParam.live" - only poll when this resolves to truthy
	params?: Record<string, string>;
	/** Cache TTL for this source. "30s", "5m", etc. `false` or omitted = no caching. */
	cache?: string | false;
}

export type RawSourceSpec = string | SourceSpec;

export type Fetcher = (
	url: string,
	params?: Record<string, string>,
	body?: unknown,
	headers?: Record<string, string>
) => Promise<unknown>;

export interface PageSpec {
	$route?: string;
	$sources?: Record<string, RawSourceSpec>;
	$actions?: Record<string, RawActionSpec>;
	$vars?: Record<string, unknown>;
	$brains?: Record<string, import('./brainsTypes.js').RawBrainSpec>;
}

export function normalizeAction(raw: RawActionSpec): ActionSpec {
	if (typeof raw === 'string') {
		return { url: raw };
	}
	return raw;
}

export function normalizeSource(raw: RawSourceSpec): SourceSpec {
	if (typeof raw === 'string') {
		return { url: raw };
	}
	return raw;
}

// Cache key = `sourceKey:resolvedUrl`. TTL is per-entry and set at write time.
export class SourceManager {
	private readonly cache = new Map<string, { data: unknown; fetchedAt: number; ttl: number }>();

	parseDuration(s: string): number {
		const secMatch = /^(\d+)s$/.exec(s);
		if (secMatch) {
			return parseInt(secMatch[1], 10) * 1000;
		}
		const minMatch = /^(\d+)m$/.exec(s);
		if (minMatch) {
			return parseInt(minMatch[1], 10) * 60_000;
		}
		throw new Error(`Unparseable cache duration: "${s}". Expected format like "30s" or "5m".`);
	}

	static buildKey(sourceKey: string, resolvedUrl: string): string {
		return `${sourceKey}:${resolvedUrl}`;
	}

	get(key: string): unknown {
		const entry = this.cache.get(key);
		if (!entry) {
			return null;
		}
		if (Date.now() - entry.fetchedAt >= entry.ttl) {
			this.cache.delete(key);
			return null;
		}
		return entry.data;
	}

	set(key: string, data: unknown, ttl: number): void {
		this.cache.set(key, { data, fetchedAt: Date.now(), ttl });
	}

	invalidate(key: string): void {
		this.cache.delete(key);
	}

	invalidateAll(keys: string[]): void {
		for (const key of keys) {
			this.cache.delete(key);
		}
	}

	invalidateSource(sourceKey: string): void {
		const prefix = `${sourceKey}:`;
		for (const cacheKey of this.cache.keys()) {
			if (cacheKey.startsWith(prefix)) {
				this.cache.delete(cacheKey);
			}
		}
	}
}

export function parsePollMs(poll: string): number {
	const secMatch = /^(\d+)s$/.exec(poll);
	if (secMatch) {
		return parseInt(secMatch[1], 10) * 1000;
	}
	const minMatch = /^(\d+)m$/.exec(poll);
	if (minMatch) {
		return parseInt(minMatch[1], 10) * 60_000;
	}
	throw new Error(`Unparseable poll interval: "${poll}". Expected format like "10s" or "1m".`);
}

export function resolveParamValue(
	value: string,
	ctx: Record<string, unknown>,
	loadedSourceData: Record<string, unknown>,
	searchParams?: URLSearchParams,
	routeParams?: Record<string, string>
): string {
	const ctxMatch = /^\$ctx\.(.+)$/.exec(value);
	if (ctxMatch) {
		const resolved = ctx[ctxMatch[1]];
		return resolved != null ? String(resolved) : '';
	}
	// $vars.x resolves from ctx['$vars']['x']
	const varsMatch = /^\$vars\.(.+)$/.exec(value);
	if (varsMatch) {
		const vars = ctx['$vars'] as Record<string, unknown> | undefined;
		const resolved = vars?.[varsMatch[1]!];
		return resolved != null ? String(resolved) : '';
	}
	const sourceMatch = /^\$source\.([^.]+)\.(.+)$/.exec(value);
	if (sourceMatch) {
		const [, sourceName, fieldPath] = sourceMatch;
		const sourceObj = loadedSourceData[sourceName];
		if (sourceObj == null) {
			return '';
		}
		// Support dot-path traversal, including array indices, e.g. "$source.files.0.id"
		const segments = fieldPath.split('.');
		let current: unknown = sourceObj;
		for (const segment of segments) {
			if (current == null) {
				return '';
			}
			if (Array.isArray(current)) {
				current = current[parseInt(segment, 10)];
			} else {
				current = (current as Record<string, unknown>)[segment];
			}
		}
		return current != null ? String(current) : '';
	}
	const urlParamMatch = /^\$urlParam\.(.+)$/.exec(value);
	if (urlParamMatch) {
		return searchParams?.get(urlParamMatch[1]!) ?? '';
	}
	const routeParamMatch = /^\$route\.(.+)$/.exec(value);
	if (routeParamMatch) {
		return routeParams?.[routeParamMatch[1]!] ?? '';
	}
	return value;
}

export function substituteUrlParams(url: string, params: Record<string, string>): string {
	return url.replace(/\{([^}]+)\}/g, (_, key: string) => params[key] ?? '');
}

export async function resolveAuthHeaders(
	getToken?: () => Promise<string | null>
): Promise<Record<string, string> | undefined> {
	if (!getToken) {
		return undefined;
	}
	const token = await getToken();
	if (!token) {
		return undefined;
	}
	return { Authorization: `Bearer ${token}` };
}

// Sources with $source.x.y params must load after x; loading out of order yields empty params.
export function topoSortSources(specs: Record<string, SourceSpec>): string[] {
	// Build adjacency: key → set of keys it depends on
	const deps: Record<string, Set<string>> = {};
	for (const [key, spec] of Object.entries(specs)) {
		deps[key] = new Set<string>();
		for (const paramValue of Object.values(spec.params ?? {})) {
			const match = /^\$source\.([^.]+)\./.exec(paramValue);
			if (match) {
				deps[key].add(match[1]);
			}
		}
	}

	const sorted: string[] = [];
	const visiting = new Set<string>();
	const visited = new Set<string>();

	function visit(key: string, chain: string[]) {
		if (visited.has(key)) {
			return;
		}
		if (visiting.has(key)) {
			throw new Error(`Circular $sources dependency: ${[...chain, key].join(' → ')}`);
		}
		visiting.add(key);
		for (const dep of deps[key]) {
			visit(dep, [...chain, key]);
		}
		visiting.delete(key);
		visited.add(key);
		sorted.push(key);
	}

	for (const key of Object.keys(specs)) {
		visit(key, []);
	}

	return sorted;
}

/**
 * Group sorted source keys into topological levels so that independent sources
 * can be fetched in parallel.
 *
 * Level 0 = no deps; Level 1 = depends only on level-0 sources; etc.
 * Circular dependencies are already caught by topoSortSources, so the
 * `level.length === 0` guard is a safety net only.
 */
export function topoLevels(keys: string[], deps: Record<string, string[]>): string[][] {
	const levels: string[][] = [];
	const placed = new Set<string>();
	let remaining = [...keys];
	while (remaining.length > 0) {
		const level = remaining.filter(sourceKey => (deps[sourceKey] ?? []).every(d => placed.has(d)));
		// Circular dependency - already caught by topoSort, but guard anyway
		if (level.length === 0) {
			break;
		}
		levels.push(level);
		level.forEach(sourceKey => placed.add(sourceKey));
		remaining = remaining.filter(sourceKey => !placed.has(sourceKey));
	}
	return levels;
}
