import React, { useEffect, useSyncExternalStore } from 'react';

import { AbDock } from './AbDock.js';
import type { AbStore } from './abStore.js';
import type { AbTest as AbDockTest } from './abTypes.js';

const reportedHostDuplicates = new Set<string>();

// The one dock of AbExperiments: the host's own tests first, then the ones `<AbTest>` nodes registered.
export function AbExperimentsDock({ store, hostTests, enabled }: { store: AbStore; hostTests: readonly AbDockTest[]; enabled: boolean }): React.ReactElement {
	const registered = useSyncExternalStore(store.subscribe, store.getSnapshot);
	const hostIds = new Set(hostTests.map((t) => t.id));
	const clashingKey = registered
		.filter((t) => hostIds.has(t.id))
		.map((t) => t.id)
		.join(',');
	useEffect(() => {
		for (const id of clashingKey ? clashingKey.split(',') : []) {
			if (!reportedHostDuplicates.has(id)) {
				reportedHostDuplicates.add(id);
				console.error(`[ab] The host test "${id}" and an AbTest node use the same id: only the host test is shown in the dock.`);
			}
		}
	}, [clashingKey]);
	return <AbDock tests={[...hostTests, ...registered.filter((t) => !hostIds.has(t.id))]} enabled={enabled} />;
}
