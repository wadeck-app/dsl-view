/**
 * Lightweight stub for @radix-ui/react-popper used in Vitest tests.
 *
 * The real react-popper uses @floating-ui/react-dom's useFloating which calls
 * computePosition() (async) then ReactDOM.flushSync(setState), causing React's
 * act() to wait for cascading re-renders (~1-9s per test in JSDOM).
 *
 * This stub replaces the positioning layer with simple pass-through components.
 * Actual positioning is irrelevant in JSDOM (no layout engine).
 */
import * as React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Root: React.FC<{ children?: React.ReactNode; [key: string]: any }> = ({ children }) => {
	return React.createElement(React.Fragment, null, children);
};
Root.displayName = 'PopperRoot';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Anchor: React.FC<{ children?: React.ReactNode; asChild?: boolean; [key: string]: any }> = ({ children, asChild, ...props }) => {
	if (asChild && React.isValidElement(children)) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return React.cloneElement(children as React.ReactElement<any>, props);
	}
	return React.createElement('div', props, children);
};
Anchor.displayName = 'PopperAnchor';

export const Content: React.FC<{
	children?: React.ReactNode;
	side?: string;
	align?: string;
	sideOffset?: number;
	alignOffset?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}> = ({ children, side: _side, align: _align, sideOffset: _so, alignOffset: _ao,
	collisionBoundary: _cb, collisionPadding: _cp, arrowPadding: _ap, sticky: _st,
	hideWhenDetached: _hwd, avoidCollisions: _ac, updatePositionStrategy: _ups,
	onPlaced: _op, ...props }) => {
	return React.createElement('div', {
		'data-radix-popper-content-wrapper': '',
		...props,
	}, children);
};
Content.displayName = 'PopperContent';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Arrow: React.FC<{ [key: string]: any }> = (props) => {
	return React.createElement('span', props);
};
Arrow.displayName = 'PopperArrow';

// Context/scope creation utilities (no-ops for tests)
export function createPopperScope() {
	return () => ({});
}
