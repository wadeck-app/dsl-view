import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '../errors.js';
import type { BrainRegistry, ChainBrainSpec, RawBrainSpec, SimpleBrainSpec } from './brainsTypes.js';
import type { Fetcher } from './pageRunnerUtils.js';
import { resolveAuthHeaders, substituteUrlParams } from './pageRunnerUtils.js';

function isReactiveRef(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return (
		value.startsWith('$outputs.') ||
		value.startsWith('$sources.') ||
		value.startsWith('$vars.') ||
		value.startsWith('$brains.')
	);
}

function resolveParamFromCtx(value: string, ctx: Record<string, unknown>): unknown {
	const path = value.slice(1).split('.');
	const root = path[0];
	const rest = path.slice(1);

	let current: unknown;
	if (root === 'outputs') {
		current = ctx['$outputs'];
		for (const key of rest) {
			if (current == null || typeof current !== 'object') return undefined;
			current = (current as Record<string, unknown>)[key];
		}
		return current;
	} else if (root === 'sources') {
		// $sources.books → ctx['books'], $sources.books.items → ctx['books'].items
		if (rest.length === 0) return undefined;
		current = ctx[rest[0]!];
		for (const key of rest.slice(1)) {
			if (current == null || typeof current !== 'object') return undefined;
			current = (current as Record<string, unknown>)[key];
		}
		return current;
	} else if (root === 'vars') {
		current = ctx['$vars'];
		for (const key of rest) {
			if (current == null || typeof current !== 'object') return undefined;
			current = (current as Record<string, unknown>)[key];
		}
		return current;
	} else if (root === 'brains') {
		current = ctx['$brains'];
		for (const key of rest) {
			if (current == null || typeof current !== 'object') return undefined;
			current = (current as Record<string, unknown>)[key];
		}
		return current;
	}
	return undefined;
}

function collectReactiveParams(
	spec: Record<string, unknown>,
	ctx: Record<string, unknown>
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(spec)) {
		if (key.startsWith('$')) continue;
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
		if (key.startsWith('$')) continue;
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
	routeParams?: Record<string, string>
): Promise<unknown> {
	if (brainRef === '$brains.$ctx.setVar') {
		const varName = params['varName'] as string;
		const value = params['value'];
		setVar(varName, value);
		return undefined;
	}

	if (brainRef === '$brains.$ctx.navigate') {
		const route = params['route'] as string;
		window.location.href = route;
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
			if (k !== 'url' && k !== 'body' && v != null) allParams[k] = String(v);
		}
		const resolvedUrl = substituteUrlParams(url, allParams);
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
	} = params;

	const [brainResults, setBrainResults] = useState<Record<string, unknown>>({});

	const setVarRef = useRef(setVar);
	setVarRef.current = setVar;
	const loadSourcesRef = useRef(loadSources);
	loadSourcesRef.current = loadSources;
	const invalidateRef = useRef(invalidateSourceCache);
	invalidateRef.current = invalidateSourceCache;
	const routeParamsRef = useRef(routeParams);
	routeParamsRef.current = routeParams;

	// snapshots[brainId] = last-known reactive param values (for change detection)
	const snapshots = useRef<Record<string, Record<string, unknown>>>({});

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
					for (const [key, value] of Object.entries(step)) {
						if (key.startsWith('$')) continue;
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
						routeParamsRef.current
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
					routeParamsRef.current
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

	useEffect(() => {
		if (!$brains) return;
		for (const [brainId, spec] of Object.entries($brains)) {
			const rawSpec = spec as Record<string, unknown>;
			const currentReactive = collectReactiveParams(rawSpec, ctx);
			const prevReactive = snapshots.current[brainId];
			const isFirstRender = prevReactive === undefined;

			// Never fire on first render: brains respond to changes, not initial state.
			// This prevents $outputs.*-triggered brains from firing at mount when
			// outputs are not yet published (still undefined).
			const hasChanged =
				!isFirstRender &&
				(Object.keys(currentReactive).some(key => currentReactive[key] !== prevReactive[key]) ||
				Object.keys(prevReactive).some(key => !(key in currentReactive)));

			if (hasChanged) {
				snapshots.current[brainId] = { ...currentReactive };
				const resolvedParams = resolveAllParams(rawSpec, ctx);
				void runBrain(brainId, spec, resolvedParams, ctx).catch(err => {
					console.error(`[useBrains] brain "${brainId}" failed:`, getErrorMessage(err));
				});
			}
		}
	});

	return { brainResults };
}
