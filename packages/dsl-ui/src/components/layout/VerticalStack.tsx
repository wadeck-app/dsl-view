import React from 'react';

import { fillClasses, joinClasses } from '@dsl-ui/utils/fillClasses.js';
import { warnUnknownChoice } from '@dsl-ui/utils/warnUnknownChoice.js';

type TailwindGap = 'gap-0' | 'gap-0.5' | 'gap-1' | 'gap-1.5' | 'gap-2' | 'gap-2.5' | 'gap-3' | 'gap-4' | 'gap-5' | 'gap-6' | 'gap-7' | 'gap-8' | 'gap-9' | 'gap-10' | 'gap-12' | 'gap-16';

// @formatter:off
// A record keyed by the prop union, so adding a value to the union without listing it here fails to compile.
const GAP_CHOICES: Record<TailwindGap, true> = {
	'gap-0': true, 'gap-0.5': true, 'gap-1': true, 'gap-1.5': true, 'gap-2': true, 'gap-2.5': true, 'gap-3': true, 'gap-4': true,
	'gap-5': true, 'gap-6': true, 'gap-7': true, 'gap-8': true, 'gap-9': true, 'gap-10': true, 'gap-12': true, 'gap-16': true,
};
// @formatter:on

export interface VerticalStackProps {
	gap?: TailwindGap;
	/**
	 * Takes the height its parent gives it (a dashboard tile) instead of the height of its content, so children that
	 * also `fill` (a Chart, a nested stack, a Card) share the room left. The parent needs a definite height.
	 * @default false
	 */
	fill?: boolean;
	/** @slot tag:layout, tag:table, tag:form, tag:display, tag:composite, tag:atomic */
	children: React.ReactNode;
}

/**
 * @registryCategory disposition
 * @registryTags layout
 */
export function VerticalStack({ gap = 'gap-4', fill = false, children }: VerticalStackProps) {
	warnUnknownChoice('VerticalStack', 'gap', gap, GAP_CHOICES);
	return <div className={joinClasses('flex flex-col', gap, fillClasses(fill))}>{children}</div>;
}
