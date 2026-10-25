import React from 'react';

export interface PageSectionProps {
	title: string;
	actions?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
}

/**
 * @registryCategory disposition
 * @registryTags page-section page header title
 */
export function PageSection({ title, actions, children, className = '' }: PageSectionProps) {
	return (
		<div className={['flex flex-col mb-6', className].filter(Boolean).join(' ')}>
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{title}</h2>
				{actions && <div>{actions}</div>}
			</div>
			{children}
		</div>
	);
}
