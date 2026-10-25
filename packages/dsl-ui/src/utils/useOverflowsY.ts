import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// `scrollHeight` rounds, so a box that fits exactly can report one pixel more than `clientHeight`: ignore that.
const TOLERANCE_PX = 1;

/**
 * True while the element's content is taller than the element (it scrolls vertically). A scroll region has to take
 * keyboard focus to be reachable without a pointer; when nothing scrolls, a tab stop would only be noise, so the
 * caller adds `tabIndex` only while this is true. Re-measured on mount, when `deps` change (rows, expansion) and
 * whenever the element or its content is resized. Without ResizeObserver (jsdom) only the first two apply.
 */
export function useOverflowsY<T extends HTMLElement>(enabled: boolean, deps: ReadonlyArray<unknown>) {
	const ref = useRef<T | null>(null);
	const [overflows, setOverflows] = useState(false);

	useLayoutEffect(() => {
		const el = ref.current;
		setOverflows(enabled && el !== null && el.scrollHeight > el.clientHeight + TOLERANCE_PX);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller's list of what changes the content
	}, [enabled, ...deps]);

	useEffect(() => {
		const el = ref.current;
		if (!enabled || !el || typeof ResizeObserver === 'undefined') {
			return;
		}
		const measure = () => setOverflows(el.scrollHeight > el.clientHeight + TOLERANCE_PX);
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		if (el.firstElementChild) {
			observer.observe(el.firstElementChild);
		}
		return () => observer.disconnect();
	}, [enabled]);

	return { ref, overflows };
}
