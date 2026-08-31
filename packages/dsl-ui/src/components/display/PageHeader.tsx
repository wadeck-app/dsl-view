import React from 'react';

export interface PageHeaderProps {
	title: string;
	subtitle?: string;
	/** Lucide icon component to render left of the title (compact mode, text-lg). */
	icon?: React.ComponentType<{ className?: string }>;
	// Actions rendered to the right of the title (e.g. a button). ButtonAction carries
	// tag:action in addition to tag:button - both must be allowed here.
	/** @slot tag:button, tag:action */
	headerActions?: React.ReactNode;
	/** 'sm' = section-level header (text-base font-semibold, no margin). Default = page-level (text-2xl). */
	size?: 'default' | 'sm';
}

/**
 * @registryCategory composite
 * @registryTags header
 */
export function PageHeader({ title, subtitle, icon: Icon, headerActions, size = 'default' }: PageHeaderProps) {
	if (size === 'sm') {
		return <h2 className="text-base font-semibold text-content">{title}</h2>;
	}
	if (Icon) {
		return (
			<div className="mb-3 flex items-center gap-2">
				<Icon className="h-5 w-5 text-muted" aria-hidden="true" />
				<h1 className="text-lg font-semibold text-content">{title}</h1>
				{subtitle && <p className="text-sm text-muted">{subtitle}</p>}
			</div>
		);
	}
	if (headerActions) {
		return (
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-content">{title}</h1>
				<div>{headerActions}</div>
			</div>
		);
	}
	return (
		<>
			<h1 className="mb-2 text-2xl font-semibold text-content">{title}</h1>
			{subtitle && <p className="mb-6 text-sm text-muted">{subtitle}</p>}
		</>
	);
}
