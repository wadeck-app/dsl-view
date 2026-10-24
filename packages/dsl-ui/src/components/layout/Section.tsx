import React, { useId } from 'react';

export interface SectionProps {
	title?: string;
	/** @slot tag:layout, tag:table, tag:form, tag:display, tag:composite */
	children: React.ReactNode;
}

/**
 * @registryCategory disposition
 * @registryTags content
 */
export function Section({ title, children }: SectionProps) {
	const titleId = useId();
	return (
		// A titled section is a named region for assistive technology; an untitled one stays a plain group.
		<section className="space-y-6" aria-labelledby={title ? titleId : undefined}>
			{title && <h2 id={titleId} className="text-base font-medium text-content">{title}</h2>}
			{children}
		</section>
	);
}
