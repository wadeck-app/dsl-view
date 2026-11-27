import React, { useEffect, useRef, useState } from 'react';

/**
 * How a button that waits for a request shows it. Every style keeps the button the exact size it has at rest: the label is never
 * swapped for a longer or shorter one and nothing is added to the flow.
 *
 * - `spinner`: a small rotating arc before the label (the original look; it widens the button by the arc and its gap).
 * - `sweep`: a soft band of light crosses the button, label untouched.
 * - `dots`: the label gives way to three dots that wave.
 * - `bar`: a thin line slides along the bottom edge, label slightly dimmed.
 * - `pulse`: the button breathes and a ring ripples out of it.
 * - `orbit`: a point of light travels around the border (best on a filled button).
 */
export const LOADING_STYLES = ['spinner', 'sweep', 'dots', 'bar', 'pulse', 'orbit'] as const;
export type LoadingStyle = (typeof LOADING_STYLES)[number];

/** A request shorter than this never shows the animation: an instant action would only flash it. */
export const LOADING_SHOW_DELAY_MS = 150;
/** Once shown, the animation stays at least this long, so it reads as "something happened" and not as a flicker. */
export const LOADING_MIN_VISIBLE_MS = 500;

/**
 * Whether the wait animation is on screen. It follows `loading` with two guards against flicker: it appears only after
 * LOADING_SHOW_DELAY_MS, and once it appeared it stays for LOADING_MIN_VISIBLE_MS. The button is still disabled the whole time `loading`
 * is on: only the animation is smoothed.
 */
export function useVisualLoading(loading: boolean): boolean {
	const [visual, setVisual] = useState(false);
	const shownAt = useRef(0);
	const visualRef = useRef(false);
	visualRef.current = visual;

	useEffect(() => {
		if (loading) {
			const timer = setTimeout(() => {
				shownAt.current = Date.now();
				setVisual(true);
			}, LOADING_SHOW_DELAY_MS);
			return () => clearTimeout(timer);
		}
		if (!visualRef.current) {
			return undefined;
		}
		const remaining = Math.max(0, LOADING_MIN_VISIBLE_MS - (Date.now() - shownAt.current));
		const timer = setTimeout(() => setVisual(false), remaining);
		return () => clearTimeout(timer);
	}, [loading]);

	return visual;
}

/** Classes added to the button itself while a style is on screen. */
export const LOADING_BUTTON_CLASSES: Record<Exclude<LoadingStyle, 'spinner'>, string> = {
	sweep: 'relative overflow-hidden',
	dots: 'relative overflow-hidden',
	bar: 'relative overflow-hidden',
	pulse: 'relative animate-dsl-pulse motion-reduce:animate-none',
	orbit: 'relative overflow-hidden',
};

/** Classes of the wrapper around the label while a style is on screen (the label stays in the flow, above the layer). */
export const LOADING_LABEL_CLASSES: Record<Exclude<LoadingStyle, 'spinner'>, string> = {
	sweep: '',
	dots: 'opacity-0',
	bar: 'opacity-80',
	pulse: 'animate-dsl-breathe motion-reduce:animate-none',
	orbit: '',
};

const DOT_DELAYS = ['0ms', '160ms', '320ms'] as const;

/** The animated layer of a style, absolutely placed over the button: it never takes room in the layout. */
export function LoadingLayer({ style }: { style: Exclude<LoadingStyle, 'spinner'> }): React.ReactElement | null {
	switch (style) {
		case 'sweep':
			return (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 -left-full w-full animate-dsl-sweep motion-reduce:hidden"
					style={{ background: 'linear-gradient(100deg, transparent 20%, color-mix(in srgb, currentColor 38%, transparent) 50%, transparent 80%)' }}
				/>
			);
		case 'dots':
			return (
				<span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1">
					{DOT_DELAYS.map(delay => (
						<span key={delay} className="h-1.5 w-1.5 rounded-full bg-current animate-dsl-dot motion-reduce:animate-none" style={{ animationDelay: delay }} />
					))}
				</span>
			);
		case 'bar':
			return (
				<span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
					<span className="block h-full w-2/5 animate-dsl-bar rounded-full bg-current motion-reduce:hidden" />
				</span>
			);
		case 'orbit':
			return (
				<span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] bg-inherit">
					<span
						className="aspect-square w-[250%] shrink-0 animate-dsl-orbit motion-reduce:animate-none"
						style={{ background: 'conic-gradient(from 0deg, transparent 0 62%, currentColor 100%)' }}
					/>
					<span className="absolute inset-[2px] rounded-[inherit] bg-inherit" />
				</span>
			);
		case 'pulse':
			return null;
	}
}

/** The disabled look (faded or muted fill) of a variant, which a button that is only waiting must not take. */
export function withoutDisabledLook(classes: string): string {
	return classes
		.split(' ')
		.filter(token => !token.startsWith('disabled:opacity') && !token.startsWith('disabled:bg-') && !token.startsWith('disabled:text-') && !token.startsWith('disabled:hover:bg-'))
		.join(' ');
}
