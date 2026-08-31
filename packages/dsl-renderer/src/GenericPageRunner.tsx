import { load as parseYaml } from 'js-yaml';
import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import type { ComponentRegistry } from './ComponentRegistry.js';
import { DslRenderer } from './engine/DslRenderer.js';
import type { BrainRegistry } from './pageRunner/brainsTypes.js';
import { useActionHandlers } from './pageRunner/useActionHandlers.js';
import { useBrains } from './pageRunner/useBrains.js';
import { useOutputs } from './pageRunner/useOutputs.js';
import type { Fetcher, PageSpec } from './pageRunner/pageRunnerUtils.js';
import { useSourceLoader } from './pageRunner/useSourceLoader.js';
import { useVars } from './pageRunner/useVars.js';

export interface GenericPageRunnerProps {
	yamlText: string;
	registry: ComponentRegistry;
	getToken?: () => Promise<string | null>;
	fetcher: Fetcher;
	brainRegistry?: BrainRegistry;
}

export function GenericPageRunner({ yamlText, registry, getToken, fetcher, brainRegistry }: GenericPageRunnerProps) {
	const doc = useMemo(() => parseYaml(yamlText) as PageSpec & Record<string, unknown>, [yamlText]);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- $route stripped from spread so it doesn't reach the render tree
	const { $sources, $actions, $route, $vars: varsDecl, $brains: brainsDecl, ...node } = doc;

	const [searchParams] = useSearchParams();
	const routeParams = useParams() as Record<string, string>;

	const { vars, setVar } = useVars(varsDecl as Record<string, unknown> | undefined);
	const { outputs, publishOutput } = useOutputs();

	const { sourceData, loading, isRefreshing, loadSources, mountedRef, invalidateSourceCache } = useSourceLoader({
		$sources,
		searchParams,
		routeParams,
		getToken,
		fetcher,
	});

	const { namedHandlers, onAction, onBatchAction, extras } = useActionHandlers({
		$actions,
		invalidateSourceCache,
		mountedRef,
		routeParams,
		searchParams,
		getToken,
		fetcher,
		loadSources,
	});

	const baseCtx: Record<string, unknown> = {
		...sourceData,
		loading,
		$refreshing: isRefreshing,
		...extras,
		onAction,
		onBatchAction,
		...namedHandlers,
		$vars: vars,
		$outputs: outputs,
		$publishOutput: publishOutput,
		$route: routeParams,
	};

	const { brainResults } = useBrains({
		$brains: brainsDecl,
		brainRegistry,
		ctx: baseCtx,
		setVar,
		loadSources,
		invalidateSourceCache,
		getToken,
		fetcher,
		routeParams,
	});

	const ctx: Record<string, unknown> = {
		...baseCtx,
		$brains: brainResults,
	};

	return <DslRenderer node={node as Record<string, unknown>} registry={registry} ctx={ctx} />;
}
