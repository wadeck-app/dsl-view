import React from 'react';

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
	return (
		<section className="space-y-6">
			{title && <h2 className="text-base font-medium text-content">{title}</h2>}
			{children}
		</section>
	);
}
