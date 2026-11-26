import React from 'react';

import { classFor } from '@dsl-ui/utils/warnUnknownChoice.js';

type SideWidth = 'narrow' | 'normal' | 'wide';
type StickyTop = 'top-0' | 'top-4' | 'top-16' | 'top-32';

// @formatter:off
const SIDE_WIDTH_CLASSES: Record<SideWidth, string> = {
	narrow: 'lg:w-64',
	normal: 'lg:w-80',
	wide:   'lg:w-96',
};
// Static strings so Tailwind keeps them.
const STICKY_TOP_CLASSES: Record<StickyTop, string> = {
	'top-0':  'lg:top-0',
	'top-4':  'lg:top-4',
	'top-16': 'lg:top-16',
	'top-32': 'lg:top-32',
};
const GAP_CLASSES = { 'gap-4': 'gap-4', 'gap-6': 'gap-6', 'gap-8': 'gap-8' } as const;
// @formatter:on

export interface SplitLayoutProps {
	/** The primary column: it takes the remaining width. */
	main: React.ReactNode;
	/** The secondary column (facts, properties, actions): a fixed width on wide screens. */
	side: React.ReactNode;
	/** Which side of `main` the secondary column sits on, from the `lg` breakpoint up. Stacked, `main` always comes first. */
	sidePosition?: 'right' | 'left';
	/** Width of the secondary column from the `lg` breakpoint up. */
	sideWidth?: SideWidth;
	/** Keeps the secondary column in view while the main one scrolls (from the `lg` breakpoint up). Default true. */
	sticky?: boolean;
	/** Distance from the top of the viewport where the sticky column stops: set it to the height of the fixed header above the page. Default `top-4`. */
	stickyTop?: StickyTop;
	/** Space between the columns (and between them once stacked). */
	gap?: keyof typeof GAP_CLASSES;
	/** Below the `lg` breakpoint the secondary column comes BEFORE the main one (properties above the document). */
	sideFirstWhenStacked?: boolean;
}

/**
 * Two columns, a main one and a side one, that stack below the `lg` breakpoint (1024 px of viewport): the page-level split of
 * a detail view (content on one side, properties on the other).
 * Not for grids of cards, any other breakpoint or resizable panes.
 *
 * @registryCategory disposition
 * @registryTags layout split sidebar responsive
 */
export function SplitLayout({
	main,
	side,
	sidePosition = 'right',
	sideWidth = 'normal',
	sticky = true,
	stickyTop = 'top-4',
	gap = 'gap-6',
	sideFirstWhenStacked = false,
}: SplitLayoutProps): React.ReactElement {
	const direction = sidePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row';
	const sideClass = [
		'min-w-0 w-full shrink-0',
		classFor('SplitLayout', 'sideWidth', sideWidth, SIDE_WIDTH_CLASSES, 'normal'),
		// self-start: a sticky column stretched to the height of the row would have nothing to slide in.
		sticky ? `lg:sticky ${classFor('SplitLayout', 'stickyTop', stickyTop, STICKY_TOP_CLASSES, 'top-4')} lg:self-start` : '',
		sideFirstWhenStacked ? 'max-lg:order-first' : '',
	]
		.filter(Boolean)
		.join(' ');
	return (
		<div data-testid="split-layout" className={`flex flex-col ${direction} ${classFor('SplitLayout', 'gap', gap, GAP_CLASSES, 'gap-6')}`}>
			<div data-testid="split-layout-main" className="min-w-0 flex-1">
				{main}
			</div>
			<div data-testid="split-layout-side" className={sideClass}>
				{side}
			</div>
		</div>
	);
}
