import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { normalizeAction, resolveAuthHeaders, substituteUrlParams } from './pageRunnerUtils.js';
import type { Fetcher, PageSpec } from './pageRunnerUtils.js';

export function useActionHandlers(params: {
	$actions: PageSpec['$actions'];
	invalidateSourceCache: (sourceKey: string) => void;
	mountedRef: React.RefObject<boolean>;
	routeParams?: Record<string, string>;
	searchParams?: URLSearchParams;
	getToken?: () => Promise<string | null>;
	fetcher: Fetcher;
	loadSources: (
		isPolled?: boolean,
		currentCtx?: Record<string, unknown>,
		keysToLoad?: Set<string>,
		bypassCache?: boolean,
		currentSearchParams?: URLSearchParams
	) => Promise<void>;
}): {
	namedHandlers: Record<string, (extraBody?: Record<string, unknown>) => Promise<unknown>>;
	onAction: (actionName: string, row: Record<string, unknown>) => Promise<void>;
	onBatchAction: (actionName: string, rows: Record<string, unknown>[]) => Promise<void>;
	extras: Record<string, unknown>;
} {
	const { $actions, invalidateSourceCache, mountedRef, routeParams, searchParams, getToken, fetcher, loadSources } = params;

	const routeParamsRef = useRef(routeParams);
	useEffect(() => {
		routeParamsRef.current = routeParams;
	}, [routeParams]);
	const searchParamsRef = useRef(searchParams);
	useEffect(() => {
		searchParamsRef.current = searchParams;
	}, [searchParams]);

	const [extras, setExtras] = useState<Record<string, unknown>>({});

	const namedHandlers = useMemo(() => {
		const handlers: Record<string, (extraBody?: Record<string, unknown>) => Promise<unknown>> = {};
		for (const [name, rawSpec] of Object.entries($actions ?? {})) {
			const spec = normalizeAction(rawSpec);
			handlers[name] = async (extraBody?: Record<string, unknown>) => {
				if (spec.confirm && !window.confirm(spec.confirm)) {
					return;
				}
				const authHeaders = await resolveAuthHeaders(getToken);
				const body = extraBody && Object.keys(extraBody).length > 0 ? extraBody : undefined;
				let result: unknown;
				if (spec.url) {
					// Resolve {param} placeholders in URL from route params, URL search params, and extraBody
					const currentRouteParams = routeParamsRef.current ?? {};
					const currentSearchParams = searchParamsRef.current;
					const allParams: Record<string, string> = { ...currentRouteParams };
					if (currentSearchParams) {
						for (const [k, v] of currentSearchParams.entries()) {
							if (!(k in allParams)) allParams[k] = v;
						}
					}
					if (extraBody) {
						for (const [k, v] of Object.entries(extraBody)) {
							if (!(k in allParams) && v != null) allParams[k] = String(v);
						}
					}
					const resolvedUrl = substituteUrlParams(spec.url, allParams);
					result = await fetcher(resolvedUrl, undefined, body, authHeaders);
					if (spec.resultKey && mountedRef.current) {
						setExtras(prev => ({
							...prev,
							[spec.resultKey!]: (result as Record<string, unknown>)?.[spec.resultKey!] ?? result,
						}));
					}
				} else if (spec.resultKey) {
					// No-URL action: store extraBody (or a timestamp sentinel) in extras under resultKey
					result = extraBody ?? { _ts: Date.now() };
					if (mountedRef.current) {
						setExtras(prev => ({ ...prev, [spec.resultKey!]: result }));
					}
				}
				if (spec.reloadSources) {
					if (Array.isArray(spec.reloadSources)) {
						for (const sourceKey of spec.reloadSources) {
							invalidateSourceCache(sourceKey);
						}
						await loadSources(false, {}, new Set(spec.reloadSources));
					} else {
						await loadSources(false, {});
					}
				}
				return result;
			};
		}
		return handlers;
	}, [$actions, fetcher, getToken, invalidateSourceCache, loadSources, mountedRef]);

	const onAction = useCallback(
		async (actionName: string, row: Record<string, unknown>) => {
			const rawSpec = $actions?.[actionName];
			if (!rawSpec) {
				throw new Error(`[onAction] No action spec found for "${actionName}" - check $actions in YAML`);
			}
			const spec = normalizeAction(rawSpec);
			if (!spec.url) {
				// No-URL row action: store the row under resultKey (e.g. openEdit stores the selected row)
				if (spec.resultKey && mountedRef.current) {
					setExtras(prev => ({ ...prev, [spec.resultKey!]: row }));
				}
				return;
			}
			if (spec.confirm && !window.confirm(spec.confirm)) {
				return;
			}
			const id = String(row['id'] ?? '');
			const authHeaders = await resolveAuthHeaders(getToken);
			await fetcher(spec.url, { id }, undefined, authHeaders);
			if (spec.reloadSources) {
				if (Array.isArray(spec.reloadSources)) {
					for (const sourceKey of spec.reloadSources) {
						invalidateSourceCache(sourceKey);
					}
					await loadSources(false, {}, new Set(spec.reloadSources));
				} else {
					await loadSources(false, {});
				}
			} else {
				await loadSources(false, {});
			}
		},
		[$actions, fetcher, getToken, invalidateSourceCache, loadSources, mountedRef]
	);

	const onBatchAction = useCallback(
		async (actionName: string, rows: unknown[]) => {
			const rawSpec = $actions?.[actionName];
			if (!rawSpec) {
				console.warn(`[GenericPageRunner] No action spec found for "${actionName}" - check $actions in YAML`);
				return;
			}
			const spec = normalizeAction(rawSpec);
			if (!spec.url) {
				console.warn(`[GenericPageRunner] Batch action "${actionName}" has no url - skipping fetcher`);
				return;
			}
			// Strip {id} placeholder from batch URL (batch sends ids in body)
			const batchUrl = spec.url.replace(/\{[^}]+\}/g, '').replace(/\/+$/, '');
			const ids = rows.map(r => (r as Record<string, unknown>)['id']);
			const authHeaders = await resolveAuthHeaders(getToken);
			await fetcher(batchUrl, undefined, { ids }, authHeaders);
			await loadSources(false, {});
		},
		[$actions, fetcher, getToken, loadSources]
	);

	return { namedHandlers, onAction, onBatchAction, extras };
}
