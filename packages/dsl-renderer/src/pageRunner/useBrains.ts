import { useCallback, useEffect, useRef, useState } from 'react';
import { devWarn } from '../engine/devMode.js';

import { getErrorMessage } from '../errors.js';
import type { Notify } from '../notifier.js';
import type { BrainRegistry, ChainBrainSpec, RawBrainSpec, SimpleBrainSpec } from './brainsTypes.js';
import type { Fetcher } from './pageRunnerUtils.js';
import { notifyFailure, resolveAuthHeaders, substituteUrlParams } from './pageRunnerUtils.js';

/**
 * What a page can read about a brain's own progress, as `$brains.<id>.$pending` and
 * `$brains.<id>.$error`.
 *
 * `$`-prefixed so they cannot collide with a field a brain declares in its own `$outputs`.
 */
export interface BrainStatus {
	$pending: boolean;
	$error: string | null;
}

function isReactiveRef(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return (
		value.startsWith('$outputs.') ||
		value.startsWith('$sources.') ||
		value.startsWith('$vars.') ||
		value.startsWith('$brains.')
	);
}

/** Follows `keys` into `start`; undefined as soon as a step is not an object (a missing value is not an error here: it means "not ready yet"). */
function walkPath(start: unknown, keys: string[]): unknown {
	let current = start;
	for (const key of keys) {
		if (current == null || typeof current !== 'object') {
			return undefined;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

function resolveParamFromCtx(value: string, ctx: Record<string, unknown>): unknown {
	const [root, ...rest] = value.slice(1).split('.');
	if (root === 'outputs') {
		return walkPath(ctx['$outputs'], rest);
	}
	if (root === 'sources') {
		// $sources.books -> ctx['books'], $sources.books.items -> ctx['books'].items
		return rest.length === 0 ? undefined : walkPath(ctx[rest[0]!], rest.slice(1));
	}
	if (root === 'vars') {
		return walkPath(ctx['$vars'], rest);
	}
	if (root === 'brains') {
		return walkPath(ctx['$brains'], rest);
	}
	return undefined;
}

// A `{placeholder}` with no value still produces a request/navigation (an empty segment, e.g. `DELETE /api/items/`), so
// it is reported instead of passing silently. Same lenient policy as `$actions` without strictParams.
function warnMissingPlaceholder(brainRef: string, url: string, key: string): string {
	console.warn(`[useBrains] ${brainRef}: URL placeholder {${key}} has no value in "${url}", substituting an empty string.`);
	return '';
}

// Declaration keys that configure the brain itself and are never forwarded to it as parameters.
const BRAIN_OPTION_KEYS = new Set(['strictParams']);

// Built-in brains that build a URL from their parameters. A chain step `id` is the step's own label, so it must never
// become a `{id}` URL value for these (it would silently shadow the route param of the same name).
function buildsUrlFromParams(brainRef: string): boolean {
	return brainRef.startsWith('$brains.$http.') || brainRef === '$brains.$ctx.navigate';
}

// `strictParams: true` mirrors `$actions.<name>.strictParams`: values are percent-encoded and a placeholder without a
// value fails before any request or navigation. Without it the legacy lenient substitution (plus a warning) applies.
function fillUrl(brainRef: string, url: string, params: Record<string, string>, strict: boolean): string {
	return substituteUrlParams(url, params, {
		encode: strict,
		onMissing: key => {
			if (strict) {
				throw new Error(
					`[useBrains] ${brainRef}: URL placeholder {${key}} has no value in "${url}" ` +
						`(available: ${Object.keys(params).join(', ') || 'none'}). ` +
						`Pass it as a parameter of the brain or in the route, or fix the url`
				);
			}
			return warnMissingPlaceholder(brainRef, url, key);
		},
	});
}

function collectReactiveParams(
	spec: Record<string, unknown>,
	ctx: Record<string, unknown>
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(spec)) {
		if (key.startsWith('$') || BRAIN_OPTION_KEYS.has(key)) continue;
		if (isReactiveRef(value)) {
			result[key] = resolveParamFromCtx(value as string, ctx);
		}
	}
	return result;
}

function resolveAllParams(
	spec: Record<string, unknown>,
	ctx: Record<string, unknown>
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(spec)) {
		if (key.startsWith('$') || BRAIN_OPTION_KEYS.has(key)) continue;
		result[key] = isReactiveRef(value) ? resolveParamFromCtx(value as string, ctx) : value;
	}
	return result;
}

async function executeFrameworkOrRegistryBrain(
	brainRef: string,
	params: Record<string, unknown>,
	setVar: (key: string, value: unknown) => void,
	getToken: (() => Promise<string | null>) | undefined,
	fetcher: Fetcher,
	brainRegistry?: BrainRegistry,
	routeParams?: Record<string, string>,
	strictParams = false
): Promise<unknown> {
	if (brainRef === '$brains.$ctx.setVar') {
		const varName = params['varName'];
		// Without a name the value would land under the key "undefined" and nothing would ever read it.
		if (typeof varName !== 'string' || varName === '') {
			throw new Error(`[useBrains] ${brainRef} needs a non-empty "varName" (got ${JSON.stringify(varName) ?? 'nothing'}).`);
		}
		setVar(varName, params['value']);
		return undefined;
	}

	if (brainRef === '$brains.$ctx.navigate') {
		const to = (params['to'] ?? params['route']) as string | undefined;
		if (!to) {
			// Not an error shown to the user (an empty target can come from a var that is not set yet), but never silent.
			console.warn(`[useBrains] ${brainRef} has no "to" (or "route"): there is nowhere to navigate to. Set one in the brain.`);
			return undefined;
		}
		const allParams: Record<string, string> = { ...(routeParams ?? {}) };
		for (const [k, v] of Object.entries(params)) {
			if (k !== 'to' && k !== 'route' && k !== '_event' && v != null) {
				allParams[k] = String(v);
			}
		}
		window.location.href = fillUrl(brainRef, to, allParams, strictParams);
		return undefined;
	}

	if (brainRef === '$brains.$ctx.reload') {
		return undefined;
	}

	if (brainRef.startsWith('$brains.$http.')) {
		const method = brainRef.slice('$brains.$http.'.length).toUpperCase();
		const url = params['url'] as string;
		const body = params['body'];
		// Merge route params first (lower priority), then brain params (higher priority)
		const allParams: Record<string, string> = { ...(routeParams ?? {}) };
		for (const [k, v] of Object.entries(params)) {
			if (k !== 'url' && k !== 'body' && v != null) {
				allParams[k] = String(v);
			}
		}
		const resolvedUrl = fillUrl(brainRef, url, allParams, strictParams);
		const authHeaders = await resolveAuthHeaders(getToken);
		if (method === 'GET' || method === 'DELETE') {
			return await fetcher(resolvedUrl, undefined, undefined, authHeaders);
		}
		return await fetcher(resolvedUrl, undefined, body as unknown, authHeaders);
	}

	if (brainRegistry) {
		const registryKey = brainRef.startsWith('$brains.') ? brainRef.slice('$brains.'.length) : brainRef;
		const fn = brainRegistry[registryKey];
		if (fn) {
			return await fn(params);
		}
	}

	throw new Error(`[useBrains] Unknown brain: "${brainRef}"`);
}

export function useBrains(params: {
	$brains?: Record<string, RawBrainSpec>;
	brainRegistry?: BrainRegistry;
	ctx: Record<string, unknown>;
	setVar: (key: string, value: unknown) => void;
	loadSources: (
		isPolled?: boolean,
		currentCtx?: Record<string, unknown>,
		keysToLoad?: Set<string>,
		bypassCache?: boolean
	) => Promise<void>;
	invalidateSourceCache: (key: string) => void;
	getToken?: () => Promise<string | null>;
	fetcher: Fetcher;
	routeParams?: Record<string, string>;
	/** Receives every failed brain (never a success: brains also drive data loading). There is no per-brain opt-out. */
	notify?: Notify;
}): {
	brainResults: Record<string, unknown>;
} {
	const {
		$brains,
		brainRegistry,
		ctx,
		setVar,
		loadSources,
		invalidateSourceCache,
		getToken,
		fetcher,
		routeParams,
		notify,
	} = params;

	const [brainResults, setBrainResults] = useState<Record<string, unknown>>({});
	/**
	 * Per-brain in-flight and failure state, exposed to the page as `$brains.<id>.$pending` and
	 * `$brains.<id>.$error`.
	 *
	 * Without these a page cannot react to its own mutations at all: the brain owns the request, so
	 * a form's own `loading` never flips and its submit button stays clickable through the save,
	 * while a rejection went nowhere but the console. "Save appears to do nothing" was both of
	 * those at once.
	 */
	const [brainStatus, setBrainStatus] = useState<Record<string, BrainStatus>>({});

	const setVarRef = useRef(setVar);
	setVarRef.current = setVar;
	const loadSourcesRef = useRef(loadSources);
	loadSourcesRef.current = loadSources;
	const invalidateRef = useRef(invalidateSourceCache);
	invalidateRef.current = invalidateSourceCache;
	const routeParamsRef = useRef(routeParams);
	routeParamsRef.current = routeParams;
	const notifyRef = useRef<Notify | undefined>(notify);
	notifyRef.current = notify;

	// snapshots[brainId] = last-known reactive param values (for change detection)
	const snapshots = useRef<Record<string, Record<string, unknown>>>({});
	// Brains already told that their retired `$notify` key is ignored (one warning per brain).
	const warnedRetiredNotify = useRef<Set<string>>(new Set());

	const runBrain = useCallback(
		async (
			brainId: string,
			spec: RawBrainSpec,
			resolvedParams: Record<string, unknown>,
			currentCtx: Record<string, unknown>
		) => {
			if ('$chain' in spec) {
				const chainSpec = spec as ChainBrainSpec;
				const chainData: Record<string, Record<string, unknown>> = {};
				for (const step of chainSpec.$chain) {
					const stepParams: Record<string, unknown> = {};
					const stepBuildsUrl = buildsUrlFromParams(step.$brain);
					for (const [key, value] of Object.entries(step)) {
						if (key.startsWith('$') || BRAIN_OPTION_KEYS.has(key)) continue;
						// Registry brains keep receiving the step id as before; built-in URL brains must not (see buildsUrlFromParams).
						if (key === 'id' && stepBuildsUrl) continue;
						if (typeof value === 'string' && value.startsWith('$chain.')) {
							const parts = value.slice(7).split('.');
							if (parts.length === 2) {
								stepParams[key] = chainData[parts[0]!]?.[parts[1]!];
							} else if (parts.length === 1) {
								stepParams[key] = resolvedParams[parts[0]!];
							}
						} else if (isReactiveRef(value)) {
							stepParams[key] = resolveParamFromCtx(value as string, currentCtx);
						} else {
							stepParams[key] = value;
						}
					}
					const result = await executeFrameworkOrRegistryBrain(
						step.$brain,
						stepParams,
						setVarRef.current,
						getToken,
						fetcher,
						brainRegistry,
						routeParamsRef.current,
						(step['strictParams'] ?? chainSpec['strictParams']) === true
					);
					if (step.$outputs) {
						const stepResult: Record<string, unknown> = {};
						for (const field of step.$outputs) {
							stepResult[field] = (result as Record<string, unknown>)?.[field];
						}
						chainData[step.id] = stepResult;
					}
				}
				if (chainSpec.$reload) {
					for (const sourceKey of chainSpec.$reload) {
						invalidateRef.current(sourceKey);
					}
					await loadSourcesRef.current(false, currentCtx, new Set(chainSpec.$reload), true);
				}
			} else {
				const simpleSpec = spec as SimpleBrainSpec;
				// For $ctx.setVar brains with $reload, we need the updated var value in the
				// ctx passed to loadSources so $vars.* source params resolve to the new value.
				let ctxForReload = currentCtx;
				if (simpleSpec.$brain === '$brains.$ctx.setVar' && simpleSpec.$reload) {
					const varName = resolvedParams['varName'] as string;
					const newValue = resolvedParams['value'];
					const prevVars = (currentCtx['$vars'] ?? {}) as Record<string, unknown>;
					ctxForReload = {
						...currentCtx,
						$vars: { ...prevVars, [varName]: newValue },
					};
				}
				const result = await executeFrameworkOrRegistryBrain(
					simpleSpec.$brain,
					resolvedParams,
					setVarRef.current,
					getToken,
					fetcher,
					brainRegistry,
					routeParamsRef.current,
					simpleSpec['strictParams'] === true
				);
				if (simpleSpec.$outputs) {
					const resultRecord: Record<string, unknown> = {};
					for (const field of simpleSpec.$outputs) {
						resultRecord[field] = (result as Record<string, unknown>)?.[field];
					}
					setBrainResults(prev => ({ ...prev, [brainId]: resultRecord }));
				}
				if (simpleSpec.$reload) {
					for (const sourceKey of simpleSpec.$reload) {
						invalidateRef.current(sourceKey);
					}
					await loadSourcesRef.current(false, ctxForReload, new Set(simpleSpec.$reload), true);
				}
			}
		},
		// routeParams is accessed via routeParamsRef so it never stales inside the callback
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[brainRegistry, fetcher, getToken]
	);

	/**
	 * Brain outputs merged with brain status, which is what a page sees as `$brains`.
	 *
	 * Rebuilt every render on purpose: the effect below has no dependency array, so it already runs
	 * every render, and memoising this would only add a way for the two to disagree.
	 */
	const brainsCtx: Record<string, unknown> = {};
	for (const id of new Set([...Object.keys(brainResults), ...Object.keys(brainStatus)])) {
		// Narrowed rather than cast: a brain that declared no $outputs has no entry here at all,
		// and a non-object result is not something to spread.
		const outputs = brainResults[id];
		brainsCtx[id] = {
			...(typeof outputs === 'object' && outputs !== null ? outputs : {}),
			...(brainStatus[id] ?? { $pending: false, $error: null }),
		};
	}

	/*
	 * THE ctx THIS HOOK MUST RESOLVE AGAINST.
	 *
	 * The caller passes a ctx with no `$brains` key: GenericPageRunner adds `$brains` to a SECOND
	 * ctx, built after this hook returns, for rendering. So a `$brains.<id>.<field>` parameter
	 * resolved against the caller's ctx was undefined on the first render and undefined on every
	 * render after it - the value never changed, so the brain never fired.
	 *
	 * That made brain-to-brain chaining dead in the `$brains.<id>.<field>` form: an
	 * $http brain followed by a navigate could never run its second half. Concretely, saving a job
	 * worked and the page then sat there, because navigateAfterCreate was waiting on a value it
	 * could not see. The `$chain` form was unaffected, which is why this went unnoticed.
	 */
	const ctxWithBrains: Record<string, unknown> = { ...ctx, $brains: brainsCtx };

	useEffect(() => {
		if (!$brains) return;
		for (const [brainId, spec] of Object.entries($brains)) {
			const rawSpec = spec as Record<string, unknown>;
			// `$notify` used to keep a failed brain out of the feedback. A failure is now always reported, so the key does nothing:
			// say so once instead of letting an author believe the failure is silenced.
			if ('$notify' in rawSpec && !warnedRetiredNotify.current.has(brainId)) {
				warnedRetiredNotify.current.add(brainId);
				devWarn(
					`[useBrains] brain "${brainId}": the "$notify" key is no longer supported and is ignored, a failed brain is always reported to the user. Remove it.`
				);
			}
			const currentReactive = collectReactiveParams(rawSpec, ctxWithBrains);
			const prevReactive = snapshots.current[brainId];
			const isFirstRender = prevReactive === undefined;

			// On first render, skip brains whose ALL reactive params are still undefined.
			// This covers $outputs.* (waiting for user interaction) and $brains.* (waiting
			// for upstream brain result). Brains with $vars.* or $sources.* fire at mount
			// whenever their resolved value is non-undefined.
			const allReactiveUndefined =
				isFirstRender &&
				Object.keys(currentReactive).length > 0 &&
				Object.values(currentReactive).every(v => v === undefined);

			const hasChanged =
				!isFirstRender &&
				(Object.keys(currentReactive).some(key => currentReactive[key] !== prevReactive[key]) ||
				Object.keys(prevReactive).some(key => !(key in currentReactive)));

			const shouldFire = allReactiveUndefined
				? false
				: (isFirstRender || hasChanged);

			// Record snapshot so next render can detect changes.
			if (isFirstRender || hasChanged) {
				snapshots.current[brainId] = { ...currentReactive };
			}
			if (shouldFire) {
				const resolvedParams = resolveAllParams(rawSpec, ctxWithBrains);
				setBrainStatus(prev => ({ ...prev, [brainId]: { $pending: true, $error: null } }));
				void runBrain(brainId, spec, resolvedParams, ctxWithBrains)
					.then(() => {
						setBrainStatus(prev => ({ ...prev, [brainId]: { $pending: false, $error: null } }));
					})
					.catch(err => {
						const message = getErrorMessage(err);
						// Published to the page AND logged. The log alone was the whole error channel,
						// which is how a failed mutation looked exactly like a successful one.
						setBrainStatus(prev => ({ ...prev, [brainId]: { $pending: false, $error: message } }));
						console.error(`[useBrains] brain "${brainId}" failed:`, message);
						if (notifyRef.current) {
							notifyFailure(notifyRef.current, brainId, undefined, err);
						}
					});
			}
		}
	});

	return { brainResults: brainsCtx };
}
