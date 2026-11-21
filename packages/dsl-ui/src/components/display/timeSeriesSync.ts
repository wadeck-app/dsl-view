import { createContext, createElement, useCallback, useContext, useEffect, useId, useState, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { clampWindow, isFullWindow } from './timeSeriesMath.js';
import type { TimeWindow } from './timeSeriesMath.js';

/**
 * Shared time window of the charts of one page: every chart / brush naming the same `syncGroup` shows the same window,
 * so a pan or zoom on one moves all of them. Groups live in a store; without a `TimeSeriesSyncProvider` above, every chart
 * uses the module-scope default store (one loaded bundle = one store), so a page needs no provider. A provider gives its
 * subtree a store of its own: the same group name in two providers does not share a window.
 *
 * Lifetime: a component registers its extent in an effect and unregisters in the cleanup, so a group holds state only while a
 * chart or brush of it is mounted (or someone still listens). React StrictMode's mount / cleanup / mount leaves the same state
 * as a single mount. A provider's store is dropped with the provider.
 */
interface GroupState {
	/** Extent of each registered component; the group extent is their union. */
	extents: Map<string, TimeWindow>;
	extent: TimeWindow | null;
	/** null = the whole extent. */
	window: TimeWindow | null;
	/** `initialWindow` declared by each component (by id), in declaration order: the last one is the effective one. */
	initials: Map<string, TimeWindow>;
	/** Value (key) of the initial window applied last; a component declaring the same value again changes nothing. */
	applied: string | null;
}

export interface GroupSnapshot {
	extent: TimeWindow | null;
	window: TimeWindow | null;
}

export interface SyncStore {
	/** A component announces its data extent. A changed group extent (a new period) resets the window to the whole extent. */
	setExtent: (group: string, id: string, extent: TimeWindow | null) => void;
	/**
	 * A component declares the window its group starts with (null = withdraws its declaration). Applied once per VALUE (compared by the
	 * two numbers): a second component declaring the same value, or a re-render, never resets what the user did since. A changed value is
	 * applied again; the last withdrawal puts the window back on the whole extent. A change of the group extent applies the effective
	 * initial window instead of resetting to the whole extent.
	 */
	setInitialWindow: (group: string, id: string, win: TimeWindow | null) => void;
	/** Sets the shared window (clamped to the extent); a window covering the whole extent is stored as null. */
	setWindow: (group: string, win: TimeWindow | null) => void;
	getSnapshot: (group: string) => GroupSnapshot;
	subscribe: (group: string, fn: () => void) => () => void;
	/** Number of groups the store still holds state for (tests and diagnostics). */
	groupCount: () => number;
}

const EMPTY: GroupSnapshot = { extent: null, window: null };

function union(extents: Iterable<TimeWindow>): TimeWindow | null {
	let out: [number, number] | null = null;
	for (const e of extents) {
		out = out ? [Math.min(out[0], e[0]), Math.max(out[1], e[1])] : [e[0], e[1]];
	}
	return out;
}

/** A new, empty store: its groups are independent of every other store. */
export function createSyncStore(): SyncStore {
	const groups = new Map<string, GroupState>();
	const listeners = new Map<string, Set<() => void>>();
	const snapshots = new Map<string, GroupSnapshot>();

	const state = (group: string): GroupState => {
		let s = groups.get(group);
		if (!s) {
			s = { extents: new Map(), extent: null, window: null, initials: new Map(), applied: null };
			groups.set(group, s);
		}
		return s;
	};

	const publish = (group: string): void => {
		const s = state(group);
		snapshots.set(group, { extent: s.extent, window: s.window });
		listeners.get(group)?.forEach(fn => fn());
	};

	/** The initial window to show now: the effective declaration clamped to the extent; null = the whole extent. */
	const initialFor = (s: GroupState): TimeWindow | null => {
		const last = [...s.initials.values()].pop();
		if (!last || !s.extent) {
			return null;
		}
		const clamped = clampWindow(last, s.extent);
		return isFullWindow(clamped, s.extent) ? null : clamped;
	};

	// Nothing registered and nobody listening: forget the group, a store must not keep state of unmounted pages.
	const forgetIfUnused = (group: string): void => {
		const s = groups.get(group);
		if (s && s.extents.size === 0 && s.initials.size === 0 && (listeners.get(group)?.size ?? 0) === 0) {
			groups.delete(group);
			snapshots.delete(group);
			listeners.delete(group);
		}
	};

	return {
		setExtent(group, id, extent) {
			const s = state(group);
			if (extent) {
				s.extents.set(id, extent);
			} else {
				s.extents.delete(id);
			}
			const next = union(s.extents.values());
			const changed = !s.extent || !next || s.extent[0] !== next[0] || s.extent[1] !== next[1];
			s.extent = next;
			if (changed) {
				s.window = initialFor(s);
				publish(group);
			}
			forgetIfUnused(group);
		},
		setInitialWindow(group, id, win) {
			const s = state(group);
			if (win === null) {
				s.initials.delete(id);
				if (s.initials.size === 0 && s.applied !== null) {
					s.applied = null;
					s.window = null;
					publish(group);
				}
			} else {
				s.initials.delete(id);
				s.initials.set(id, win);
				const key = `${win[0]}:${win[1]}`;
				if (key !== s.applied) {
					s.applied = key;
					s.window = initialFor(s);
					publish(group);
				}
			}
			forgetIfUnused(group);
		},
		groupCount: () => groups.size,
		setWindow(group, win) {
			const s = state(group);
			if (!s.extent || win === null) {
				s.window = null;
			} else {
				const clamped = clampWindow(win, s.extent);
				s.window = isFullWindow(clamped, s.extent) ? null : clamped;
			}
			publish(group);
			forgetIfUnused(group);
		},
		getSnapshot: group => snapshots.get(group) ?? EMPTY,
		subscribe(group, fn) {
			let set = listeners.get(group);
			if (!set) {
				set = new Set();
				listeners.set(group, set);
			}
			const mine = set;
			mine.add(fn);
			return () => {
				mine.delete(fn);
				// A component unmounts its extent effect before its subscription: the last one out tidies the group.
				forgetIfUnused(group);
			};
		},
	};
}

/** The store used when no `TimeSeriesSyncProvider` is above (one per loaded bundle). Exported for tests and diagnostics. */
export const defaultSyncStore: SyncStore = createSyncStore();

const SyncContext = createContext<SyncStore>(defaultSyncStore);

/** The store of the nearest `TimeSeriesSyncProvider`, else the module-scope default. */
export function useSyncStore(): SyncStore {
	return useContext(SyncContext);
}

/**
 * Isolates the sync groups of its subtree: charts and brushes below share windows only with each other, whatever the group
 * names elsewhere. Optional: without it all charts of the bundle share the default store. Wrap each page runner of a page that
 * shows several in one. Pass `store` to own its lifetime (e.g. to read it from outside); by default one store is created per
 * mounted provider.
 */
export function TimeSeriesSyncProvider({ children, store }: { children?: ReactNode; store?: SyncStore }): ReactElement {
	const [own] = useState(createSyncStore);
	return createElement(SyncContext.Provider, { value: store ?? own }, children);
}

export interface SyncedWindow {
	/** The window to draw: the shared one, else the whole extent. */
	window: TimeWindow | null;
	extent: TimeWindow | null;
	setWindow: (w: TimeWindow | null) => void;
}

/**
 * Shared window of a group; registers this component's own `extent` under a stable id. `initialWindow` (already validated, null or
 * absent = none) is the window the group starts with and takes again when its value changes; see `SyncStore.setInitialWindow`.
 */
export function useSyncWindow(group: string, extent: TimeWindow | null, initialWindow?: TimeWindow | null): SyncedWindow {
	const store = useSyncStore();
	const id = useId();
	const from = extent?.[0];
	const to = extent?.[1];
	const initFrom = initialWindow?.[0];
	const initTo = initialWindow?.[1];
	useEffect(() => {
		store.setExtent(group, id, from === undefined || to === undefined ? null : [from, to]);
		return () => store.setExtent(group, id, null);
	}, [store, group, id, from, to]);
	// After the extent effect: the extent is known when the window is applied.
	useEffect(() => {
		store.setInitialWindow(group, id, initFrom === undefined || initTo === undefined ? null : [initFrom, initTo]);
		return () => store.setInitialWindow(group, id, null);
	}, [store, group, id, initFrom, initTo]);
	const snap = useSyncExternalStore(
		useCallback(fn => store.subscribe(group, fn), [store, group]),
		() => store.getSnapshot(group),
		() => EMPTY,
	);
	const set = useCallback((w: TimeWindow | null) => store.setWindow(group, w), [store, group]);
	// Before the effect has run (first render) the group has no extent yet: use the component's own.
	const effectiveExtent = snap.extent ?? extent;
	// Same for the initial window: the first frame already draws it instead of flashing the whole extent.
	const firstFrame = snap.extent === null && effectiveExtent !== null && initialWindow ? clampWindow(initialWindow, effectiveExtent) : null;
	return { window: snap.window ?? firstFrame ?? effectiveExtent, extent: effectiveExtent, setWindow: set };
}
