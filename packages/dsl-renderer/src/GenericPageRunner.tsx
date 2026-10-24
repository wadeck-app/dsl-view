import { load as parseYaml } from 'js-yaml';
import React, { useContext, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import type { CompiledDslArtifact } from './compiledDslArtifact.js';
import { COMPILED_DSL_FORMAT_VERSION } from './compiledDslArtifact.js';
import type { ComponentRegistry } from './ComponentRegistry.js';
import { DslRenderer, omitNavKeys, resolveExpressionValue } from './engine/DslRenderer.js';
import { ActionBanner } from './ActionBanner.js';
import { NotifierContext, useBannerNotifier } from './notifier.js';
import type { BrainRegistry } from './pageRunner/brainsTypes.js';
import { useActionHandlers } from './pageRunner/useActionHandlers.js';
import { useBrains } from './pageRunner/useBrains.js';
import { useOutputs } from './pageRunner/useOutputs.js';
import { notifyLoadFailure } from './pageRunner/pageRunnerUtils.js';
import type { ActionErrorInfo, Fetcher, PageSpec } from './pageRunner/pageRunnerUtils.js';
import { computeRegistryFingerprint } from './registryHash.js';
import { useSourceLoader } from './pageRunner/useSourceLoader.js';
import { useVars } from './pageRunner/useVars.js';

export interface GenericPageRunnerProps {
	/** Raw YAML source. Required unless `compiled` is passed instead. */
	yamlText?: string;
	/** Pre-compiled artifact from `compileDslDocument`/`compileDslPagesDir`, used instead of `yamlText`. */
	compiled?: CompiledDslArtifact;
	/**
	 * Optional explicit page identity. By default the runner remounts when the document (`yamlText` /
	 * `compiled`) or a route param changes. Pass a stable key (e.g. the page path) to decide it yourself:
	 * the page then remounts exactly when this value changes, whatever the document text is.
	 */
	pageKey?: string;
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
 * Remounts the page when its identity changes, so vars, outputs, brain state, source data and action
 * feedback never leak from one page or entity to the next:
 * - a route param changes (/workers/001 -> /workers/002);
 * - the document changes (a host that keeps ONE element mounted and swaps `yamlText` / `compiled`,
 *   e.g. /jobs/new -> /jobs, where both routes have no params).
 * The same document re-rendered (identical `yamlText`, polling, re-render of the host) never remounts.
 */
export function GenericPageRunner(props: GenericPageRunnerProps) {
	const routeParams = useParams();
	const { yamlText, compiled, pageKey } = props;
	// Document text itself rather than a hash: no collision can leave a stale page mounted, and equal strings compare cheaply.
	const documentIdentity = useMemo(() => {
		if (pageKey !== undefined) {
			return `key:${pageKey}`;
		}
		if (compiled) {
			return `compiled:${compiled.sourcePath ?? ''}:${JSON.stringify(compiled.doc)}`;
		}
		return `yaml:${yamlText ?? ''}`;
	}, [yamlText, compiled, pageKey]);
	return <PageRunner key={`${JSON.stringify(routeParams)}|${documentIdentity}`} {...props} />;
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
		const parsed = parseYaml(yamlText!);
		// Destructuring a scalar, a list or an empty document further down would fail with an opaque TypeError.
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			const got = parsed === undefined || parsed === null ? 'an empty document' : Array.isArray(parsed) ? 'a list' : `a ${typeof parsed}`;
			throw new Error(
				`[GenericPageRunner] The page YAML must be a mapping with a $type (got ${got}). ` +
					'Check that the file is not empty, commented out, or missing its top-level keys.'
			);
		}
		return parsed as PageSpec & Record<string, unknown>;
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

	const { vars, setVar, seedFrom } = useVars(varsDecl as Record<string, unknown> | undefined);
	const { outputs, publishOutput } = useOutputs();

	const { sourceData, loading, initialLoading, isRefreshing, loadSources, mountedRef, invalidateSourceCache } = useSourceLoader({
		$sources,
		searchParams,
		routeParams,
		getToken,
		fetcher,
		// A failed load leaves the sources undefined, which a table would otherwise present as "empty": say it failed.
		onLoadError: error => notifyLoadFailure(notify, error),
	});

	const { namedHandlers, onAction, onBatchAction, extras, actionPending, actionPendingRows } = useActionHandlers({
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

	// `$refresh([source])`, defaulted into RefreshButton.onRefresh (@ctxDefault). Same loader as the poll timer: the cache entry
	// is dropped (a poll-style load does not repopulate it) and the previous data stays until the answer arrives.
	// A failure is the user's own click: always reported, never deduplicated like a poll failure.
	const refresh = async (source?: string): Promise<void> => {
		const known = Object.keys($sources ?? {});
		if (source !== undefined && !known.includes(source)) {
			notify({
				kind: 'error',
				message: `Cannot refresh unknown source "${source}". This page has: ${known.length > 0 ? known.join(', ') : '(no $sources)'}.`,
			});
			return;
		}
		const keys = source === undefined ? known : [source];
		for (const key of keys) {
			invalidateSourceCache(key);
		}
		try {
			await loadSources(true, {}, source === undefined ? undefined : new Set([source]), true);
		} catch (error) {
			console.error('[GenericPageRunner] refresh failed:', error);
			notifyLoadFailure(notify, error);
		}
	};

	const baseCtx: Record<string, unknown> = {
		...sourceData,
		$refresh: refresh,
		loading,
		// True only until the first load finishes: components that default their `loading` from the page (@ctxDefault) read this,
		// so a refetch (filter, page, poll, action reload) keeps showing the previous data instead of a skeleton.
		$initialLoading: initialLoading,
		$refreshing: isRefreshing,
		...extras,
		onAction,
		onBatchAction,
		...namedHandlers,
		$actionPending: actionPending,
		$actionPendingRows: actionPendingRows,
		$vars: vars,
		// Writes a page variable: bound fields placed outside a Form edit $vars through it (see the generated bind wrapper).
		$setVar: setVar,
		$outputs: outputs,
		$publishOutput: publishOutput,
		$route: routeParams,
	};

	// `$vars: { payload: $sources.event.exampleText }`: a variable declared with an expression is seeded once, as soon as
	// the expression has a value (see useVars). Runs after every render; it does nothing once everything is seeded.
	useEffect(() => {
		seedFrom(expression => resolveExpressionValue(expression, baseCtx));
	});

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
