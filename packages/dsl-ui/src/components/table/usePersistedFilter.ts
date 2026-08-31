import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useDataTableFilter } from './DataTable.js';

/**
 * Self-seeds a DataTable filter key from a `${tableId}_${filterKey}` URL search param on mount,
 * and returns a setter that keeps ctx + URL in sync - generalizes HideMetaToggle's own
 * useLayoutEffect self-seeding to any table id + filter key + value kind, for any filter
 * component whose own `persist` prop is true.
 */
export function usePersistedFilter(
	tableId: string | undefined,
	filterKey: string,
	currentValue: unknown
): (value: unknown) => void {
	const filterCtx = useDataTableFilter();
	const [params, setParams] = useSearchParams();
	// Mirrors the current value/ctx/params into refs so the mount-only effect below can read
	// their latest values without needing them in its dependency array (same ref pattern
	// HideMetaToggle.tsx already uses for its own mount-time seeding).
	const valueRef = useRef(currentValue);
	valueRef.current = currentValue;
	const filterCtxRef = useRef(filterCtx);
	filterCtxRef.current = filterCtx;
	const paramsRef = useRef(params);
	paramsRef.current = params;

	useLayoutEffect(() => {
		if (!tableId) return;
		const raw = paramsRef.current.get(`${tableId}_${filterKey}`);
		if (raw !== null) {
			const restored = raw.includes(',') ? raw.split(',').filter(Boolean) : raw;
			filterCtxRef.current?.setFilter(filterKey, restored);
		} else {
			filterCtxRef.current?.setFilter(filterKey, valueRef.current);
		}
	}, [tableId, filterKey]);

	return function persist(value: unknown) {
		filterCtx?.setFilter(filterKey, value);
		if (!tableId) return;
		setParams(
			prev => {
				const next = new URLSearchParams(prev);
				const isCleared =
					value === null || value === undefined || value === 'all' || (Array.isArray(value) && value.length === 0);
				if (isCleared) next.delete(`${tableId}_${filterKey}`);
				else next.set(`${tableId}_${filterKey}`, Array.isArray(value) ? value.join(',') : String(value));
				return next;
			},
			{ replace: true }
		);
	};
}
