import React from 'react';

type TailwindGap = 'gap-0' | 'gap-0.5' | 'gap-1' | 'gap-1.5' | 'gap-2' | 'gap-2.5' | 'gap-3' | 'gap-4' | 'gap-5' | 'gap-6' | 'gap-7' | 'gap-8' | 'gap-9' | 'gap-10' | 'gap-12' | 'gap-16';
type TailwindAlign = 'items-start' | 'items-center' | 'items-end' | 'items-stretch' | 'items-baseline';
type TailwindJustify = 'justify-start' | 'justify-center' | 'justify-end' | 'justify-between' | 'justify-around' | 'justify-evenly';

export type HorizontalStackItemSize = 'fixed' | 'flex';

// @formatter:off
const ITEM_SIZE_CLASSES: Record<HorizontalStackItemSize, string> = {
	fixed: 'w-80 shrink-0',
	flex: 'flex-1 min-w-0',
};
// @formatter:on

export interface HorizontalStackProps {
	gap?: TailwindGap;
	align?: TailwindAlign;
	justify?: TailwindJustify;
	/** @slot tag:layout, tag:table, tag:form, tag:display, tag:composite, tag:atomic */
	children: React.ReactNode;
	/**
	 * Per-child sizing, parallel array to `children` (same length/order).
	 * Entries are `undefined` for children that don't opt into sizing (render unwrapped, as today).
	 */
	itemSizes?: (HorizontalStackItemSize | undefined)[];
}

/**
 * @registryCategory disposition
 * @registryTags layout
 *
 * IN SCOPE: horizontal flex container with configurable gap, alignment, and justification.
 * OUT OF SCOPE: business-specific layouts - use PageHeader.headerActions for header+button patterns.
 */
export function HorizontalStack({ gap = 'gap-3', align = 'items-center', justify, children, itemSizes }: HorizontalStackProps) {
	const containerClass = ['flex', gap, align, justify].filter(Boolean).join(' ');
	if (!itemSizes || itemSizes.every(size => !size)) {
		return <div className={containerClass}>{children}</div>;
	}
	const items = React.Children.toArray(children);
	return (
		<div className={containerClass}>
			{items.map((child, i) => {
				const size = itemSizes[i];
				return size ? <div key={i} className={ITEM_SIZE_CLASSES[size]}>{child}</div> : child;
			})}
		</div>
	);
}
