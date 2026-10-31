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
import { toSourceError } from './loadFailureNotice.js';
import type { LoadFailureTrigger, SourceError } from './loadFailureNotice.js';

export function useSourceLoader(params: {
	$sources: PageSpec['$sources'];
	searchParams: URLSearchParams;
	routeParams?: Record<string, string>;
	getToken?: () => Promise<string | null>;
	fetcher: Fetcher;
	/**
	 * Called when a load fails (initial, poll or a URL-param refetch), once per distinct message until a load
	 * succeeds again, so a failing poll does not repeat the same notification every tick. `source` is the first
	 * source whose request failed in that load, when known.
	 */
	onLoadError?: (error: unknown, info: { source: string | undefined; trigger: LoadFailureTrigger }) => void;
}): {
	sourceData: Record<string, unknown>;
	/** Sources whose latest load failed, until a later load of that source succeeds. A failed source is also absent from `sourceData`. */
	sourceErrors: Record<string, SourceError>;
	/** The source whose request failed first in the load that rejected with `error`; `undefined` for any other error. */
	sourceOfFailure: (error: unknown) => string | undefined;
	loading: boolean;
	/** True only until the first non-polled load has finished (success or failure): no data yet, as opposed to a refetch that keeps the previous data. */
	initialLoading: boolean;
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
	const { $sources, searchParams, routeParams, getToken, fetcher, onLoadError } = params;

	const sourceKeys = useMemo(() => Object.keys($sources ?? {}), [$sources]);

	const [sourceData, setSourceData] = useState<Record<string, unknown>>({});
	const [loading, setLoading] = useState(sourceKeys.length > 0);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [loadedOnce, setLoadedOnce] = useState(sourceKeys.length === 0);

	const onLoadErrorRef = useRef(onLoadError);
	useEffect(() => {
		onLoadErrorRef.current = onLoadError;
	}, [onLoadError]);
	const lastReportedErrorRef = useRef<string | null>(null);
	// The failing source of the most recent rejected load, kept with its error so a caller holding only the error can name it.
	const lastFailureRef = useRef<{ error: unknown; source: string } | null>(null);
	const sourceOfFailure = useCallback((error: unknown): string | undefined => {
		const last = lastFailureRef.current;
		return last !== null && last.error === error ? last.source : undefined;
	}, []);
	const [sourceErrors, setSourceErrors] = useState<Record<string, SourceError>>({});
	const reportLoadError = useCallback(
		(err: unknown, trigger: LoadFailureTrigger) => {
			const message = getErrorMessage(err);
			console.error('[useSourceLoader] load failed:', message);
			if (lastReportedErrorRef.current === message) {
				return;
			}
			lastReportedErrorRef.current = message;
			onLoadErrorRef.current?.(err, { source: sourceOfFailure(err), trigger });
		},
		[sourceOfFailure]
	);

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

	// Loads can overlap (a filter typed twice, a poll tick during a reload) and responses can arrive out of order.
	// Each load stamps the sources it fetches; a response is applied only for the sources it still owns, so a slow
	// older answer never replaces a newer one.
	const loadSeqRef = useRef(0);
	const latestLoadBySourceRef = useRef<Record<string, number>>({});
	// `loading` / `isRefreshing` stay on until the LAST overlapping load of their kind settles.
	const pendingLoadsRef = useRef(0);
	const pendingPollsRef = useRef(0);

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

			const loadSeq = ++loadSeqRef.current;
			// The first request to fail in this load (the one the rejection carries).
			let firstFailure: { error: unknown; source: string } | null = null;
			for (const key of Object.keys(specsToLoad)) {
				latestLoadBySourceRef.current[key] = loadSeq;
			}

			if (isPolled) {
				pendingPollsRef.current += 1;
				setIsRefreshing(true);
			} else {
				pendingLoadsRef.current += 1;
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
						level.map(key => (async () => {
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
								const emptyPlaceholders = pathPlaceholders.filter(p => !resolvedParams[p]);
								if (emptyPlaceholders.length > 0) {
									console.warn(
										`[useSourceLoader] Skipping source "${key}" (${spec.url}): path placeholder(s) ${emptyPlaceholders.map(p => `"${p}"`).join(', ')} resolved to empty.`
									);
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
						})().catch((error: unknown) => {
							firstFailure ??= { error, source: key };
							// A newer load owns this source: its answer decides, a stale failure must not mark it.
							if (mountedRef.current && latestLoadBySourceRef.current[key] === loadSeq) {
								const failed = toSourceError(error);
								setSourceErrors(prev => {
									const before = prev[key];
									return before !== undefined && before.message === failed.message && before.status === failed.status ? prev : { ...prev, [key]: failed };
								});
							}
							throw error;
						}))
					);
					// If the component unmounted while this level was in-flight, bail out early.
					if (!mountedRef.current) {
						return;
					}
				}

				if (!mountedRef.current) {
					return;
				}

				// A newer load started for some of these sources while this one was in flight: its answer wins, ours is stale.
				const supersededKeys = new Set(Object.keys(specsToLoad).filter(key => latestLoadBySourceRef.current[key] !== loadSeq));
				const current = Object.fromEntries(Object.entries(accumulated).filter(([key]) => !supersededKeys.has(key)));
				// Partial reload (keysToLoad set): merge into existing state to preserve sources not reloaded
				if (keysToLoad) {
					setSourceData(prev => ({ ...prev, ...current }));
				} else {
					// Full load replaces the state, but a source a newer load owns keeps whatever is stored for it.
					setSourceData(prev => {
						const next = { ...current };
						for (const key of supersededKeys) {
							if (key in prev) {
								next[key] = prev[key];
							}
						}
						return next;
					});
				}
				// Sources that answered are healthy again.
				const healthy = Object.keys(current);
				setSourceErrors(prev => {
					if (!healthy.some(key => key in prev)) {
						return prev;
					}
					const next = { ...prev };
					for (const key of healthy) {
						delete next[key];
					}
					return next;
				});
				lastReportedErrorRef.current = null;
			} catch (error) {
				if (firstFailure !== null && (firstFailure as { error: unknown }).error === error) {
					lastFailureRef.current = firstFailure;
				}
				throw error;
			} finally {
				if (isPolled) {
					pendingPollsRef.current -= 1;
				} else {
					pendingLoadsRef.current -= 1;
				}
				if (mountedRef.current) {
					if (isPolled) {
						if (pendingPollsRef.current === 0) {
							setIsRefreshing(false);
						}
					} else if (pendingLoadsRef.current === 0) {
						setLoading(false);
						setLoadedOnce(true);
					}
				}
			}
		},
		[$sources, getToken, fetcher]
	);

	// Initial load - catch errors so the rejection is handled and loading resets to false
	useEffect(() => {
		void loadSources(false, {}).catch(error => reportLoadError(error, 'initial'));
	}, [loadSources, reportLoadError]);

	useEffect(() => {
		if (!$sources) {
			return;
		}

		const pollMs: number[] = [];

		for (const [key, raw] of Object.entries($sources)) {
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
				} else {
					// Only `$urlParam.<name>` can be evaluated here. Polling anyway keeps the previous behaviour, but never silently:
					// the author wrote a condition that is not being applied.
					console.error(
						`[useSourceLoader] Source "${key}": pollWhen "${spec.pollWhen}" is not supported, the condition is ignored and the source polls ` +
							'unconditionally. Use "$urlParam.<name>" (polls while that query param is truthy).'
					);
				}
			}

			pollMs.push(intervalMs);
		}

		if (pollMs.length === 0) {
			return;
		}

		// Re-load ALL sources on each tick so dependent sources stay consistent.
		// bypassCache=true: poll implies fresh data - never return a stale cached value.
		// We pass an empty ctx snapshot here; for richer $ctx support during polls
		// a ref to the live ctx could be passed instead.
		const tick = () => {
			void loadSources(true, {}, undefined, true).catch(error => reportLoadError(error, 'poll'));
		};

		let intervals: ReturnType<typeof setInterval>[] = [];
		const startTimers = () => {
			intervals = pollMs.map(ms => setInterval(tick, ms));
		};
		const stopTimers = () => {
			for (const id of intervals) {
				clearInterval(id);
			}
			intervals = [];
		};

		// A hidden tab polls nothing: the timers stop, and on return one reload brings the data up to date
		// before they resume. One reload covers every polled source, since a tick reloads them all. State is
		// per page runner (this effect), never global.
		const onVisibilityChange = () => {
			stopTimers();
			if (!document.hidden) {
				tick();
				startTimers();
			}
		};

		if (!document.hidden) {
			startTimers();
		}
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			stopTimers();
		};
	}, [$sources, loadSources, searchParams, reportLoadError]);

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
		void loadSources(true, {}, urlParamDependentSources).catch(error => reportLoadError(error, 'params'));
	// routeParams is a new object each render from useParams - stringify to stabilize comparison
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams, JSON.stringify(routeParams), urlParamDependentSources, loadSources, reportLoadError]);

	const invalidateSourceCache = useCallback((sourceKey: string) => {
		sourceManagerRef.current.invalidateSource(sourceKey);
	}, []);

	return { sourceData, sourceErrors, sourceOfFailure, loading, initialLoading: loading && !loadedOnce, isRefreshing, loadSources, mountedRef, invalidateSourceCache };
}
