import React, { useId } from 'react';

import { fillClasses, joinClasses } from '@dsl-ui/utils/fillClasses.js';

export interface SectionProps {
	title?: string;
	/**
	 * Takes the height its parent gives it (a dashboard tile) instead of the height of its content; children that also
	 * `fill` share the room left under the title. The parent needs a definite height.
	 * @default false
	 */
	fill?: boolean;
	/** @slot tag:layout, tag:table, tag:form, tag:display, tag:composite */
	children: React.ReactNode;
}

/**
 * @registryCategory disposition
 * @registryTags content
 */
export function Section({ title, fill: fillProp = false, children }: SectionProps) {
	const titleId = useId();
	// Only the boolean true switches it on: a YAML string like "yes" must not half-apply the layout.
	const fill = fillProp === true;
	return (
		// A titled section is a named region for assistive technology; an untitled one stays a plain group.
		<section className={joinClasses('space-y-6', fill && 'flex flex-col', fillClasses(fill))} aria-labelledby={title ? titleId : undefined}>
			{title && <h2 id={titleId} className="text-base font-medium text-content">{title}</h2>}
			{children}
		</section>
	);
}
