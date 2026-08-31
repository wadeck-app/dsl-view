import React from 'react';

type TailwindGap = 'gap-0' | 'gap-0.5' | 'gap-1' | 'gap-1.5' | 'gap-2' | 'gap-2.5' | 'gap-3' | 'gap-4' | 'gap-5' | 'gap-6' | 'gap-7' | 'gap-8' | 'gap-9' | 'gap-10' | 'gap-12' | 'gap-16';

export interface VerticalStackProps {
	gap?: TailwindGap;
	/** @slot tag:layout, tag:table, tag:form, tag:display, tag:composite, tag:atomic */
	children: React.ReactNode;
}

/**
 * @registryCategory disposition
 * @registryTags layout
 */
export function VerticalStack({ gap = 'gap-4', children }: VerticalStackProps) {
	return <div className={`flex flex-col ${gap}`}>{children}</div>;
}
