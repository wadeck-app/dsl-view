import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getErrorMessage } from '../errors.js';
import { collectRowUrlParams, normalizeAction, resolveAuthHeaders, substituteUrlParams } from './pageRunnerUtils.js';
import type { ActionErrorInfo, Fetcher, PageSpec } from './pageRunnerUtils.js';

export function useActionHandlers(params: {
	/** Called when a row or batch action fails (HTTP error, missing URL placeholder...). */
	onActionError?: (error: Error, info: ActionErrorInfo) => void;
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
	const { $actions, invalidateSourceCache, mountedRef, routeParams, searchParams, getToken, fetcher, loadSources, onActionError } = params;

	const routeParamsRef = useRef(routeParams);
	useEffect(() => {
		routeParamsRef.current = routeParams;
	}, [routeParams]);
	const searchParamsRef = useRef(searchParams);
	useEffect(() => {
		searchParamsRef.current = searchParams;
	}, [searchParams]);

	const [extras, setExtras] = useState<Record<string, unknown>>({});

	const onActionErrorRef = useRef(onActionError);
	useEffect(() => {
		onActionErrorRef.current = onActionError;
	}, [onActionError]);

	// Row and batch actions are fired from a click handler that does not await them, so a rejection
	// would only surface as an unhandledrejection nobody sees. Report it instead: to the host hook
	// when given (e.g. to show a toast), always to the console with the action name.
	const reportActionError = useCallback((actionName: string, kind: ActionErrorInfo['kind'], error: unknown) => {
		const err = error instanceof Error ? error : new Error(String(error));
		console.error(`[GenericPageRunner] ${kind} action "${actionName}" failed: ${getErrorMessage(err)}`);
		onActionErrorRef.current?.(err, { action: actionName, kind });
	}, []);

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
			try {
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
				// {key} placeholders come from the clicked row first, then route params, then URL search params.
				// Resolved here (not left to the host fetcher) so every host gets the same behaviour.
				const urlParams = collectRowUrlParams(row, routeParamsRef.current, searchParamsRef.current);
				const resolvedUrl = substituteUrlParams(spec.url, urlParams, {
					encode: true,
					onMissing: key => {
						throw new Error(
							`[onAction] action "${actionName}": URL placeholder {${key}} has no value in "${spec.url}" ` +
								`(row keys: ${Object.keys(row).join(', ') || 'none'}; route params: ${Object.keys(routeParamsRef.current ?? {}).join(', ') || 'none'}). ` +
								`Use a field that exists in the row, or fix the placeholder in $actions.${actionName}.url`
						);
					},
				});
				const authHeaders = await resolveAuthHeaders(getToken);
				await fetcher(resolvedUrl, { id }, undefined, authHeaders);
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
			} catch (error) {
				reportActionError(actionName, 'row', error);
			}
		},
		[$actions, fetcher, getToken, invalidateSourceCache, loadSources, mountedRef, reportActionError]
	);

	const onBatchAction = useCallback(
		async (actionName: string, rows: unknown[]) => {
			try {
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
			} catch (error) {
				reportActionError(actionName, 'batch', error);
			}
		},
		[$actions, fetcher, getToken, loadSources, reportActionError]
	);

	return { namedHandlers, onAction, onBatchAction, extras };
}
