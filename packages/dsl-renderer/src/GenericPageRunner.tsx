import { load as parseYaml } from 'js-yaml';
import React, { useContext, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import type { CompiledDslArtifact } from './compiledDslArtifact.js';
import { COMPILED_DSL_FORMAT_VERSION } from './compiledDslArtifact.js';
import type { ComponentRegistry } from './ComponentRegistry.js';
import { DslRenderer, omitNavKeys } from './engine/DslRenderer.js';
import { ActionBanner } from './ActionBanner.js';
import { NotifierContext, useBannerNotifier } from './notifier.js';
import type { BrainRegistry } from './pageRunner/brainsTypes.js';
import { useActionHandlers } from './pageRunner/useActionHandlers.js';
import { useBrains } from './pageRunner/useBrains.js';
import { useOutputs } from './pageRunner/useOutputs.js';
import type { ActionErrorInfo, Fetcher, PageSpec } from './pageRunner/pageRunnerUtils.js';
import { computeRegistryFingerprint } from './registryHash.js';
import { useSourceLoader } from './pageRunner/useSourceLoader.js';
import { useVars } from './pageRunner/useVars.js';

export interface GenericPageRunnerProps {
	/** Raw YAML source. Required unless `compiled` is passed instead. */
	yamlText?: string;
	/** Pre-compiled artifact from `compileDslDocument`/`compileDslPagesDir`, used instead of `yamlText`. */
	compiled?: CompiledDslArtifact;
	registry: ComponentRegistry;
	getToken?: () => Promise<string | null>;
	fetcher: Fetcher;
	brainRegistry?: BrainRegistry;
	/**
	 * Called when a row action (DataTable `action:` item) or a batch action fails: HTTP error from the
	 * fetcher, or a `{placeholder}` in the action url that has no value in the row. Use it to tell the
	 * user (e.g. a toast). Independent of the notifier: it is called in addition to it.
	 */
	onActionError?: (error: Error, info: ActionErrorInfo) => void;
	/**
	 * Backstop fallback for a hand-authored `ComponentRegistryEntry` using bare `React.lazy`
	 * with no `Suspense` ancestor of its own. Generated `@registryLazy` entries never reach
	 * this - they wrap their own output in `LazyBoundary` (see engine/LazyBoundary.tsx), which
	 * has its own fallback and warning. Pass `null` explicitly to opt into no visible fallback
	 * without a console warning.
	 */
	suspenseFallback?: React.ReactNode;
}

// Renders only while nothing was passed for `suspenseFallback` - warns once per mount so a
// blank loading state is never silent (vs. an explicit `null`). Only reachable by a
// hand-authored lazy entry with no Suspense ancestor of its own - see prop doc above.
function SuspenseFallbackNotConfiguredWarning(): null {
	React.useEffect(() => {
		console.warn(
			'[GenericPageRunner] A lazily-loaded component is fetching its chunk and no `suspenseFallback` prop was passed - rendering nothing visible. ' +
				'Pass `suspenseFallback` to show a loading state, or pass `null` explicitly to silence this warning.'
		);
	}, []);
	return null;
}

/**
 * Remounts the page when a route param changes (/workers/001 -> /workers/002), so vars, outputs,
 * brain state and source data never leak from one entity to the next.
 */
export function GenericPageRunner(props: GenericPageRunnerProps) {
	const routeParams = useParams();
	return <PageRunner key={JSON.stringify(routeParams)} {...props} />;
}

function PageRunner({
	yamlText,
	compiled,
	registry,
	getToken,
	fetcher,
	brainRegistry,
	onActionError,
	suspenseFallback,
}: GenericPageRunnerProps) {
	const doc = useMemo(() => {
		if (!compiled && !yamlText) {
			throw new Error('[GenericPageRunner] Either `yamlText` or `compiled` must be provided.');
		}
		if (compiled) {
			if (compiled.formatVersion !== COMPILED_DSL_FORMAT_VERSION) {
				throw new Error(
					`[GenericPageRunner] Compiled DSL artifact has formatVersion ${compiled.formatVersion}, ` +
						`but this runtime expects ${COMPILED_DSL_FORMAT_VERSION}. Recompile with a matching dsl-renderer version.`
				);
			}
			const currentFingerprint = computeRegistryFingerprint(registry);
			if (compiled.registryFingerprint !== currentFingerprint) {
				console.warn(
					`[GenericPageRunner] Compiled DSL artifact${compiled.sourcePath ? ` (${compiled.sourcePath})` : ''} ` +
						`was compiled against a different component registry (fingerprint ${compiled.registryFingerprint} ` +
						`vs current ${currentFingerprint}). Rendering anyway - the artifact may be stale. Recompile to clear this warning.`
				);
			}
			return compiled.doc as PageSpec & Record<string, unknown>;
		}
		return parseYaml(yamlText!) as PageSpec & Record<string, unknown>;
	}, [yamlText, compiled, registry]);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- $route stripped from spread so it doesn't reach the render tree
	const { $sources, $actions, $route, $vars: varsDecl, $brains: brainsDecl, ...pageNode } = doc;
	const node = omitNavKeys(pageNode);

	const [searchParams] = useSearchParams();
	const routeParams = useParams() as Record<string, string>;

	// Action feedback: the host's NotifierProvider when there is one, otherwise an inline banner above the page.
	// Never silent either way.
	const hostNotify = useContext(NotifierContext);
	const banner = useBannerNotifier();
	const notify = hostNotify ?? banner.notify;

	const { vars, setVar } = useVars(varsDecl as Record<string, unknown> | undefined);
	const { outputs, publishOutput } = useOutputs();

	const { sourceData, loading, isRefreshing, loadSources, mountedRef, invalidateSourceCache } = useSourceLoader({
		$sources,
		searchParams,
		routeParams,
		getToken,
		fetcher,
	});

	const { namedHandlers, onAction, onBatchAction, extras, actionPending } = useActionHandlers({
		notify,
		$actions,
		invalidateSourceCache,
		mountedRef,
		routeParams,
		searchParams,
		getToken,
		fetcher,
		loadSources,
		onActionError,
	});

	const baseCtx: Record<string, unknown> = {
		...sourceData,
		loading,
		$refreshing: isRefreshing,
		...extras,
		onAction,
		onBatchAction,
		...namedHandlers,
		$actionPending: actionPending,
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
		notify,
	});

	const ctx: Record<string, unknown> = {
		...baseCtx,
		$brains: brainResults,
	};

	return (
		<NotifierContext.Provider value={notify}>
			{hostNotify ? null : <ActionBanner items={banner.items} onDismiss={banner.dismiss} />}
			<React.Suspense fallback={suspenseFallback !== undefined ? suspenseFallback : <SuspenseFallbackNotConfiguredWarning />}>
				<DslRenderer node={node as Record<string, unknown>} registry={registry} ctx={ctx} />
			</React.Suspense>
		</NotifierContext.Provider>
	);
}
