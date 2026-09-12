/**
 * Synchronous stub for @floating-ui/react-dom used in Vitest tests.
 *
 * @floating-ui/react-dom's useFloating calls computePosition() (async Promise)
 * and then ReactDOM.flushSync(() => setState(position)) inside .then(), causing
 * React 18's act() to wait for cascading re-renders (~3-9s per test in JSDOM).
 *
 * This stub returns a pre-computed static position synchronously.
 * Positioning is irrelevant in JSDOM (no layout engine).
 */
import * as React from 'react';
import type { UseFloatingOptions, UseFloatingReturn } from '@floating-ui/react-dom';
import type { ReferenceType } from '@floating-ui/react-dom';

export function useFloating(options?: UseFloatingOptions): UseFloatingReturn {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const referenceRef = React.useRef<any>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const floatingRef = React.useRef<any>(null);
	const setReference = React.useCallback((node: ReferenceType | null) => {
		referenceRef.current = node;
	}, []);
	const setFloating = React.useCallback((node: HTMLElement | null) => {
		floatingRef.current = node;
	}, []);
	const strategy = options?.strategy ?? 'fixed';
	const placement = options?.placement ?? 'bottom';
	return {
		x: 0,
		y: 0,
		strategy,
		placement,
		middlewareData: {},
		isPositioned: true,
		floatingStyles: {
			position: strategy,
			top: '0px',
			left: '0px',
			width: 'max-content',
		},
		refs: {
			reference: referenceRef,
			floating: floatingRef,
			setReference,
			setFloating,
		},
		elements: {
			reference: referenceRef.current,
			floating: floatingRef.current,
		},
		update: () => {},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any as UseFloatingReturn;
}

export function autoUpdate(
	_reference: unknown,
	_floating: unknown,
	_update: () => void,
): () => void {
	return () => {};
}

// Re-export everything else from the real package (utilities, middleware, etc.)
export {
	computePosition,
	arrow,
	autoPlacement,
	detectOverflow,
	flip,
	getOverflowAncestors,
	hide,
	inline,
	limitShift,
	offset,
	platform,
	shift,
	size,
} from '@floating-ui/dom';
