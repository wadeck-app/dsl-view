import { act, render } from '@testing-library/react';
import React, { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { DAY_MS } from './timeSeriesMath.js';
import type { TimeWindow } from './timeSeriesMath.js';
import { createSyncStore, defaultSyncStore, TimeSeriesSyncProvider, useSyncStore, useSyncWindow } from './timeSeriesSync.js';
import type { SyncedWindow, SyncStore } from './timeSeriesSync.js';

// The default store is shared by the whole file: every test names its own group and the afterEach checks nothing is left behind.
afterEach(() => {
	expect(defaultSyncStore.groupCount()).toBe(0);
});

describe('store: shared window', () => {
	it('registers the union of the extents; a pan set by one is seen by all; an extent change resets', () => {
		const store = createSyncStore();
		const g = 'union';
		for (const id of ['a', 'b', 'c']) {
			store.setExtent(g, id, [0, 100 * DAY_MS]);
		}
		expect(store.getSnapshot(g).extent).toStrictEqual([0, 100 * DAY_MS]);
		expect(store.getSnapshot(g).window).toBeNull();
		store.setWindow(g, [10 * DAY_MS, 40 * DAY_MS]);
		expect(store.getSnapshot(g).window).toStrictEqual([10 * DAY_MS, 40 * DAY_MS]);
		// the same extent registered again by a re-render: the window survives
		store.setExtent(g, 'a', [0, 100 * DAY_MS]);
		expect(store.getSnapshot(g).window).toStrictEqual([10 * DAY_MS, 40 * DAY_MS]);
		// a new period: back to the whole extent
		for (const id of ['a', 'b', 'c']) {
			store.setExtent(g, id, [0, 200 * DAY_MS]);
		}
		expect(store.getSnapshot(g).window).toBeNull();
		expect(store.getSnapshot(g).extent).toStrictEqual([0, 200 * DAY_MS]);
	});

	it('the group extent is the union of the different extents of its components', () => {
		const store = createSyncStore();
		store.setExtent('g', 'a', [10 * DAY_MS, 50 * DAY_MS]);
		store.setExtent('g', 'b', [0, 30 * DAY_MS]);
		expect(store.getSnapshot('g').extent).toStrictEqual([0, 50 * DAY_MS]);
		store.setExtent('g', 'b', null);
		expect(store.getSnapshot('g').extent).toStrictEqual([10 * DAY_MS, 50 * DAY_MS]);
	});

	it('clamps a window to the extent and stores the full window as null; groups are independent', () => {
		const store = createSyncStore();
		store.setExtent('g-x', 'a', [0, 100 * DAY_MS]);
		store.setExtent('g-y', 'a', [0, 50 * DAY_MS]);
		store.setWindow('g-x', [-5 * DAY_MS, 20 * DAY_MS]);
		expect(store.getSnapshot('g-x').window).toStrictEqual([0, 25 * DAY_MS]);
		store.setWindow('g-x', [0, 100 * DAY_MS]);
		expect(store.getSnapshot('g-x').window).toBeNull();
		expect(store.getSnapshot('g-y').window).toBeNull();
	});

	it('two groups of one store stay independent', () => {
		const store = createSyncStore();
		store.setExtent('group-a', 'a', [0, 100 * DAY_MS]);
		store.setExtent('group-b', 'a', [0, 100 * DAY_MS]);
		store.setWindow('group-a', [10 * DAY_MS, 30 * DAY_MS]);
		expect(store.getSnapshot('group-b').window).toBeNull();
		store.setWindow('group-b', [50 * DAY_MS, 70 * DAY_MS]);
		expect(store.getSnapshot('group-a').window).toStrictEqual([10 * DAY_MS, 30 * DAY_MS]);
	});

	it('a window set before any component registered is dropped, not kept', () => {
		const store = createSyncStore();
		store.setWindow('early', [1, 2]);
		expect(store.getSnapshot('early')).toStrictEqual({ extent: null, window: null });
		expect(store.groupCount()).toBe(0);
	});

	it('subscribers are notified per store and group', () => {
		const store = createSyncStore();
		const other = createSyncStore();
		let calls = 0;
		const off = store.subscribe('g', () => calls++);
		other.setExtent('g', 'a', [0, 10 * DAY_MS]);
		expect(calls).toBe(0);
		store.setExtent('g', 'a', [0, 10 * DAY_MS]);
		expect(calls).toBe(1);
		store.setExtent('elsewhere', 'a', [0, 10 * DAY_MS]);
		expect(calls).toBe(1);
		off();
		store.setExtent('g', 'a', [0, 20 * DAY_MS]);
		expect(calls).toBe(1);
	});
});

describe('store: cleanup (nothing leaks between pages)', () => {
	it('a group is forgotten once its last component unregistered and nobody listens', () => {
		const store = createSyncStore();
		store.setExtent('g-clean', 'a', [0, 100 * DAY_MS]);
		store.setExtent('g-clean', 'b', [0, 50 * DAY_MS]);
		store.setWindow('g-clean', [10 * DAY_MS, 30 * DAY_MS]);
		expect(store.groupCount()).toBe(1);
		store.setExtent('g-clean', 'a', null);
		expect(store.groupCount()).toBe(1);
		store.setExtent('g-clean', 'b', null);
		expect(store.groupCount()).toBe(0);
		expect(store.getSnapshot('g-clean')).toStrictEqual({ extent: null, window: null });
	});

	it('a group somebody still listens to is kept, so the listener sees the reset, and forgotten when the listener leaves', () => {
		const store = createSyncStore();
		const seen: unknown[] = [];
		const unsubscribe = store.subscribe('g-listened', () => seen.push(store.getSnapshot('g-listened')));
		store.setExtent('g-listened', 'a', [0, DAY_MS]);
		store.setExtent('g-listened', 'a', null);
		expect(store.groupCount()).toBe(1);
		expect(seen.at(-1)).toStrictEqual({ extent: null, window: null });
		unsubscribe();
		// nobody listens any more: the next unregister (even of an unknown id) tidies the group
		store.setExtent('g-listened', 'z', null);
		expect(store.groupCount()).toBe(0);
	});

	it('a new window on a group nobody holds does not create state', () => {
		const store = createSyncStore();
		store.setWindow('ghost', [0, DAY_MS]);
		expect(store.groupCount()).toBe(0);
	});
});

/** Renders the state of useSyncWindow so a test can read it and drive it. */
function Probe({ group, extent, out }: { group: string; extent: TimeWindow | null; out: { current: SyncedWindow | null } }): null {
	out.current = useSyncWindow(group, extent);
	return null;
}

describe('useSyncWindow (the hook behind every chart and brush)', () => {
	it('two components of one group see each other\'s window; the extent is the union', () => {
		const store = createSyncStore();
		const one = { current: null as SyncedWindow | null };
		const two = { current: null as SyncedWindow | null };
		render(
			<TimeSeriesSyncProvider store={store}>
				<Probe group="pair" extent={[0, 100 * DAY_MS]} out={one} />
				<Probe group="pair" extent={[0, 50 * DAY_MS]} out={two} />
			</TimeSeriesSyncProvider>,
		);
		expect(one.current!.extent).toStrictEqual([0, 100 * DAY_MS]);
		act(() => one.current!.setWindow([10 * DAY_MS, 30 * DAY_MS]));
		expect(two.current!.window).toStrictEqual([10 * DAY_MS, 30 * DAY_MS]);
		act(() => two.current!.setWindow(null));
		expect(one.current!.window).toStrictEqual([0, 100 * DAY_MS]);
	});

	it('uses its own extent for the first render, before the effect registered it', () => {
		const store = createSyncStore();
		const seen: Array<TimeWindow | null> = [];
		function First(): null {
			seen.push(useSyncWindow('first', [0, 10 * DAY_MS]).window);
			return null;
		}
		render(
			<TimeSeriesSyncProvider store={store}>
				<First />
			</TimeSeriesSyncProvider>,
		);
		expect(seen[0]).toStrictEqual([0, 10 * DAY_MS]);
	});

	it('unmounting unregisters: the group is forgotten', () => {
		const store = createSyncStore();
		const out = { current: null as SyncedWindow | null };
		const view = render(
			<TimeSeriesSyncProvider store={store}>
				<Probe group="gone" extent={[0, DAY_MS]} out={out} />
			</TimeSeriesSyncProvider>,
		);
		expect(store.groupCount()).toBe(1);
		view.unmount();
		expect(store.groupCount()).toBe(0);
	});

	it('React StrictMode (effects run, clean up, run again) leaves the state of a single mount, and a pan still works', () => {
		const store = createSyncStore();
		const out = { current: null as SyncedWindow | null };
		const view = render(
			<StrictMode>
				<TimeSeriesSyncProvider store={store}>
					<Probe group="strict" extent={[0, 100 * DAY_MS]} out={out} />
				</TimeSeriesSyncProvider>
			</StrictMode>,
		);
		expect(store.groupCount()).toBe(1);
		expect(store.getSnapshot('strict').extent).toStrictEqual([0, 100 * DAY_MS]);
		act(() => out.current!.setWindow([10 * DAY_MS, 30 * DAY_MS]));
		expect(out.current!.window).toStrictEqual([10 * DAY_MS, 30 * DAY_MS]);
		view.unmount();
		expect(store.groupCount()).toBe(0);
	});

	it('StrictMode with the default store (no provider) also cleans up', () => {
		const out = { current: null as SyncedWindow | null };
		const view = render(
			<StrictMode>
				<Probe group="strict-default" extent={[0, DAY_MS]} out={out} />
			</StrictMode>,
		);
		expect(defaultSyncStore.groupCount()).toBe(1);
		view.unmount();
		expect(defaultSyncStore.groupCount()).toBe(0);
	});

	it('a new extent (another period) resets the shared window of the group', () => {
		const store = createSyncStore();
		const out = { current: null as SyncedWindow | null };
		const tree = (extent: TimeWindow) => (
			<TimeSeriesSyncProvider store={store}>
				<Probe group="period" extent={extent} out={out} />
			</TimeSeriesSyncProvider>
		);
		const view = render(tree([0, 100 * DAY_MS]));
		act(() => out.current!.setWindow([10 * DAY_MS, 30 * DAY_MS]));
		view.rerender(tree([0, 100 * DAY_MS]));
		expect(out.current!.window).toStrictEqual([10 * DAY_MS, 30 * DAY_MS]);
		view.rerender(tree([0, 200 * DAY_MS]));
		expect(out.current!.window).toStrictEqual([0, 200 * DAY_MS]);
		view.unmount();
	});

	it('an extent that becomes null (no usable data any more) unregisters the component', () => {
		const store = createSyncStore();
		const out = { current: null as SyncedWindow | null };
		const view = render(
			<TimeSeriesSyncProvider store={store}>
				<Probe group="nodata" extent={[0, DAY_MS]} out={out} />
			</TimeSeriesSyncProvider>,
		);
		view.rerender(
			<TimeSeriesSyncProvider store={store}>
				<Probe group="nodata" extent={null} out={out} />
			</TimeSeriesSyncProvider>,
		);
		expect(out.current).toMatchObject({ window: null, extent: null });
		expect(store.getSnapshot('nodata').extent).toBeNull();
		view.unmount();
	});
});

describe('TimeSeriesSyncProvider (scope of the shared windows)', () => {
	it('the same group name in two providers does not share a window (two page runners on one page)', () => {
		const first = { current: null as SyncedWindow | null };
		const second = { current: null as SyncedWindow | null };
		const view = render(
			<div>
				<TimeSeriesSyncProvider>
					<Probe group="page" extent={[0, 100 * DAY_MS]} out={first} />
				</TimeSeriesSyncProvider>
				<TimeSeriesSyncProvider>
					<Probe group="page" extent={[0, 100 * DAY_MS]} out={second} />
				</TimeSeriesSyncProvider>
			</div>,
		);
		act(() => first.current!.setWindow([10 * DAY_MS, 30 * DAY_MS]));
		expect(first.current!.window).toStrictEqual([10 * DAY_MS, 30 * DAY_MS]);
		expect(second.current!.window).toStrictEqual([0, 100 * DAY_MS]);
		view.unmount();
	});

	it('without a provider two page runners DO share a group name (the default store): documented, so wrap each one', () => {
		const first = { current: null as SyncedWindow | null };
		const second = { current: null as SyncedWindow | null };
		const view = render(
			<div>
				<Probe group="shared-by-name" extent={[0, 100 * DAY_MS]} out={first} />
				<Probe group="shared-by-name" extent={[0, 100 * DAY_MS]} out={second} />
			</div>,
		);
		act(() => first.current!.setWindow([10 * DAY_MS, 30 * DAY_MS]));
		expect(second.current!.window).toStrictEqual([10 * DAY_MS, 30 * DAY_MS]);
		view.unmount();
	});

	it('without a provider a component gets the module-scope default; each provider scopes its own store; a given store is used as it is', () => {
		const seen: SyncStore[] = [];
		function Reader(): null {
			seen.push(useSyncStore());
			return null;
		}
		const explicit = createSyncStore();
		render(
			<div>
				<Reader />
				<TimeSeriesSyncProvider>
					<Reader />
				</TimeSeriesSyncProvider>
				<TimeSeriesSyncProvider>
					<Reader />
				</TimeSeriesSyncProvider>
				<TimeSeriesSyncProvider store={explicit}>
					<Reader />
				</TimeSeriesSyncProvider>
			</div>,
		);
		const [bare, firstOwn, secondOwn, given] = seen;
		expect(seen).toHaveLength(4);
		expect(bare).toBe(defaultSyncStore);
		expect(firstOwn).not.toBe(defaultSyncStore);
		expect(secondOwn).not.toBe(defaultSyncStore);
		expect(firstOwn).not.toBe(secondOwn);
		expect(given).toBe(explicit);
	});

	it('keeps its store across re-renders of the provider (a window is not lost when the page re-renders)', () => {
		const seen: SyncStore[] = [];
		function Reader(): null {
			seen.push(useSyncStore());
			return null;
		}
		const tree = (label: string) => (
			<TimeSeriesSyncProvider>
				<Reader />
				{label}
			</TimeSeriesSyncProvider>
		);
		const view = render(tree('a'));
		view.rerender(tree('b'));
		expect(new Set(seen).size).toBe(1);
	});
});
