import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';

import type { AbDockAlign } from './AbDock.js';
import { AbExperimentsDock } from './AbExperimentsDock.js';
import { createAbStore } from './abStore.js';
import type { AbStore } from './abStore.js';
import type { AbTest as AbDockTest } from './abTypes.js';
import { isDev } from './isDev.js';

export interface AbExperimentsContextValue {
	// Whether experiments run. Off: every `<AbTest>` renders its `initial` variant and never reads the storage or the URL.
	enabled: boolean;
	// Whether `<AbTest>` nodes of the views take part. False: they render their `initial` variant and add no row (tests declared in code still do).
	viewTests: boolean;
	store: AbStore;
}

export const AbExperimentsContext = createContext<AbExperimentsContextValue | null>(null);

export interface AbExperimentsProps {
	/** Experiments on or off. Default: development builds only (see isDev). The host can turn it on for a staging build. */
	enabled?: boolean;
	/** Tests the host declared in code with `useAbTest`, shown in the same dock before the ones declared in views. */
	tests?: readonly AbDockTest[];
	/**
	 * Whether `<AbTest>` nodes written in views take part. Turn it off for a host that runs experiments for another purpose (a scenario
	 * picker registered with `useRegisterAbTests`) and does not want the A/B variants of views. @default true
	 */
	viewTests?: boolean;
	/** Side of the strip the dock sits on, so it can leave a bottom action row of the page free. @default 'center' */
	align?: AbDockAlign;
	children: React.ReactNode;
}

/**
 * Host-side owner of the A/B dock, mounted ONCE near the root of the app. `<AbTest>` nodes anywhere below register their
 * test with it, and it shows them all in a single dock, so several modules never stack a dock each at the bottom centre.
 *
 * `enabled` defaults to development builds (isDev); pass it to run experiments elsewhere, e.g. from a shell setting that
 * is off by default. When off, nothing is shown and every `<AbTest>` renders its `initial` variant only.
 *
 * Mounting it twice (nested) is reported and the inner one only renders its children.
 *
 * Not a DSL node: it is a React API for the host app's code, so it carries no `@registryCategory`.
 */
export function AbExperiments({ enabled = isDev(), viewTests = true, tests = [], align, children }: AbExperimentsProps): React.ReactElement {
	const outer = useContext(AbExperimentsContext);
	const storeRef = useRef<AbStore | null>(null);
	if (storeRef.current === null) {
		storeRef.current = createAbStore();
	}
	const store = storeRef.current;
	const value = useMemo<AbExperimentsContextValue>(() => ({ enabled, viewTests, store }), [enabled, viewTests, store]);
	useEffect(() => {
		if (outer) {
			console.error('[ab] AbExperiments is mounted inside another AbExperiments: only the outer one shows the dock. Mount it once, near the root.');
		}
	}, [outer]);
	if (outer) {
		return <>{children}</>;
	}
	return (
		<AbExperimentsContext.Provider value={value}>
			{children}
			<AbExperimentsDock store={store} hostTests={tests} enabled={enabled} align={align} />
		</AbExperimentsContext.Provider>
	);
}

export function useAbExperiments(): AbExperimentsContextValue | null {
	return useContext(AbExperimentsContext);
}
