import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getErrorMessage } from '../errors.js';
import {
	SourceManager,
	normalizeSource,
	parsePollMs,
	resolveAuthHeaders,
	resolveParamValue,
	substituteUrlParams,
	topoLevels,
	topoSortSources,
} from './pageRunnerUtils.js';
import type { Fetcher, PageSpec, SourceSpec } from './pageRunnerUtils.js';

export function useSourceLoader(params: {
	$sources: PageSpec['$sources'];
	searchParams: URLSearchParams;
	routeParams?: Record<string, string>;
	getToken?: () => Promise<string | null>;
	fetcher: Fetcher;
}): {
	sourceData: Record<string, unknown>;
	loading: boolean;
	isRefreshing: boolean;
	loadSources: (
		isPolled?: boolean,
		currentCtx?: Record<string, unknown>,
		keysToLoad?: Set<string>,
		bypassCache?: boolean,
		currentSearchParams?: URLSearchParams
	) => Promise<void>;
	mountedRef: React.RefObject<boolean>;
	invalidateSourceCache: (sourceKey: string) => void;
} {
	const { $sources, searchParams, routeParams, getToken, fetcher } = params;

	const sourceKeys = useMemo(() => Object.keys($sources ?? {}), [$sources]);

	const [sourceData, setSourceData] = useState<Record<string, unknown>>({});
	const [loading, setLoading] = useState(sourceKeys.length > 0);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const searchParamsRef = useRef(searchParams);
	useEffect(() => {
		searchParamsRef.current = searchParams;
	}, [searchParams]);

	const routeParamsRef = useRef(routeParams);
	useEffect(() => {
		routeParamsRef.current = routeParams;
	}, [routeParams]);

	// One SourceManager instance per page mount - survives re-renders, reset on unmount.
	const sourceManagerRef = useRef<SourceManager>(null!);
	if (sourceManagerRef.current === null) {
		sourceManagerRef.current = new SourceManager();
	}

	const loadSources = useCallback(
		async (
			isPolled = false,
			currentCtx: Record<string, unknown> = {},
			keysToLoad?: Set<string>,
			bypassCache = false,
			currentSearchParams?: URLSearchParams
		) => {
			if (!$sources) {
				return;
			}

			const activeSearchParams = currentSearchParams ?? searchParamsRef.current;

			const normalizedSpecs: Record<string, SourceSpec> = {};
			for (const [key, raw] of Object.entries($sources)) {
				normalizedSpecs[key] = normalizeSource(raw);
			}

			const specsToLoad = keysToLoad
				? Object.fromEntries(Object.entries(normalizedSpecs).filter(([sourceKey]) => keysToLoad.has(sourceKey)))
				: normalizedSpecs;

			const sortedKeys = topoSortSources(specsToLoad);

			if (isPolled) {
				setIsRefreshing(true);
			} else {
				setLoading(true);
			}

			try {
				const depsMap: Record<string, string[]> = {};
				for (const [key, spec] of Object.entries(specsToLoad)) {
					depsMap[key] = [];
					for (const paramValue of Object.values(spec.params ?? {})) {
						const match = /^\$source\.([^.]+)\./.exec(paramValue);
						if (match) {
							depsMap[key].push(match[1]);
						}
					}
				}

				// We accumulate resolved data as we go so dependent sources can read earlier ones.
				// Sources within the same level have no cross-dependencies and load in parallel.
				const accumulated: Record<string, unknown> = {};

				const levels = topoLevels(sortedKeys, depsMap);
				for (const level of levels) {
					await Promise.all(
						level.map(async key => {
							const spec = specsToLoad[key];

							let resolvedUrl = spec.url;
							if (spec.params && Object.keys(spec.params).length > 0) {
								const resolvedParams: Record<string, string> = {};
								for (const [paramKey, paramValue] of Object.entries(spec.params)) {
									resolvedParams[paramKey] = resolveParamValue(
										paramValue,
										currentCtx,
										accumulated,
										activeSearchParams,
										routeParamsRef.current
									);
								}
								resolvedUrl = substituteUrlParams(spec.url, resolvedParams);
								// Skip this source if any path placeholder resolved to empty - avoids malformed URLs
								const pathPlaceholders = [...spec.url.matchAll(/\{([^}]+)\}/g)].map(match => match[1]!);
								if (pathPlaceholders.some(p => !resolvedParams[p])) {
									return;
								}
								// Append params that weren't consumed as path placeholders as query string
								const usedInPath = new Set(pathPlaceholders);
								const queryParams = Object.entries(resolvedParams)
									.filter(([paramName, paramValue]) => !usedInPath.has(paramName) && paramValue !== '')
									.map(([paramName, paramValue]) => `${encodeURIComponent(paramName)}=${encodeURIComponent(paramValue)}`);
								if (queryParams.length > 0) {
									resolvedUrl = resolvedUrl + '?' + queryParams.join('&');
								}
							}

							const cacheKey = SourceManager.buildKey(key, resolvedUrl);
							const sm = sourceManagerRef.current;

							// Poll ticks always bypass cache; otherwise check TTL.
							if (!bypassCache && !isPolled && spec.cache) {
								const cached = sm.get(cacheKey);
								if (cached !== null) {
									accumulated[key] = cached;
									return;
								}
							}

							const authHeaders = await resolveAuthHeaders(getToken);
							const data = await fetcher(resolvedUrl, undefined, undefined, authHeaders);
							// mountedRef check: abort storing results if component unmounted mid-flight
							if (!mountedRef.current) {
								return;
							}

							// Populate cache if a TTL is configured and this is not a poll tick.
							if (!isPolled && spec.cache) {
								try {
									const ttl = sm.parseDuration(spec.cache as string);
									sm.set(cacheKey, data, ttl);
								} catch (err) {
									console.error('[SourceManager]', getErrorMessage(err));
								}
							}

							accumulated[key] = data;
						})
					);
					// If the component unmounted while this level was in-flight, bail out early.
					if (!mountedRef.current) {
						return;
					}
				}

				if (!mountedRef.current) {
					return;
				}

				// Partial reload (keysToLoad set): merge into existing state to preserve sources not reloaded
				if (keysToLoad) {
					setSourceData(prev => ({ ...prev, ...accumulated }));
				} else {
					setSourceData(accumulated);
				}
			} finally {
				if (mountedRef.current) {
					if (isPolled) {
						setIsRefreshing(false);
					} else {
						setLoading(false);
					}
				}
			}
		},
		[$sources, getToken, fetcher]
	);

	// Initial load — catch errors so the rejection is handled and loading resets to false
	useEffect(() => {
		void loadSources(false, {}).catch(err => {
			console.error('[useSourceLoader] initial load failed:', getErrorMessage(err));
		});
	}, [loadSources]);

	useEffect(() => {
		if (!$sources) {
			return;
		}

		const intervals: ReturnType<typeof setInterval>[] = [];

		for (const [, raw] of Object.entries($sources)) {
			const spec = normalizeSource(raw);
			if (!spec.poll) {
				continue;
			}

			let intervalMs: number;
			try {
				intervalMs = parsePollMs(spec.poll);
			} catch (err) {
				console.error(getErrorMessage(err));
				continue;
			}

			// Skip polling if pollWhen condition is falsy
			if (spec.pollWhen) {
				const urlParamMatch = /^\$urlParam\.(.+)$/.exec(spec.pollWhen);
				if (urlParamMatch) {
					const val = searchParams.get(urlParamMatch[1]!);
					if (!val || val === '0' || val === 'false') {
						continue;
					}
				}
			}

			// Re-load ALL sources on each tick so dependent sources stay consistent.
			// bypassCache=true: poll implies fresh data - never return a stale cached value.
			// We pass an empty ctx snapshot here; for richer $ctx support during polls
			// a ref to the live ctx could be passed instead.
			const id = setInterval(() => {
				void loadSources(true, {}, undefined, true);
			}, intervalMs);
			intervals.push(id);
		}

		return () => {
			for (const id of intervals) {
				clearInterval(id);
			}
		};
	}, [$sources, loadSources, searchParams]);

	const normalizedSpecsForFilter = useMemo(() => {
		if (!$sources) {
			return {};
		}
		const result: Record<string, SourceSpec> = {};
		for (const [key, raw] of Object.entries($sources)) {
			result[key] = normalizeSource(raw);
		}
		return result;
	}, [$sources]);

	const urlParamDependentSources = useMemo(() => {
		const deps = new Set<string>();
		for (const [key, spec] of Object.entries(normalizedSpecsForFilter)) {
			const paramValues = Object.values(spec.params ?? {});
			if (paramValues.some(paramValue =>
				typeof paramValue === 'string' &&
				(paramValue.startsWith('$urlParam.') || paramValue.startsWith('$route.'))
			)) {
				deps.add(key);
			}
		}
		return deps;
	}, [normalizedSpecsForFilter]);

	const isFirstRenderUrlParam = useRef(true);
	useEffect(() => {
		if (isFirstRenderUrlParam.current) {
			isFirstRenderUrlParam.current = false;
			return;
		}
		if (urlParamDependentSources.size === 0) {
			return;
		}
		void loadSources(true, {}, urlParamDependentSources);
	// routeParams is a new object each render from useParams - stringify to stabilize comparison
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams, JSON.stringify(routeParams), urlParamDependentSources, loadSources]);

	const invalidateSourceCache = useCallback((sourceKey: string) => {
		sourceManagerRef.current.invalidateSource(sourceKey);
	}, []);

	return { sourceData, loading, isRefreshing, loadSources, mountedRef, invalidateSourceCache };
}
