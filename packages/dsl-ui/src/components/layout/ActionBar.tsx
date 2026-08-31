import React from 'react';

export interface ActionBarProps {
	/** @slot tag:btn */
	children: React.ReactNode;
}

/**
 * @registryCategory disposition
 * @registryTags action-bar
 */
export function ActionBar({ children }: ActionBarProps) {
	return <div className="mt-8 flex items-center gap-4">{children}</div>;
}
