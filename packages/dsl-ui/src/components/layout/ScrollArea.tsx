import React from 'react';

export interface ScrollAreaProps {
	children: React.ReactNode;
	/**
	 * Which palette the browser paints the scrollbar and any native form chrome with.
	 *
	 * 'auto' (default) inherits the app theme, which is right for a panel drawn from the theme's
	 * own surface tokens.
	 *
	 * 'dark' / 'light' force it, for a panel whose background does NOT follow the theme - a log
	 * tail, a console, a code viewer, a photo backdrop. The scrollbar has to match the surface it
	 * is drawn on, not the theme the rest of the page is using: a light-theme app with a near-black
	 * log pane gets a white scrollbar down the middle of it otherwise.
	 */
	scheme?: 'auto' | 'dark' | 'light';
	/** Scroll axis. Locking the cross axis stops a stray wide child scrolling the whole pane. */
	axis?: 'vertical' | 'horizontal' | 'both';
	className?: string;
}

// @formatter:off
const SCHEME_CLS: Record<NonNullable<ScrollAreaProps['scheme']>, string> = {
	// Nothing to set: `color-scheme` is declared on the theme root and inherits.
	auto:  '',
	dark:  '[color-scheme:dark]',
	light: '[color-scheme:light]',
};

const AXIS_CLS: Record<NonNullable<ScrollAreaProps['axis']>, string> = {
	vertical:   'overflow-y-auto overflow-x-hidden',
	horizontal: 'overflow-x-auto overflow-y-hidden',
	both:       'overflow-auto',
};
// @formatter:on

/**
 * A scrolling region whose scrollbar matches its own surface.
 *
 * `min-h-0` is load-bearing and the reason this is a component rather than two utility classes: a
 * flex child defaults to `min-height: auto`, so it refuses to shrink below its content, never
 * overflows, and never scrolls. Every consumer that hand-rolled `overflow-auto` had to rediscover
 * that, and one shipped a pane that silently could not scroll at all.
 *
 * @registryCategory layout
 * @registryTags scroll overflow pane scrollbar
 */
export function ScrollArea({
	children,
	scheme = 'auto',
	axis = 'vertical',
	className = '',
}: ScrollAreaProps): React.ReactElement {
	return (
		<div className={`min-h-0 ${AXIS_CLS[axis]} ${SCHEME_CLS[scheme]} ${className}`.trim().replace(/\s+/g, ' ')}>
			{children}
		</div>
	);
}
