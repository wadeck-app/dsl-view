import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { KNOWN_ACTION_KEYS } from '../dslKeys.js';
import { getErrorMessage } from '../errors.js';
import type { Notify } from '../notifier.js';
import { collectRowUrlParams, normalizeAction, notifyFailure, notifySuccess, plainActionPayload, resolveAuthHeaders, substituteUrlParams } from './pageRunnerUtils.js';
import type { ActionErrorInfo, ActionSpec, Fetcher, PageSpec } from './pageRunnerUtils.js';

// Row key recorded in `actionPendingRows` for a batch action: it covers every row.
export const BATCH_ROW_KEY = '*';

export function useActionHandlers(params: {
	/** Where success/failure feedback goes: the host's notifier, or the runner's inline banner. */
	notify: Notify;
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
	namedHandlers: Record<string, (payload?: unknown) => Promise<unknown>>;
	onAction: (actionName: string, row: Record<string, unknown>) => Promise<void>;
	onBatchAction: (actionName: string, rows: Record<string, unknown>[]) => Promise<void>;
	extras: Record<string, unknown>;
	/** `<actionName>: true` while at least one call of that action is in flight. Exposed to YAML as `$ctx.$actionPending.<name>`. */
	actionPending: Record<string, boolean>;
	/**
	 * Row ids with a call in flight, by action name (a row action: its row id; a batch action: `*`, meaning every row).
	 * Exposed to YAML as `$ctx.$actionPendingRows.<name>`; an action with no call in flight has no entry.
	 */
	actionPendingRows: Record<string, string[]>;
} {
	const { $actions, invalidateSourceCache, mountedRef, routeParams, searchParams, getToken, fetcher, loadSources, onActionError, notify } = params;

	const routeParamsRef = useRef(routeParams);
	useEffect(() => {
		routeParamsRef.current = routeParams;
	}, [routeParams]);
	const searchParamsRef = useRef(searchParams);
	useEffect(() => {
		searchParamsRef.current = searchParams;
	}, [searchParams]);

	const [extras, setExtras] = useState<Record<string, unknown>>({});
	// Lenient-mode (no strictParams) empty placeholders warn once per action+key, not on every click.
	const lenientWarnedRef = useRef(new Set<string>());

	const onActionErrorRef = useRef(onActionError);
	useEffect(() => {
		onActionErrorRef.current = onActionError;
	}, [onActionError]);

	// One feedback path for every action (named handlers, row, batch): the host sees the same Notification shape.
	const notifyRef = useRef(notify);
	useEffect(() => {
		notifyRef.current = notify;
	}, [notify]);

	// Double-submit guard + pending flags. Keyed per call target (row actions: action + row id) so two different
	// rows can run in parallel but the same one cannot be fired twice.
	const inFlightRef = useRef(new Set<string>());
	const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
	const [pendingRows, setPendingRows] = useState<Record<string, string[]>>({});
	const begin = useCallback(
		(actionName: string, flightKey: string, rowKey?: string): boolean => {
			if (inFlightRef.current.has(flightKey)) {
				console.warn(`[GenericPageRunner] action "${actionName}" is already running - ignoring the repeated call`);
				return false;
			}
			inFlightRef.current.add(flightKey);
			if (mountedRef.current) {
				setPendingCounts(prev => ({ ...prev, [actionName]: (prev[actionName] ?? 0) + 1 }));
				if (rowKey !== undefined) {
					setPendingRows(prev => ({ ...prev, [actionName]: [...(prev[actionName] ?? []), rowKey] }));
				}
			}
			return true;
		},
		[mountedRef]
	);
	const end = useCallback(
		(actionName: string, flightKey: string, rowKey?: string) => {
			inFlightRef.current.delete(flightKey);
			if (mountedRef.current) {
				setPendingCounts(prev => ({ ...prev, [actionName]: Math.max(0, (prev[actionName] ?? 1) - 1) }));
				if (rowKey !== undefined) {
					setPendingRows(prev => {
						// Remove one occurrence only: the same key can be listed twice if two calls ever overlap.
						const remaining = [...(prev[actionName] ?? [])];
						const at = remaining.indexOf(rowKey);
						if (at !== -1) {
							remaining.splice(at, 1);
						}
						const others = { ...prev };
						delete others[actionName];
						return remaining.length > 0 ? { ...others, [actionName]: remaining } : others;
					});
				}
			}
		},
		[mountedRef]
	);
	const actionPending = useMemo(() => {
		const flags: Record<string, boolean> = {};
		for (const [name, count] of Object.entries(pendingCounts)) {
			flags[name] = count > 0;
		}
		return flags;
	}, [pendingCounts]);

	// A typo in an action key (e.g. sucessMessage) would silently fall back to the default behaviour. The same
	// check runs at compile time (findUnknownKeys); this covers pages run from raw YAML.
	useEffect(() => {
		for (const [name, rawSpec] of Object.entries($actions ?? {})) {
			if (typeof rawSpec !== 'object' || rawSpec === null) {
				continue;
			}
			for (const key of Object.keys(rawSpec)) {
				if (!(KNOWN_ACTION_KEYS as readonly string[]).includes(key)) {
					console.error(`[GenericPageRunner] $actions.${name}: unknown action key "${key}". Known keys: ${KNOWN_ACTION_KEYS.join(', ')}`);
				}
			}
		}
	}, [$actions]);

	// Row and batch actions are fired from a click handler that does not await them, so a rejection
	// would only surface as an unhandledrejection nobody sees. Report it instead: to the notifier, to the host hook
	// when given (e.g. to show a toast), always to the console with the action name.
	const reportActionError = useCallback((actionName: string, kind: ActionErrorInfo['kind'], error: unknown, spec?: ActionSpec) => {
		const err = error instanceof Error ? error : new Error(String(error));
		console.error(`[GenericPageRunner] ${kind} action "${actionName}" failed: ${getErrorMessage(err)}`);
		notifyFailure(notifyRef.current, actionName, spec, err);
		onActionErrorRef.current?.(err, { action: actionName, kind });
	}, []);

	// Refetch after an action. The cache is bypassed on purpose: the action just changed server data, so serving a
	// source from its TTL cache would keep showing the rows the user just changed.
	// `reloadSources`: a list reloads only those sources, `true` reloads all. Unset: `reloadAllWhenUnset` decides
	// (row and batch actions reload everything, a named form handler reloads nothing).
	const reloadAfterAction = useCallback(
		async (reloadSources: ActionSpec['reloadSources'], reloadAllWhenUnset: boolean) => {
			if (Array.isArray(reloadSources)) {
				for (const sourceKey of reloadSources) {
					invalidateSourceCache(sourceKey);
				}
				await loadSources(false, {}, new Set(reloadSources), true);
				return;
			}
			if (reloadSources || reloadAllWhenUnset) {
				await loadSources(false, {}, undefined, true);
			}
		},
		[invalidateSourceCache, loadSources]
	);

	const namedHandlers = useMemo(() => {
		const handlers: Record<string, (payload?: unknown) => Promise<unknown>> = {};
		for (const [name, rawSpec] of Object.entries($actions ?? {})) {
			const spec = normalizeAction(rawSpec);
			handlers[name] = async (payload?: unknown) => {
				// A button click hands over its event: only a plain object counts as data.
				const extraBody = plainActionPayload(payload);
				if (!begin(name, name)) {
					return undefined;
				}
				try {
					if (spec.confirm && !window.confirm(spec.confirm)) {
						return undefined;
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
								if (!(k in allParams)) {
									allParams[k] = v;
								}
							}
						}
						if (extraBody) {
							for (const [k, v] of Object.entries(extraBody)) {
								if (!(k in allParams) && v != null) {
									allParams[k] = String(v);
								}
							}
						}
						const resolvedUrl = substituteUrlParams(spec.url, allParams, {
								encode: spec.strictParams === true,
								onMissing: key => {
									if (spec.strictParams) {
										throw new Error(
											`[$ctx.${name}] URL placeholder {${key}} has no value in "${spec.url}" ` +
												`(available: ${Object.keys(allParams).join(', ') || 'none'}). ` +
												`Pass it in the form data, the route or the query string, or fix $actions.${name}.url`
										);
									}
									// Lenient legacy mode: an empty value is still sent, but never silently.
									const warnKey = `${name}:${key}`;
									if (!lenientWarnedRef.current.has(warnKey)) {
										lenientWarnedRef.current.add(warnKey);
										console.warn(
											`[GenericPageRunner] $actions.${name}: URL placeholder {${key}} has no value, substituting an empty string. ` +
												`Set "strictParams: true" on the action to fail before the request instead.`
										);
									}
									return '';
								},
							});
						result = await fetcher(resolvedUrl, undefined, body, authHeaders);
						notifySuccess(notifyRef.current, name, spec, result);
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
					await reloadAfterAction(spec.reloadSources, false);
					return result;
				} catch (error) {
					// Rethrown: a form keeps its values and a caller can still react to the rejection.
					notifyFailure(notifyRef.current, name, spec, error);
					throw error;
				} finally {
					end(name, name);
				}
			};
		}
		return handlers;
	}, [$actions, fetcher, getToken, reloadAfterAction, mountedRef, begin, end]);

	const onAction = useCallback(
		async (actionName: string, row: Record<string, unknown>) => {
			let spec: ActionSpec | undefined;
			let flightKey: string | undefined;
			let rowKey: string | undefined;
			try {
				const rawSpec = $actions?.[actionName];
				if (!rawSpec) {
					throw new Error(`[onAction] No action spec found for "${actionName}" - check $actions in YAML`);
				}
				spec = normalizeAction(rawSpec);
				if (!spec.url) {
					// No-URL row action: store the row under resultKey (e.g. openEdit stores the selected row)
					if (spec.resultKey && mountedRef.current) {
						setExtras(prev => ({ ...prev, [spec!.resultKey!]: row }));
					}
					return;
				}
				const id = String(row['id'] ?? '');
				flightKey = `${actionName}:${id}`;
				if (!begin(actionName, flightKey, id)) {
					flightKey = undefined;
					return;
				}
				rowKey = id;
				if (spec.confirm && !window.confirm(spec.confirm)) {
					return;
				}
				// {key} placeholders come from the clicked row first, then route params, then URL search params.
				// Resolved here (not left to the host fetcher) so every host gets the same behaviour.
				const urlParams = collectRowUrlParams(row, routeParamsRef.current, searchParamsRef.current);
				const resolvedUrl = substituteUrlParams(spec.url, urlParams, {
					encode: true,
					onMissing: key => {
						throw new Error(
							`[onAction] action "${actionName}": URL placeholder {${key}} has no value in "${spec!.url}" ` +
								`(row keys: ${Object.keys(row).join(', ') || 'none'}; route params: ${Object.keys(routeParamsRef.current ?? {}).join(', ') || 'none'}). ` +
								`Use a field that exists in the row, or fix the placeholder in $actions.${actionName}.url`
						);
					},
				});
				const authHeaders = await resolveAuthHeaders(getToken);
				const result = await fetcher(resolvedUrl, { id }, undefined, authHeaders);
				notifySuccess(notifyRef.current, actionName, spec, result);
				await reloadAfterAction(spec.reloadSources, true);
			} catch (error) {
				reportActionError(actionName, 'row', error, spec);
			} finally {
				if (flightKey) {
					end(actionName, flightKey, rowKey);
				}
			}
		},
		[$actions, fetcher, getToken, reloadAfterAction, mountedRef, reportActionError, begin, end]
	);

	const onBatchAction = useCallback(
		async (actionName: string, rows: unknown[]) => {
			let spec: ActionSpec | undefined;
			let started = false;
			try {
				const rawSpec = $actions?.[actionName];
				if (!rawSpec) {
					console.warn(`[GenericPageRunner] No action spec found for "${actionName}" - check $actions in YAML`);
					return;
				}
				spec = normalizeAction(rawSpec);
				if (!spec.url) {
					console.warn(`[GenericPageRunner] Batch action "${actionName}" has no url - skipping fetcher`);
					return;
				}
				if (!begin(actionName, `${actionName}:batch`, BATCH_ROW_KEY)) {
					return;
				}
				started = true;
				// Same guard as a row or form action: a destructive bulk action must ask before it sends anything.
				if (spec.confirm && !window.confirm(spec.confirm)) {
					return;
				}
				// Strip {id} placeholder from batch URL (batch sends ids in body)
				const batchUrl = spec.url.replace(/\{[^}]+\}/g, '').replace(/\/+$/, '');
				const ids = rows.map(r => (r as Record<string, unknown>)['id']);
				const authHeaders = await resolveAuthHeaders(getToken);
				const result = await fetcher(batchUrl, undefined, { ids }, authHeaders);
				notifySuccess(notifyRef.current, actionName, spec, result);
				await reloadAfterAction(spec.reloadSources, true);
			} catch (error) {
				reportActionError(actionName, 'batch', error, spec);
			} finally {
				if (started) {
					end(actionName, `${actionName}:batch`, BATCH_ROW_KEY);
				}
			}
		},
		[$actions, fetcher, getToken, reloadAfterAction, reportActionError, begin, end]
	);

	return { namedHandlers, onAction, onBatchAction, extras, actionPending, actionPendingRows: pendingRows };
}
