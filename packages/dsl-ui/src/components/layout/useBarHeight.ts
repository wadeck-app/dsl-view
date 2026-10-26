import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createBarHeightMotion, type BarHeightMotion } from './barHeightMotion.js';
import { APP_SHELL_BAR_HEIGHT, APP_SHELL_BAR_HEIGHT_VAR } from './shellMenuWidth.js';

// Heights are `Nrem` or `0px`: parseFloat reads both. Anything else is a bug in the caller's constants, not a user input.
const toRem = (length: string): number => parseFloat(length);
const toLength = (rem: number): string => (rem === 0 ? '0px' : `${rem}rem`);
const FULL_REM = toRem(APP_SHELL_BAR_HEIGHT);

const prefersReducedMotion = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface BarHeight {
	/** On the shell's root element: receives the variable, frame by frame. */
	shellRef: RefObject<HTMLDivElement | null>;
	/** On the top bar: receives the slide-away transform (`slide`), frame by frame. */
	headerRef: RefObject<HTMLElement | null>;
	/** The value for the first render (constant for the life of the component: React never overwrites the frames). */
	initial: string;
}

/**
 * Owns `--app-shell-bar-height`: sets it to `target` (a length such as `1.5rem`), animated unless the user prefers
 * reduced motion, and writes every frame to the document root AND the shell's root together, so that everything that
 * reads the variable (menu, dock, sticky bars of the host, the bar's own height) moves as one. With `slide` the top bar
 * is also moved up by the part of its height that was given up, on the same frames (the `hide` mode).
 * The caller declares `initial` in the first render and never the changing value: React must not write it back.
 */
export function useBarHeight(target: string, slide: boolean): BarHeight {
	const shellRef = useRef<HTMLDivElement>(null);
	const headerRef = useRef<HTMLElement>(null);
	const [initial] = useState(target);
	const slideRef = useRef(slide);
	slideRef.current = slide;
	const motionRef = useRef<BarHeightMotion | null>(null);
	if (motionRef.current === null) {
		motionRef.current = createBarHeightMotion(toRem(target), (rem) => {
			const length = toLength(rem);
			document.documentElement.style.setProperty(APP_SHELL_BAR_HEIGHT_VAR, length);
			shellRef.current?.style.setProperty(APP_SHELL_BAR_HEIGHT_VAR, length);
			if (headerRef.current && slideRef.current) {
				// Shown: no transform at all. Sliding: the share of the bar that is above the window.
				headerRef.current.style.transform = rem >= FULL_REM ? '' : `translateY(${-(1 - rem / FULL_REM) * 100}%)`;
			}
		});
	}
	const motion = motionRef.current;

	// Publish the current value on mount, before the first paint (the document root has it as early as the shell does).
	useLayoutEffect(() => {
		document.documentElement.style.setProperty(APP_SHELL_BAR_HEIGHT_VAR, toLength(motion.value));
		return () => motion.stop();
	}, [motion]);

	useEffect(() => {
		motion.go(toRem(target), !prefersReducedMotion());
	}, [motion, target]);

	return { shellRef, headerRef, initial };
}
